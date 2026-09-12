#!/usr/bin/env node
/**
 * Client HTTP minimal, scope figé sur l'API preprod (https://preprod-api.my-memo-master.com) —
 * outil ponctuel pour interroger le contenu réel enregistré sur cet environnement (lecture
 * seule par convention d'usage, rien n'empêche techniquement un verbe d'écriture si demandé
 * explicitement). Lit les identifiants dans le .env racine du repo (`preprod_mail`/`preprod_pass`),
 * jamais en argument CLI ni en dur ici.
 *
 * Usage :
 *   node scripts/preprod-query.js <METHOD> <path> [jsonBody]
 *
 * Exemples :
 *   node scripts/preprod-query.js GET /leitner-systems
 *   node scripts/preprod-query.js GET /leitner-systems/12/cards
 *   node scripts/preprod-query.js POST /questions '{"statement":"..."}'
 */
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') })

const BASE_URL = 'https://preprod-api.my-memo-master.com/api/v1'

async function login() {
  const email = process.env.preprod_mail
  const password = process.env.preprod_pass
  if (!email || !password) {
    throw new Error('preprod_mail / preprod_pass absents du .env racine')
  }
  const res = await fetch(`${BASE_URL}/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  })
  const body = await res.json()
  if (!res.ok) {
    throw new Error(`Login échoué (${res.status}) : ${JSON.stringify(body)}`)
  }
  // Le nom exact du champ token dépend de User.controller#login — on tente les variantes usuelles.
  return body.token || body.accessToken || body.data?.token
}

async function main() {
  const [method, apiPath, jsonBody] = process.argv.slice(2)
  if (!method || !apiPath) {
    console.error('Usage: node scripts/preprod-query.js <METHOD> <path> [jsonBody]')
    process.exit(1)
  }

  const token = await login()

  const res = await fetch(`${BASE_URL}${apiPath}`, {
    method: method.toUpperCase(),
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: jsonBody ? jsonBody : undefined
  })

  const text = await res.text()
  console.log('status', res.status)
  try {
    console.log(JSON.stringify(JSON.parse(text), null, 2))
  } catch {
    console.log(text)
  }
}

main().catch((e) => {
  console.error('ERR', e.message)
  process.exit(1)
})
