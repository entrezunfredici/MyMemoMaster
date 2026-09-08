const aiExerciseDegradedModeService = require('../services/AiExerciseDegradedMode.service')
const { bufferMatchesMime } = require('../helpers/fileSignature')
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
// posé par `middlewares/aiPdfUpload.middleware.js` en amont dans la route) — mutuellement exclusifs
// (validators/AiExerciseGeneration.validators.js). Le contrôle des magic bytes (OWASP A08-M2) est
// fait ici, comme AiGenerationBatch.controller.js#generate (C-01) le fait déjà pour les cartes —
// memoryStorage() n'a pas d'équivalent "contentType" pour intercepter le flux avant ce point.
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
    let pdfBuffer = null
    if (req.file) {
      if (!bufferMatchesMime(req.file.buffer, 'application/pdf')) {
        return res.status(400).json({ message: "Le fichier envoyé n'est pas un PDF valide." })
      }
      pdfBuffer = req.file.buffer
    }

    const { subjectContext = null, questionType = 'mixed', outputLanguage = 'fr' } = req.body
    const questionCount = Number(req.body.questionCount)

    const result = await aiExerciseDegradedModeService.attemptGenerationFromContent({
      sourceText: pdfBuffer ? null : req.body.sourceText,
      pdfBuffer,
      subjectContext,
      questionCount,
      questionType,
      outputLanguage
    })

    if (!result.success && result.code === 'invalid_input') {
      return res.status(400).json({ message: result.message })
    }

    res.status(200).json(result)
  } catch (error) {
    // Ne devrait jamais se produire — `attemptGenerationFromContent` catch déjà toute erreur du
    // pipeline — mais un filet générique reste nécessaire (ex. bug dans ce controller lui-même).
    logger.error(`[AiExerciseGeneration] Erreur inattendue dans le controller : ${error?.message || error}`)
    res.status(500).json({ message: 'Erreur lors de la génération des questions.' })
  }
}
