// =============================================================================
//  Test de charge de la correction des réponses ouvertes — POST /api/v1/grading/mistral
//
//  Objectif : remplacer les estimations de capacité (DECISIONS.md 2026-10-09) par des
//  mesures : combien de corrections par seconde un pod API tient-il, et à partir de
//  quand la latence ou les erreurs explosent-elles ?
//
//  Exécution (k6 en conteneur, même contrat que api-load.js) :
//    docker run --rm -i --network host \
//      -e BASE_URL=https://<preprod> \
//      -e E2E_STUDENT_EMAIL=... -e E2E_STUDENT_PASSWORD=... \
//      -e SCENARIO=cache -e MAX_VUS=40 \
//      grafana/k6 run - < load-tests/grading-load.js
//
//  FLUX TESTÉ (depuis le 2026-10-09) : une réponse vide ou identique à la référence est tranchée
//  sans aucun appel ; sinon verdict en cache (Redis) ; sinon plafond de corrections ; sinon Mistral.
//  MiniLM (embedding, ~0,4 s de CPU par correction) n'intervient plus qu'en mode DÉGRADÉ.
//
//  SCÉNARIOS (variable SCENARIO) :
//
//  - `cache` (défaut, quasi GRATUIT) : réponses figées en zone grise. Seul le 1er appel de
//    chaque réponse (une douzaine au total, ~0,001 $) part chez Mistral ; tout le reste est servi
//    par le cache Redis. Mesure le coût de l'API elle-même (auth, validation, Redis).
//
//  - `mistral` (PAYANT, ~0,0001 $ par appel) : exige CONFIRM_PAID=yes. Avec UNIQUE=true, chaque
//    réponse est rendue unique (suffixe aléatoire) pour contourner le cache et mesurer la vraie
//    latence Mistral — chaque itération coûte alors un appel (bornez MAX_VUS / durée).
//
//  - MODE DÉGRADÉ (mesure du pire cas CPU) : lancer `SCENARIO=mistral UNIQUE=true CONFIRM_PAID=yes`
//    contre une API démarrée avec AI_GRADING_MAX_PER_DAY=1. Le plafond est atteint dès la 1re
//    correction : toutes les suivantes passent par MiniLM (réponses `degraded: true`), SANS appel
//    Mistral donc sans coût. À comparer au scénario `cache` : c'est le surcoût CPU du repli.
//
//  CONTRAINTES (mêmes que api-load.js) :
//  1. `apiLimiter` : 500 requêtes / 15 min par userId. L'environnement testé doit poser
//     RATE_LIMIT_DISABLED=true, sinon le test mesure le limiteur (seuil `rate_limited`).
//  2. UN SEUL compte de test : le plafond quotidien de 300 corrections Mistral par
//     utilisateur (AI_GRADING_MAX_PER_DAY) s'applique à lui. En scénario `mistral` avec
//     UNIQUE=true, il sera atteint après 300 appels : les réponses passent alors en mode
//     dégradé (métrique `degraded_responses`) — c'est aussi un test du plafond.
//  3. Ne pas lancer contre la production : charge réelle, coût réel, journal d'usage pollué
//     (lignes `grading` dans AiUsageLog comptées dans le budget mensuel).
//
//  Lecture des résultats : surveiller en parallèle la RAM/CPU des pods
//  (`kubectl top pods` — metrics-server est en panne au 2026-10-09, à réparer d'abord, sinon
//  lire `memory.current` dans le cgroup du pod) et les redémarrages (`kubectl get pods`).
//  Le point de rupture = le palier où p95 dépasse le seuil OU où un pod redémarre (OOMKilled).
// =============================================================================

import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate, Trend, Counter } from 'k6/metrics'

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000'
const EMAIL = __ENV.E2E_STUDENT_EMAIL || 'e2e-student@mymemomaster.local'
const PASSWORD = __ENV.E2E_STUDENT_PASSWORD || 'E2eStudent1234!'
const SCENARIO = __ENV.SCENARIO || 'cache'
const MAX_VUS = parseInt(__ENV.MAX_VUS || '20', 10)
const UNIQUE = __ENV.UNIQUE === 'true'
// Temps de réflexion entre deux corrections. Un étudiant réel : 15–30 s. Valeur basse par
// défaut pour STRESSER l'API : MAX_VUS étudiants « réels » ≈ MAX_VUS / 20 corrections/s.
const THINK_SECONDS = parseFloat(__ENV.THINK_SECONDS || '1')

if (SCENARIO === 'mistral' && __ENV.CONFIRM_PAID !== 'yes') {
  throw new Error(
    'Le scénario `mistral` appelle une API payante. Relancer avec -e CONFIRM_PAID=yes pour confirmer.'
  )
}

const rateLimited = new Rate('rate_limited_responses')
const degraded = new Rate('degraded_responses')
const viaMistral = new Rate('mistral_verdicts')
const gradingLatency = new Trend('grading_duration', true)
const gradings = new Counter('gradings_done')

