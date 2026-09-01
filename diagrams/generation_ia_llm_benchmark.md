# Documentation — Benchmark et choix modèle LLM : Génération de Leitner par IA

> Document de référence pour **C-01.03** (feature list `C-01`, source planning, V2, tâche « Analyse »).
> Périmètre strict de ce document : **le benchmark des modèles LLM et le choix d'un modèle** pour exécuter le
> prompt de génération de cartes. Les autres éléments IN du feature list `C-01` (Prompt, Parsing, Chunking PDF,
> Quotas, Écran de validation) sont traités uniquement comme contexte/contraintes, sans être conçus ici.
> S'appuie sur `diagrams/generation_ia_prompt_cartes.md` (C-01.01, contrat prompt/sortie) et sur l'orientation
> fournisseur déjà actée par l'utilisateur (`DECISIONS.md`, 2026-09-01, « Mistral AI pour raison RGPD ») — ce
> document restreint donc le comparatif à la gamme Mistral, ce n'est **pas** un comparatif multi-fournisseurs
> ouvert (OpenAI/Anthropic/Google explicitement écartés en amont sur le seul critère RGPD, voir `DECISIONS.md`).
> Aucune implémentation n'existe à ce jour (`C-01` à 0/11 dans le registre Odoo) — document d'analyse pur.

---

## 1. Méthode et limites

**Ce document est une revue documentaire (specs, tarifs et documentation publique Mistral AI, consultés
début septembre 2026), pas un benchmark empirique.** Aucune intégration LLM n'existe dans le dépôt à ce jour
(vérifié en C-01.01) : il n'y a ni clé d'API Mistral, ni harnais de test, ni jeu de données de référence pour
mesurer réellement la qualité de génération, la latence ou le taux de conformité JSON d'un modèle sur ce
prompt précis. Les chiffres et capacités cités ci-dessous proviennent de la documentation et des pages
tarifaires publiques de Mistral AI — **à reconfirmer à l'implémentation**, le marché des modèles LLM (gammes,
tarifs, capacités) évolue vite (sources listées en §9). Une validation empirique minimale est décrite en §8,
hors périmètre d'exécution de ce ticket.

---

## 2. Profil de la tâche à satisfaire

Dérivé du contrat de prompt (`generation_ia_prompt_cartes.md`) — sert de grille de lecture au comparatif :

