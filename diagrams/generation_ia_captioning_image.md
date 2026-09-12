# Documentation — Captioning image (interprétation visuelle des schémas) : Génération de Leitner par IA

> Document d'analyse pur, **aucune ligne de code livrée**. Demande directe de l'utilisateur, hors ticket du
> feature list `C-01`/`C-02` (pas de numéro Odoo associé) — étend `services/PdfExtraction.service.js` (C-01.05),
> qui **détecte** déjà la présence d'images/schémas dans un PDF (`hasEmbeddedImages`) mais ne les **décrit**
> jamais (voir `DECISIONS.md`, 2026-09-01, C-01.05 : « une vraie compréhension du contenu d'un schéma
> nécessiterait un appel supplémentaire à un modèle multimodal, non spécifié par aucun ticket `C-01` à ce
> jour » — proposé à l'époque comme extension future, construit ici).
> Périmètre strict : le **prompt de captioning**, le **format de récupération des images**, le **format
> d'insertion du résultat dans le pipeline existant**, et l'**impact sur les quotas** (C-01.06). Le prompt de
> génération de cartes lui-même (`generation_ia_prompt_cartes.md`, C-01.01) n'est pas modifié.
> Deux choix d'architecture ont été tranchés par l'utilisateur avant ce document (voir `DECISIONS.md`,
> 2026-09-09) : récupération des images via un appel OCR Mistral dédié (pas de décodage d'image maison via
> pdfjs-dist), et un plafond dédié au nombre d'images captionnées par génération dès cette version.

---

## 1. Vue d'ensemble

Cette extension s'insère entre l'extraction PDF (C-01.05) et le chunking, sans toucher au prompt de génération
de cartes (C-01.01) ni au contrat qu'il expose :

```
[PdfExtraction]         [CE DOCUMENT]              [CE DOCUMENT]           [Existant, inchangé]
 pdfjs-dist (texte  →   Récupération des    →      Captioning       →      Texte enrichi
 gratuit) détecte       images (OCR Mistral        (prompt vision,         → chunkText (C-01.05)
 hasEmbeddedImages      dédié, uniquement si       ce document)            → prompt cartes (C-01.01)
                        hasEmbeddedImages)                                 → prompt exercices (C-02.01)
```

**Décision structurante** (répond à la préoccupation notée en C-01.05 : « `sourceExcerpt` suppose un extrait
de texte ») : la description générée n'est **pas** un nouveau champ du contrat de sortie. Elle est fusionnée
comme un paragraphe de texte ordinaire dans le contenu source, **avant** le chunking — le pipeline en aval
(chunking, prompt cartes, prompt exercices, `sourceExcerpt`) ne voit aucune différence entre un paragraphe issu
du texte du PDF et un paragraphe issu d'un captioning d'image. Aucune extension de schéma n'est donc nécessaire
sur C-01.01 ou C-02.01 — voir §5 pour le format exact et pourquoi il reste transparent pour l'utilisateur.

---

## 2. Récupération des images (interface avec C-01.05)

Décision utilisateur (2026-09-09) : un appel dédié à l'API OCR de Mistral (`POST /v1/ocr`, même endpoint que
le repli déjà utilisé en C-01.05) récupère les images, **uniquement pour leurs `pages[].images[]`** (base64) —
pas pour son texte, qui reste celui de `pdfjs-dist` quand ce dernier a réussi (aucun doublon de coût sur le
texte lui-même).

**Déclenchement** : uniquement si `hasEmbeddedImages === true` (peu importe le chemin qui l'a détecté,
`pdfjs-dist` ou l'OCR déjà en repli). Jamais sur un texte collé (`hasEmbeddedImages` toujours `false` dans ce
cas, C-01.05 §resolveSourceText).