export const options = {
  scenarios: {
    // Paliers successifs : on cherche où ça casse, pas un régime unique.
    montee_en_charge: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: Math.max(1, Math.round(MAX_VUS / 4)) },
        { duration: '1m', target: Math.max(1, Math.round(MAX_VUS / 2)) },
        { duration: '1m', target: MAX_VUS },
        { duration: '1m', target: MAX_VUS },
        { duration: '20s', target: 0 }
      ],
      gracefulRampDown: '15s'
    }
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    rate_limited_responses: ['rate==0'],
    checks: ['rate>0.99'],
    // Cache : une correction ne doit pas dépasser 1,5 s au p95. Avec Mistral non caché, la latence
    // est dominée par l'API distante : seuil plus large.
    grading_duration: [SCENARIO === 'mistral' && UNIQUE ? 'p(95)<6000' : 'p(95)<1500']
  }
}

// ── Jeux de réponses (précision mesurée le 2026-10-09 : 99 % sur 96 cas simulés) ─────────

const CARDS = [
  {
    question: "Qu'est-ce qu'une transformation isochore ?",
    refs: [
      'Une transformation isochore est une transformation au cours de laquelle le volume du système reste constant.',
      'Une transformation isochore est une transformation à volume constant.'
    ],
    // réponses ambiguës (juste / fausse voisine)
    grey: [
      'Une transformation où le volume reste identique',
      'Une transformation où la pression reste constante',
      'Le volume ne change pas pendant la transformation'
    ]
  },
  {
    question: "Qu'est-ce qu'une transformation isobare ?",
    refs: [
      'Une transformation isobare est une transformation au cours de laquelle la pression du système reste constante.',
      'Une transformation isobare est une transformation à pression constante.'
    ],
    // réponses ambiguës (juste / fausse voisine)
    grey: [
      'La pression reste identique tout au long',
      'Une transformation où le volume reste constant',
      'Transformation où la pression augmente de façon linéaire'
    ]
  },
  {
    question: "Quelle est la définition de l'enthalpie H ?",
    refs: [
      "L'enthalpie H est une fonction d'état définie par H = U + PV, somme de l'énergie interne et du produit pression-volume."
    ],
    // réponses ambiguës (juste / fausse voisine)
    grey: [
      "C'est l'énergie interne plus le produit de la pression par le volume",
      "L'enthalpie est la dérivée de l'énergie interne par rapport à la température",
      "L'enthalpie correspond à la chaleur échangée à volume constant"
    ]
  },
  {
    question: "Quelle est la définition de l'entropie S ?",
    refs: ["L'entropie S est une grandeur extensive qui mesure le désordre d'un système."],
    // réponses ambiguës (juste / fausse voisine)
    grey: [
      'Une mesure du désordre du système',
      "L'entropie est une grandeur intensive",
      "L'entropie mesure la température du système"
    ]
  }
]

function pick(list) {
  return list[Math.floor(Math.random() * list.length)]
}

/** Construit le corps de requête : toujours une réponse de la zone grise (Mistral/cache). */
function buildPayload() {
  const card = pick(CARDS)
  let answer = pick(card.grey)
  // Suffixe aléatoire : sort de l'empreinte du cache sans changer le sens — chaque appel est
  // alors un vrai appel Mistral (ou un repli dégradé si le plafond est atteint).
  if (UNIQUE) answer = `${answer} (${Math.random().toString(36).slice(2, 8)})`
  return { question: card.question, correct_answers: card.refs, student_answer: answer }
}

export function setup() {
  const health = http.get(`${BASE_URL}/api/v1/health`)
  if (health.status !== 200) {
    throw new Error(`API injoignable sur ${BASE_URL} (health => HTTP ${health.status}).`)
  }

  const res = http.post(
    `${BASE_URL}/api/v1/users/login`,
    JSON.stringify({ email: EMAIL, password: PASSWORD }),
    { headers: { 'Content-Type': 'application/json' } }
  )
  if (res.status !== 200) {
    throw new Error(
      `Connexion du compte de charge refusée (HTTP ${res.status}). ` +
        'Le seeder E2E a-t-il tourné (SEED_E2E_USERS=true) ?'
    )
  }
  const token = res.json('token')
  if (!token) throw new Error('Réponse de connexion sans jeton exploitable.')

  // Sonde : vérifie que la route existe et que le scénario choisi se comporte comme prévu
  // AVANT de lancer la charge (évite de mesurer des 404 ou de payer pour rien).
  const probe = http.post(`${BASE_URL}/api/v1/grading/mistral`, JSON.stringify(buildPayload()), {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
  })
  if (probe.status !== 200) {
    throw new Error(`Sonde POST /grading/mistral => HTTP ${probe.status} : ${probe.body}`)
  }

  return { token }
}

export default function (data) {
  const res = http.post(`${BASE_URL}/api/v1/grading/mistral`, JSON.stringify(buildPayload()), {
    headers: { Authorization: `Bearer ${data.token}`, 'Content-Type': 'application/json' },
    tags: { name: 'grading-mistral' }
  })

  const ok = check(res, {
    'grading 200': (r) => r.status === 200,
    'verdict présent': (r) => r.status === 200 && typeof r.json('is_correct') === 'boolean'
  })

  rateLimited.add(res.status === 429)
  gradingLatency.add(res.timings.duration)
  if (ok) {
    gradings.add(1)
    degraded.add(res.json('degraded') === true)
    viaMistral.add(res.json('strategy') === 'mistral')
  }

  sleep(THINK_SECONDS)
}