| Exigence | Détail |
|---|---|
| Sortie strictement structurée | Le prompt système impose une sortie JSON exclusive, conforme à un schéma fixe (`cards[]`) — un mode de sortie structurée fiable côté modèle réduit le risque d'échec de parsing (voir `generation_ia_prompt_cartes.md` §7). |
| Contexte d'entrée modeste | L'entrée est **un chunk déjà découpé** (Chunking PDF, hors périmètre), pas un document entier — pas besoin d'une fenêtre de contexte exceptionnelle. |
| Langue principale | Français (contenu pédagogique d'étudiants post-bac francophones), avec repli multilingue possible (`outputLanguage`). |
| Nature de la tâche | Extraction/reformulation ancrée sur un texte source fourni (anti-hallucination, `sourceExcerpt` obligatoire) — pas un raisonnement complexe multi-étapes, pas d'agentique, pas d'appel d'outils. |
| Fréquence d'appel | Potentiellement élevée à l'échelle de la base d'utilisateurs (un appel par génération demandée) — le coût par appel est un critère de premier ordre, en interface avec Quotas (hors périmètre, mais le choix de modèle conditionne directement le budget que Quotas devra arbitrer). |
| Tolérance à l'erreur | Faible sur l'exactitude produite (garde-fous du prompt), mais **jamais de correction automatique ni de garantie absolue** (rappel OUT du ticket) — l'écran de validation (hors périmètre) reste le filet de sécurité final, quel que soit le modèle retenu. |

Conclusion de ce profil : la tâche est une **extraction structurée peu profonde sur un texte court**, pas un
problème de raisonnement — elle ne justifie pas a priori le modèle le plus capable (et le plus cher) de la
gamme.

---

## 3. Candidats retenus

Gamme Mistral AI actuelle (revue début septembre 2026), modèles généralistes uniquement — les modèles
spécialisés (OCR, Codestral, Voxtral audio, Mistral Embed, Mistral Moderation) sont écartés d'emblée, hors
sujet pour une tâche de génération de texte structuré :

| Modèle | Alias API | Licence |
|---|---|---|
| Mistral Large 3 | `mistral-large-latest` | Apache 2.0 (open-weight) |
| Mistral Medium 3.5 | `mistral-medium-latest` | Modified MIT |
| Mistral Small 4 | `mistral-small-latest` | Apache 2.0 (open-weight) |
| Ministral 3 (14B) | `ministral-14b-latest` | Apache 2.0 (open-weight) |
| Ministral 3 (8B) | `ministral-8b-latest` | Apache 2.0 (open-weight) |
| Ministral 3 (3B) | `ministral-3b-latest` | Apache 2.0 (open-weight) |

---

## 4. Tableau comparatif

| Modèle | Contexte | Prix entrée /M tokens | Prix sortie /M tokens | Sortie structurée | Notes |
|---|---|---|---|---|---|
| `mistral-large-latest` | 262K tokens | $0,50 | $1,50 | ✅ (JSON mode + schéma custom) | Le plus capable, le plus cher — surdimensionné pour une extraction sur un chunk court (§2) |
| `mistral-medium-latest` | 262K tokens (annoncé) | $1,50 | $7,50 | ✅ | Positionné agentique/codage — **prix de sortie le plus élevé de la gamme généraliste**, peu justifié ici (pas d'agentique, pas de code) |
| `mistral-small-latest` | 262K tokens (annoncé) | $0,15 | $0,60 | ✅ | Généraliste, coût le plus bas des modèles « chat » à taille raisonnable — profil le plus proche du besoin (§2) |
| `ministral-14b-latest` | non documenté précisément | $0,20 | $0,20 | à confirmer | Modèle « edge »/léger, orienté déploiements contraints — capacités de suivi de schéma JSON complexe moins établies pour ce cas d'usage que la gamme « Small »/« Medium »/« Large » |
| `ministral-8b-latest` | non documenté précisément | $0,15 | $0,15 | à confirmer | Idem, plus petit encore |
| `ministral-3b-latest` | non documenté précisément | $0,10 | $0,10 | à confirmer | Trop petit pour une tâche de génération de contenu pédagogique fiable — écarté |

Tous les modèles généralistes exposent le même mécanisme de sortie structurée côté API (`response_format:
json_object` ou schéma JSON custom, recommandé par Mistral pour plus de fiabilité — voir
`generation_ia_prompt_cartes.md` §3.1 règle 6 et §11) : le choix de modèle ne change donc pas le *mécanisme*
technique du prompt, seulement sa fiabilité empirique et son coût.

---

## 5. Critère RGPD / hébergement (rappel, déjà tranché)

Confirmé lors de cette revue (cohérent avec l'orientation déjà actée le 2026-09-01) : Mistral AI est une
société française, sous juridiction UE, avec résidence des données dans l'UE **par défaut** (le routage vers
des infrastructures hors UE est une option explicite, pas le comportement par défaut), une durée de rétention
des données d'API limitée à 30 jours glissants (finalité anti-abus), pas d'utilisation des données pour
l'entraînement sauf opt-in explicite, et un Data Processing Addendum RGPD disponible pour les clients
professionnels.

**Piste notée pour mémoire, hors périmètre immédiat** : plusieurs modèles de la gamme (`mistral-large-latest`,
`mistral-small-latest`, la famille Ministral) sont **open-weight sous licence Apache 2.0** — un déploiement
auto-hébergé (sur l'infrastructure Kubernetes déjà en place pour MyMemoMaster, cf. `docs/MANUEL_DEPLOIEMENT_KUBERNETES.md`)
resterait théoriquement possible pour supprimer tout transfert vers un tiers. Non retenu à ce stade : coût
d'infrastructure GPU non chiffré, hors du périmètre de ce ticket d'analyse, à ne considérer que si le volume
d'usage ou une exigence de conformité plus stricte le justifiait.

---

## 6. Choix retenu

**`mistral-small-latest` (Mistral Small 4)** comme modèle par défaut pour exécuter le prompt de génération de
cartes, avec **`mistral-medium-latest`** documenté comme option d'escalade.

**Justification** :
- Le profil de tâche (§2) est une extraction structurée sur un texte court, pas un problème de raisonnement —
  la capacité supplémentaire de Large/Medium n'a pas de justification a priori sur ce cas d'usage précis.
- Coût par appel très inférieur à Medium (×12,5 sur le prix de sortie) et à Large (×2,5), déterminant vu la
  fréquence d'appel potentiellement élevée (§2) et l'interface directe avec Quotas (hors périmètre, mais un
  coût par appel plus bas laisse plus de marge à l'arbitrage qui y sera fait).
- Sortie structurée supportée au même titre que les modèles plus capables (§4) — pas de compromis
  fonctionnel identifié sur le mécanisme JSON lui-même.
- Modèle généraliste de taille raisonnable (contrairement à la famille Ministral, plus incertaine sur le
  respect fiable d'un schéma JSON riche à plusieurs niveaux d'imbrication — non vérifié empiriquement, voir §8).

**Option d'escalade** : `mistral-medium-latest` (ou `mistral-large-latest` en dernier recours) si la
validation empirique (§8) montre un taux d'échec de conformité JSON ou une qualité de génération insuffisante
avec Small — bascule qui ne remettrait en cause ni le prompt (C-01.01) ni les maquettes UI (C-01.02), seul le
modèle appelé changerait.

---

## 7. Ce que ce document ne tranche pas

| Élément IN du feature list | Interface avec ce document | Ce que ce document NE fixe PAS |
|---|---|---|
| Prompt | Le prompt (C-01.01) s'exécute sur le modèle choisi ici | Contenu du prompt lui-même — déjà spécifié |
| Chunking PDF | Fournit l'entrée dont dépend le profil §2 (contexte modeste suffisant) | Stratégie de découpage |
| Parsing | Consomme la sortie du modèle choisi | Implémentation du parseur |
| Quotas | Le coût par appel (§4, §6) alimente son arbitrage | Limites chiffrées, mécanisme de comptage/blocage |
| Écran de validation | Reste le filet de sécurité quel que soit le modèle (§2) | Maquette, ergonomie — déjà maquetté en C-01.02 |

---

## 8. Validation empirique nécessaire avant mise en production (hors périmètre d'exécution de ce ticket)

Ce document ne remplace pas une mesure réelle. Avant bascule en production, une validation minimale
recommandée (non exécutée ici, aucune intégration disponible) :
- Constituer un petit jeu de chunks de référence (quelques matières, tailles variées) avec des cartes
  attendues jugées manuellement.
- Faire tourner le prompt (C-01.01) sur `mistral-small-latest` sur ce jeu, mesurer : taux de sortie
  strictement conforme au schéma (§4 de `generation_ia_prompt_cartes.md`), taux de cartes jugées correctes/
  pertinentes par relecture humaine, latence par appel.
- Si le taux de conformité JSON ou la qualité perçue est insuffisant, rejouer le même jeu sur
  `mistral-medium-latest` et comparer avant de trancher définitivement.

Ce protocole n'a pas été exécuté dans le cadre de ce ticket (aucune intégration technique existante, tâche
d'analyse pure) — il est documenté pour la personne qui implémentera l'intégration.

---

## 9. Points ouverts / dette

- **Aucune mesure empirique** — le choix (§6) repose sur des specs publiques et le profil de tâche déduit du
  prompt, pas sur un test réel. À confirmer via le protocole du §8 dès qu'une intégration existe.
- **Contexte exact des modèles Small/Medium non confirmé sur la documentation officielle** au moment de la
  revue (chiffre de 262K tokens trouvé sur des agrégateurs tiers, pas directement confirmé sur `docs.mistral.ai`
  pour ces deux modèles précis) — sans impact sur la conclusion (le besoin en contexte de cette tâche est de
  toute façon modeste, §2), mais à revérifier si un jour cité comme argument de choix.
- **Fiabilité de la sortie structurée sur la famille Ministral non confirmée** — écartée par prudence plutôt
  que testée (§4).
- **Tarifs susceptibles d'évolution** — la gamme Mistral a été substantiellement renouvelée récemment (Large
  3, Medium 3.5, Small 4 tous datés de 2026 lors de la revue) ; à revérifier avant toute décision de budget
  Quotas (hors périmètre).
- **Option d'auto-hébergement (§5)** non chiffrée — pertinente seulement si une exigence de conformité plus
  stricte que l'hébergement UE par défaut de Mistral émergeait, ou à un volume d'usage qui en justifierait le
  coût d'infrastructure.

---

## Sources externes (revue début septembre 2026 — à revérifier, le marché évolue vite)

- [Mistral AI — Pricing](https://mistral.ai/pricing)
- [Mistral AI — API Pricing](https://mistral.ai/pricing/api)
- [Mistral Docs — Models overview](https://docs.mistral.ai/models)
- [Mistral Docs — Models](https://docs.mistral.ai/models/overview)
- [Mistral Docs — Structured Outputs](https://docs.mistral.ai/capabilities/structured_output)
- [Mistral Docs — JSON Mode](https://docs.mistral.ai/studio/conversations/structured-output/json_mode)
- [Mistral AI — Data Processing Addendum](https://legal.mistral.ai/terms/data-processing-addendum)
- [Mistral AI — Introducing Mistral 3](https://mistral.ai/news/mistral-3/)