**Écart de coût assumé par rapport à C-01.05** : jusqu'ici l'OCR n'était appelé que sur un PDF scanné (aucun
texte extractible). Cette extension l'appelle en plus sur **tout PDF numérique contenant au moins une image**
— bandeau décoratif compris (cas réel déjà rencontré et vérifié en C-01.05 : `2009_Karpicke_Butler_Roediger.pdf`
contient une image de bandeau, sans valeur pédagogique). Le filtrage §4 (`isPedagogicalContent`) absorbe ce
coût élargi en évitant de transformer une image décorative en caption inutile, mais **n'évite pas l'appel OCR
lui-même** (nécessaire pour voir l'image et juger si elle est pédagogique) — point de dette explicite, voir
§10.

---

## 3. Contrat d'entrée du prompt de captioning

| Paramètre | Type | Requis | Description |
|---|---|---|---|
| `imageBase64` | string | oui | Image brute telle que renvoyée par `pages[].images[]` de l'OCR Mistral (§2). |
| `pageContext` | string \| null | non | Texte de la page où l'image a été détectée (déjà extrait par `pdfjs-dist` ou l'OCR) — aide à désambiguïser un schéma dont la légende figure dans le texte autour, pas dans l'image elle-même. |
| `subjectContext` | string \| null | non | Même paramètre qu'en C-01.01 §2 — vocabulaire de la matière. |
| `outputLanguage` | string | non (défaut `"fr"`) | Même paramètre qu'en C-01.01 §2. |

---

## 4. Prompt

### 4.1 Prompt système

```
Tu analyses une image extraite d'un document pédagogique pour des étudiants post-bac, dans l'application
MyMemoMaster. Ton rôle est de décrire factuellement ce que montre l'image, pour qu'un second modèle puisse
ensuite en tirer des cartes de révision.

RÈGLES STRICTES :
1. Décris UNIQUEMENT ce qui est visible dans l'image (et, si fourni, ce que le texte de la page environnante
   dit explicitement à son sujet). N'invente jamais une légende, une valeur ou un détail que tu ne peux pas
   lire ou déduire directement.
2. Si l'image n'a AUCUNE valeur pédagogique (logo, bandeau décoratif, photo d'illustration sans contenu
   informatif, filigrane...), indique-le via "isPedagogicalContent": false et laisse "caption" à null — ne
   décris pas une image décorative comme si elle portait un contenu de cours.
3. Si l'image porte un contenu pédagogique (schéma, graphique, diagramme, formule illustrée, tableau...),
   décris-la en {{outputLanguage}}, de façon factuelle et concise (recommandé ≤ 500 caractères), dans un
   registre neutre, sans jugement de valeur, sans contenu sensible ou hors sujet.
4. Réponds UNIQUEMENT avec un objet JSON conforme au schéma fourni. Aucun texte avant ou après le JSON.
```

### 4.2 Prompt utilisateur (template)

```
Voici une image extraite d'un document pédagogique{{#if subjectContext}} (matière : {{subjectContext}}){{/if}}.
{{#if pageContext}}
Texte de la page où apparaît cette image (peut contenir sa légende) :
"""
{{pageContext}}
"""
{{/if}}

Analyse cette image en respectant strictement les règles du prompt système et le schéma JSON suivant :

{{JSON_SCHEMA}}
```

