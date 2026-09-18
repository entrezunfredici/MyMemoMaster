const aiExerciseDegradedModeService = require('../services/AiExerciseDegradedMode.service')
const aiExerciseImportValidationService = require('../services/AiExerciseImportValidation.service')
const logger = require('../helpers/logger')

// Périmètre C-02.06 (« Interface génération exercices », front-end) : referme la chaîne backend déjà
// livrée en pur service (C-02.03 Service génération, C-02.04 Validation format — via
// AiExerciseGeneration.service.js#validatePayload, appelé en interne — et C-02.05 Mode dégradé) en
// une route HTTP minimale, nécessaire pour que l'Interface génération exercices (front) ait quelque
// chose à appeler. Aucun ticket antérieur de C-02 ne nommait explicitement cette route — voir
// DECISIONS.md pour la justification de ce choix de scope.
//
// Import PDF (demandé par l'utilisateur après C-02.07) : cette route accepte désormais soit
// `sourceText` (JSON ou champ multipart), soit un fichier PDF (`multipart/form-data`, champ `pdf`,
// posé par `middlewares/aiPdfUpload.middleware.js` en amont dans la route) — mutuellement exclusifs,
// et le contrôle des magic bytes (OWASP A08-M2) sont tous deux faits dans
// validators/AiExerciseGeneration.validators.js (pas ici : CLAUDE.md « les controllers ne font que
// try/catch + appel service + réponse HTTP », toute validation d'entrée passe par le validateur).
// TODO: AiGenerationBatch.controller.js#generate (C-01) fait encore ce contrôle magic bytes dans son
// controller — écart pré-existant, hors périmètre de ce ticket (C-02.09 Revue de code & merge).
//
// CHOIX : toujours répondre 200 avec le contrat discriminé de `attemptGenerationFromContent`
// (`{ success, ... }`), y compris sur un échec dégradé (LLM indisponible/rate limit/sortie non
// exploitable) — jamais un statusCode d'erreur pour ces cas-là.
// RAISON : `AiExerciseDegradedMode.service.js` (C-02.05) a précisément été conçu pour qu'aucun
// appelant n'ait à distinguer un succès d'un échec par un bloc try/catch — le front lit `success`/
// `degraded`/`suggestManualCreation` dans un corps de réponse toujours exploitable. Seule une entrée
// utilisateur invalide reste un vrai 400 HTTP (cas normalement déjà intercepté par
// `validators/AiExerciseGeneration.validators.js` + `validate.middleware.js` en amont de ce
// controller — ce controller ne le revoit qu'en filet de sécurité, cf. `describeFailure` C-02.05).
exports.generate = async (req, res) => {
  try {
    const pdfBuffer = req.file ? req.file.buffer : null
    const { subjectContext = null, questionType = 'mixed', outputLanguage = 'fr' } = req.body
    const questionCount = Number(req.body.questionCount)

    const result = await aiExerciseDegradedModeService.attemptGenerationFromContent({
      sourceText: pdfBuffer ? null : req.body.sourceText,
      pdfBuffer,
      subjectContext,
      questionCount,
      questionType,
      outputLanguage,
      // Ticket B (« images sur les questions ») : préfixe de la clé S3 d'une éventuelle image de schéma
      // attachée par le pipeline (AiExerciseGenerationPipeline.service.js#uploadGeneratedImage) — même
      // convention que middlewares/upload.middleware.js (uploads/<userId>/...).
      userId: req.user.id
    })

    if (!result.success && result.code === 'invalid_input') {
      return res.status(400).json({ message: result.message })
    }

    // 422 : contenu source résolu mais vide/inexploitable — cf. AiExerciseDegradedMode.service.js#describeFailure,
    // conforme au contrat déjà documenté dans le swagger de cette route.
    if (!result.success && result.code === 'invalid_content') {
      return res.status(422).json({ message: result.message })
    }

    res.status(200).json(result)
  } catch (error) {
    // Ne devrait jamais se produire — `attemptGenerationFromContent` catch déjà toute erreur du
    // pipeline — mais un filet générique reste nécessaire (ex. bug dans ce controller lui-même).
    logger.error(`[AiExerciseGeneration] Erreur inattendue dans le controller : ${error?.message || error}`)
    res.status(500).json({ message: 'Erreur lors de la génération des questions.' })
  }
}

// Ajout C-02.09 (revue de code) : AiExerciseImportValidation.service.js (C-02.04, « Validation
// format sortie avant import ») n'était appelé nulle part — ni ce controller, ni le front — donc une
// question éditée en Interface de révision (accept/edit/reject) qui redevenait invalide au format
// (ex. mcq sans option marquée correcte) était persistée sans aucun contrôle serveur, exactement le
// cas que ce service existe pour bloquer. Nouvel endpoint dédié plutôt que d'étendre
// validators/Question.validators.js : POST /tests + POST /questions restent « existants, inchangés »
// (choix déjà posé ci-dessus pour `generate`) — ce contrôle de forme ne s'applique donc qu'au flux
// Génération IA, pas à la création manuelle (hors périmètre C-02). Voir DECISIONS.md.
exports.validateImport = (req, res) => {
  try {
    const { importable, rejected } = aiExerciseImportValidationService.validateBatchForImport(req.body.questions)
    res.status(200).json({ importable, rejected })
  } catch (error) {
    logger.error(`[AiExerciseGeneration] Erreur inattendue dans validateImport : ${error?.message || error}`)
    res.status(500).json({ message: 'Erreur lors de la validation des questions.' })
  }
}
