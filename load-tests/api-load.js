// =============================================================================
//  Test de charge de l'API — QA.06
//
//  Exécution (aucune installation locale requise, k6 tourne en conteneur) :
//    docker run --rm -i --network host \
//      -e BASE_URL=http://localhost:3000 \
//      -e E2E_STUDENT_EMAIL=... -e E2E_STUDENT_PASSWORD=... \
//      grafana/k6 run - < load-tests/api-load.js
//
//  ─────────────────────────────────────────────────────────────────────────
//  DEUX CONTRAINTES DE L'API QUI FAÇONNENT CE SCÉNARIO
//
//  1. `apiLimiter` couvre TOUT /api/v1 : 500 requêtes / 15 min par userId,
//     soit ~33/min (middlewares/rateLimit.middleware.js). Sans neutralisation,
//     ce test mesurerait le limiteur et non l'API — on atteindrait le plafond
//     en quelques secondes et tout le reste serait des 429.
//     => L'environnement de charge pose RATE_LIMIT_DISABLED=true, le levier
//        prévu par le projet. CONSÉQUENCE À DIRE DANS LE RAPPORT : les chiffres
//        décrivent la capacité de l'API DERRIÈRE le limiteur, pas le débit
//        réellement visible par un utilisateur en production.
//
//  2. `/users/login` est en plus protégé par `authLimiter`. On ne se connecte
//     donc QU'UNE FOIS, dans setup(), et les VU réutilisent le même jeton.
//     Marteler le login mesurerait l'anti-force-brute, ce qui n'a pas d'intérêt
//     ici (et c'est déjà couvert par security.test.js).
//
//  Endpoints retenus — tous vérifiés présents dans les routes (2026-08-29) :
//    GET  /api/v1/health                     hors limiteur (monté avant v1)
//    GET  /api/v1/users/registration-status  sans authentification
//    GET  /api/v1/subjects                   authentifié, liste
//    GET  /api/v1/users/:id                  authentifié, lecture unitaire
// =============================================================================

import http from 'k6/http'
import { check, group, sleep } from 'k6'
import { Rate, Trend } from 'k6/metrics'
import encoding from 'k6/encoding'

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000'
const EMAIL = __ENV.E2E_STUDENT_EMAIL || 'e2e-student@mymemomaster.local'
const PASSWORD = __ENV.E2E_STUDENT_PASSWORD || 'E2eStudent1234!'

// Part de réponses 429 : doit rester à zéro. Si elle monte, c'est que
// RATE_LIMIT_DISABLED n'a pas été pris en compte et que la mesure ne vaut rien.
const rateLimited = new Rate('rate_limited_responses')
const authedLatency = new Trend('authed_request_duration', true)

export const options = {
  scenarios: {
    // Montée progressive plutôt qu'un palier brutal : on cherche le
    // comportement sous charge croissante, pas un point de rupture.
    charge_progressive: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 10 },
        { duration: '1m', target: 10 },
        { duration: '15s', target: 0 }
      ],
      gracefulRampDown: '10s'
    }
  },
  thresholds: {
    // Seuils volontairement explicites : un test de charge sans seuil ne
    // peut pas échouer, donc ne prouve rien.
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<800'],
    rate_limited_responses: ['rate==0'],
    checks: ['rate>0.99']
  }
}

/** Lit le claim `id` d'un JWT sans en vérifier la signature. */
function userIdFromJwt(token) {
  const payload = token.split('.')[1]
  if (!payload) return null
  // base64url -> base64, puis padding : k6 n'a pas de décodeur base64url.
  const b64 = payload.replace(/-/g, '+').replace(/_/g, '/')
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4)
  try {
    return JSON.parse(encoding.b64decode(padded, 'std', 's')).id ?? null
  } catch (e) {
    return null
  }
}

/** Connexion unique, partagée par tous les VU (voir contrainte n° 2). */
export function setup() {
  const health = http.get(`${BASE_URL}/api/v1/health`)
  if (health.status !== 200) {
    throw new Error(
      `API injoignable sur ${BASE_URL} (health => HTTP ${health.status}). ` +
        'Démarrer la stack avant de lancer le test de charge.'
    )
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

  // La réponse de /users/login ne renvoie que { token, refreshToken } —
  // vérifié dans User.controller.js. L'identifiant nécessaire à
  // GET /users/:id est donc lu dans la charge utile du JWT (claim `id`).
  // Décodage sans vérification de signature : usage strictement local au
  // test, le serveur reste seul juge de la validité du jeton.
  return { token, userId: userIdFromJwt(token) }
}

export default function (data) {
  const authed = {
    headers: {
      Authorization: `Bearer ${data.token}`,
      'Content-Type': 'application/json'
    }
  }

  group('endpoints publics', () => {
    const health = http.get(`${BASE_URL}/api/v1/health`, { tags: { name: 'health' } })
    check(health, { 'health 200': (r) => r.status === 200 })

    const reg = http.get(`${BASE_URL}/api/v1/users/registration-status`, {
      tags: { name: 'registration-status' }
    })
    check(reg, { 'registration-status 200': (r) => r.status === 200 })
  })

  group('endpoints authentifies', () => {
    const subjects = http.get(`${BASE_URL}/api/v1/subjects`, {
      ...authed,
      tags: { name: 'subjects' }
    })
    check(subjects, { 'subjects 200': (r) => r.status === 200 })
    rateLimited.add(subjects.status === 429)
    authedLatency.add(subjects.timings.duration)

    if (data.userId) {
      const me = http.get(`${BASE_URL}/api/v1/users/${data.userId}`, {
        ...authed,
        tags: { name: 'user-detail' }
      })
      check(me, { 'user-detail 200': (r) => r.status === 200 })
      rateLimited.add(me.status === 429)
      authedLatency.add(me.timings.duration)
    }
  })

  // Rythme de navigation réaliste : un utilisateur ne rafraîchit pas en boucle.
  sleep(1)
}