L'image elle-même est transmise via le format multimodal de l'API Mistral (`content` en tableau, un bloc
`{ "type": "image_url", "image_url": "data:image/jpeg;base64,..." }` aux côtés du bloc texte — **`image_url`
est une chaîne, pas un objet imbriqué `{ url }`** comme chez d'autres fournisseurs ; confirmé via
`docs.mistral.ai/capabilities/vision` (revue documentaire 2026-09-09), à revérifier au premier appel réel
comme tout format d'API dans ce projet).

---

## 5. Contrat de sortie du prompt

```json
{
  "isPedagogicalContent": true,
  "caption": "Schéma en coupe d'une chloroplaste, légendant la membrane externe, la membrane interne, le stroma et les thylakoïdes empilés en grana.",
  "warning": null
}
```

| Champ | Règle |
|---|---|
| `isPedagogicalContent` | `true`/`false`. Filtre les images décoratives (§4.1 règle 2) — garde-fou principal de cette extension. |
| `caption` | `null` si `isPedagogicalContent: false`. Sinon, description factuelle en `outputLanguage`. |
| `warning` | `null` sauf cas particulier (ex. image illisible/corrompue reçue de l'OCR) — même sémantique que C-01.01 §4. |

### 5.1 Format d'insertion dans le texte source (avant chunking)

Une caption retenue (`isPedagogicalContent: true`) est ajoutée comme **paragraphe séparé** (double saut de
ligne, cohérent avec `splitIntoParagraphs` de `helpers/textChunker.js`), à la suite du texte de la page où
l'image a été détectée — avant l'assemblage final du texte et son découpage en chunks :

```
[Schéma détecté sur cette page — description générée automatiquement par IA, non garantie exacte : Schéma en
coupe d'une chloroplaste, légendant la membrane externe, la membrane interne, le stroma et les thylakoïdes
empilés en grana.]
```

Ce marqueur explicite (`[Schéma détecté... généré automatiquement par IA, non garantie exacte : ...]`) est
volontairement lisible tel quel : si une carte cite ce paragraphe dans `sourceExcerpt` (C-01.01 §4), l'écran de
validation affiche cette mention **sans aucun changement de code côté écran de validation** — la transparence
déjà appliquée à `hasEmbeddedImages` (C-01.05, « ce contenu contient des images/schémas qui ne sont pas
analysés ») est ici automatiquement prolongée au niveau de la carte individuelle, par construction plutôt que
par un nouveau champ.

**Placement par page, pas par position exacte** : l'image est rattachée à la page entière où `pdfjs-dist`/l'OCR
l'a détectée, pas à un endroit précis dans le texte de cette page (le point de captage ne connaît pas la
position relative de l'image au sein du texte extrait) — approximation jugée suffisante, cohérente avec la
granularité déjà grossière du chunking existant (par paragraphe, pas par position pixel).

---

## 6. Garde-fous

### 6.1 Anti-hallucination

Identique en esprit à C-01.01 §5.1 : le prompt système interdit d'inventer un détail non visible/non déductible
du `pageContext`. Aucune vérifiabilité automatique supplémentaire n'est possible ici (contrairement à
`sourceExcerpt` sur du texte, il n'existe pas d'« extrait exact » d'une image) — la mention explicite « généré
automatiquement, non garantie exacte » (§5.1) est le seul garde-fou de transparence disponible pour ce cas.

### 6.2 Filtrage des images décoratives

Garde-fou distinctif de ce document (§4.1 règle 2, §5 `isPedagogicalContent`) : sans lui, chaque logo/bandeau
détecté produirait une caption inutile insérée dans le texte source, avec un double risque — bruit pour le
modèle de génération de cartes (une carte pourrait porter sur un logo) et coût gaspillé sur du contenu sans
valeur. Fondé sur un cas réel déjà vérifié (C-01.05 : image de bandeau dans
`2009_Karpicke_Butler_Roediger.pdf`).

### 6.3 Plafond dédié par génération

Décision utilisateur (2026-09-09) : une nouvelle constante technique `MAX_CAPTIONED_IMAGES_PER_GENERATION`
(même famille que `MAX_CHUNKS`/`MAX_CARD_COUNT` déjà dans `AiCardGenerationPipeline.service.js`, C-01.05/04),
appliquée **avant** tout appel de captioning — protège une génération individuelle d'un PDF très illustré
(dizaines de schémas) plutôt que de laisser son coût dépendre uniquement du nombre d'images réellement présent.
Les images au-delà du plafond sont ignorées, avec un warning explicite (même pattern que la troncature
`MAX_CHUNKS`, C-01.05) — pas une erreur bloquante.

### 6.4 Neutralité et longueur

Mêmes règles que C-01.01 §5.4 (contenu neutre, filtré silencieusement si sensible/hors sujet) et une borne de
longueur indicative sur `caption` (≤ 500 caractères recommandé, pas de limite technique dure) — une caption
disproportionnée fausserait le budget de chunking d'un chunk par ailleurs court.

---

## 7. Gestion des erreurs et cas limites

| Cas | Comportement attendu |
|---|---|
| L'appel OCR dédié à la récupération des images (§2) échoue (réseau, config) alors que le texte a déjà été obtenu par `pdfjs-dist` | Dégradation en warning (« les schémas de ce contenu n'ont pas pu être analysés ») — **ne fait jamais échouer la génération**, le texte reste exploitable seul. Politique identique au warning `hasEmbeddedImages` déjà en place (C-01.05). |
| Le captioning d'une image individuelle échoue (modèle vision indisponible, timeout, sortie non conforme après retry) | Cette image est ignorée (pas de paragraphe ajouté), warning par image en échec — les autres images captionnées avec succès sont conservées. Pas d'échec global, cohérent avec la tolérance déjà en place sur un chunk de texte en échec (C-01.05). |
| `isPedagogicalContent: false` | Pas une erreur — ignorée silencieusement, pas de warning par image décorative (bruyant sans valeur, même raisonnement que C-01.01 §5.4 sur le filtrage de contenu sensible). |
| Plafond `MAX_CAPTIONED_IMAGES_PER_GENERATION` dépassé | Warning explicite unique (pas un warning par image excédentaire), images au-delà du plafond simplement non captionnées. |

---

## 8. Interfaces avec les éléments voisins (hors périmètre de ce document)

| Élément | Interface avec ce document | Ce que ce document NE fixe PAS |
|---|---|---|
| `PdfExtraction.service.js` (C-01.05) | Fournit `hasEmbeddedImages` (déclenche §2) ; gagnerait une méthode de récupération des images (`pages[].images[]`) | Signature exacte de la nouvelle méthode, gestion du cache éventuel |
| `AiCardGenerationPipeline.service.js` (C-01.05) / `AiExerciseGenerationPipeline.service.js` (C-02.06) | Consomment le texte enrichi (§5.1) avant `chunkText` — **aucun changement de leur contrat de sortie** (`{ cards\|questions, warnings, usage }` inchangés dans leur forme) | Ordre exact d'orchestration (avant/après le découpage en chunks côté implémentation) |
| `AiQuota.service.js` (C-01.06) | Le coût réel (OCR image + captioning) doit remonter via `usage` — captioning agrège dans `promptTokens`/`completionTokens` du même modèle (`mistral-small-latest`), déjà couvert par `CHAT_PRICING_USD_PER_MILLION_TOKENS` (voir §9, résolu) ; aucune nouvelle table de tarifs | Le mécanisme de blocage (`checkQuota`) n'a pas besoin de changer, seul le volume facturé augmente |
| `helpers/mistralConfig.js` | Réutilisé tel quel (`apiUrl`/`model`/`apiKey`/`timeoutMs`) — aucun nouveau champ (voir §9, résolu) | — |
| Écran de validation (C-01.02/C-02.02, déjà livré) | Affiche `sourceExcerpt` tel quel — la mention « généré automatiquement » (§5.1) y apparaît sans modification de ce composant | Toute évolution UI dédiée (ex. badge visuel distinct pour une carte "issue d'un schéma") — non nécessaire a priori vu §5.1, mais pas vérifié avec une vraie maquette |

---

## 9. Modèle vision — résolu, aucun nouveau modèle nécessaire

**Mise à jour 2026-09-09** (revue documentaire, sources officielles Mistral) : `mistral-small-latest` — le
modèle **déjà retenu et configuré** pour la génération de cartes/exercices (C-01.03) — supporte nativement la
vision depuis « Mistral Small 4 » (`mistralai/Mistral-Small-4-119B-2603`, daté du 2026-03-16) : « Native
multimodality: Accepts both text and image inputs » ; Mistral décrit ce modèle comme unifiant les capacités de
Magistral (raisonnement), **Pixtral (multimodal)** et Devstral (agentique) en un seul modèle
([mistral.ai/news/mistral-small-4](https://mistral.ai/news/mistral-small-4)).

**Conséquence** : ce point n'est plus bloquant. Le captioning réutilise `helpers/mistralConfig.js` tel quel
(`apiUrl`, `model`, `apiKey`, `timeoutMs`) — aucune nouvelle variable d'environnement, aucun nouveau modèle à
benchmarker séparément. Format d'appel confirmé (`docs.mistral.ai/capabilities/vision`,
[docs.mistral.ai/api/endpoint/chat](https://docs.mistral.ai/api/endpoint/chat)) : `content` en tableau, bloc
`{ "type": "image_url", "image_url": "data:image/jpeg;base64,..." }` (chaîne, pas d'objet imbriqué) aux côtés
du bloc `{ "type": "text", "text": "..." }` — voir §4.2.

**Conséquence sur les quotas (§8)** : Mistral facture une image comme des tokens de prompt sur le modèle
appelé (confirmé : « The price is calculated using the same pricing as input tokens per image, each image
being tokenized »), **pas via une grille tarifaire séparée** — le captioning consomme donc `promptTokens`/
`completionTokens` sur `mistral-small-latest`, déjà couverts par `CHAT_PRICING_USD_PER_MILLION_TOKENS`
(`AiQuota.service.js`, C-01.06). Aucune nouvelle table de tarifs à ajouter, contrairement à ce que §8
supposait initialement — seul le volume d'appels augmente (donc le total facturé), pas le mécanisme de calcul.

**Statut de cette revue** : documentaire (pages officielles Mistral + recherche web, pas d'appel réel encore
effectué) — même niveau de confiance que C-01.03 en son temps, à confirmer au premier appel réel comme le
reste de ce projet le fait systématiquement (cf. `PdfExtraction.service.js`, commentaires « constaté à
l'exécution »).

---

## 10. Périmètre

| IN (ce document) | OUT (rappel) |
|---|---|
| Prompt captioning système + utilisateur (§4) | Implémentation réelle (aucune ligne de code à ce stade — voir mise à jour du 2026-09-09 dans DECISIONS.md pour la suite) |
| Contrat d'entrée/sortie du captioning (§3, §5) | — (modèle vision résolu, §9) |
| Format d'insertion inline, sans extension de C-01.01/C-02.01 (§5.1) | Décodage d'image maison via `pdfjs-dist` (écarté par l'utilisateur, voir DECISIONS.md) |
| Garde-fous, dont filtrage décoratif et plafond dédié (§6) | Toute évolution UI dédiée à l'affichage d'une carte "issue d'un schéma" (§8) |
| Cas d'erreur (§7) | Valeur chiffrée du plafond `MAX_CAPTIONED_IMAGES_PER_GENERATION` (à fixer à l'implémentation) |

---

## 11. Points ouverts / dette

- **Format API vision confirmé documentairement, pas encore par un appel réel** (§9) — même statut que la
  plupart des choix de ce projet avant leur première exécution en conditions réelles (cf. C-01.03/C-01.05).
- **Coût OCR élargi assumé sans chiffrage précis** (§2) : l'appel OCR dédié aux images se déclenche désormais
  sur tout PDF avec au moins une image détectée (bien plus large que le seul cas scanné de C-01.05) — pas de
  simulation chiffrée de l'impact sur le budget mensuel global (C-01.06) à ce stade.
- **Valeur du plafond `MAX_CAPTIONED_IMAGES_PER_GENERATION` non fixée** — décision de principe actée
  (§6.3), valeur chiffrée laissée à l'implémentation.
- **Placement par page, pas par position exacte** (§5.1) — approximation assumée, à revoir seulement si elle
  s'avère concrètement problématique en usage réel (comme le chunking par paragraphe, jamais remis en cause
  depuis C-01.05).
- **Bénéficie à `C-01` et `C-02` sans travail dupliqué** : `AiExerciseGenerationPipeline.service.js` (C-02.06)
  réutilise déjà `PdfExtraction.service.js`/`helpers/textChunker.js` tel quel (même précédent que le repli OCR,
  qui a profité aux deux features sans modification propre à `C-02`) — à confirmer à l'implémentation que rien
  de spécifique à `C-02` ne casse cette hypothèse.
