/**
 * Préparation d'état pour les parcours E2E (QA.03 / QA.05).
 *
 * Monte l'état par l'API, assert par l'interface : c'est la pratique standard,
 * et surtout la seule praticable ici. Sans groupe classe, `/classroom` affiche
 * « Aucun groupe. » pour TOUS les rôles — les vues étudiant et enseignant sont
 * alors strictement indiscernables dans le DOM et aucun test ne peut prouver
 * que l'application distingue les rôles.
 *
 * FAIT DE DOMAINE : un enseignant (roleId 3) ne peut PAS créer de groupe —
 * `ClassGroupService.create` n'autorise que les rôles 1 (admin plateforme) et
 * 4 (admin établissement). Le parcours enseignant ne commence donc pas par
 * « créer une classe » : c'est un administrateur qui la crée et y rattache
 * l'enseignant. Cette préparation reproduit ce cheminement réel.
 *
 * Idempotent : rejouable sans accumuler de groupes ni échouer sur un doublon.
 */

const BASE = process.env.E2E_BASE_URL || 'http://localhost'
const API = `${BASE}/api/v1`

const GROUP_CODE = 'E2E-QA-GROUP'

const ADMIN = {
  email: process.env.ADMIN_SEED_EMAIL || 'support@my-memo-master.com',
  password: process.env.ADMIN_SEED_PASSWORD || 'Admin1234!',
}
const STUDENT = {
  email: process.env.E2E_STUDENT_EMAIL || 'e2e-student@mymemomaster.local',
  password: process.env.E2E_STUDENT_PASSWORD || 'E2eStudent1234!',
}
const TEACHER = {
  email: process.env.E2E_TEACHER_EMAIL || 'e2e-teacher@mymemomaster.local',
  password: process.env.E2E_TEACHER_PASSWORD || 'E2eTeacher1234!',
}

/** Se connecte et renvoie { token, userId }. */
async function login({ email, password }) {
  const res = await fetch(`${API}/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) {
    throw new Error(
      `Connexion impossible pour ${email} (HTTP ${res.status}). ` +
        'La stack est-elle lancée avec SEED_E2E_USERS=true ?'
    )
  }
  const { token } = await res.json()
  // La réponse ne contient que { token, refreshToken } : l'identifiant est
  // dans le claim `id` du JWT (voir User.controller.js).
  const payload = JSON.parse(
    Buffer.from(token.split('.')[1], 'base64url').toString('utf8')
  )
  return { token, userId: payload.id }
}

const authed = (token) => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token}`,
})

export default async function globalSetup() {
  const admin = await login(ADMIN)
  const student = await login(STUDENT)
  const teacher = await login(TEACHER)

  // ── Groupe classe, créé une seule fois ────────────────────────────────────
  const listRes = await fetch(`${API}/class-groups`, { headers: authed(admin.token) })
  const list = listRes.ok ? await listRes.json() : []
  const groups = Array.isArray(list) ? list : (list.data ?? [])
  let group = groups.find((g) => g.code === GROUP_CODE)

  if (!group) {
    const createRes = await fetch(`${API}/class-groups`, {
      method: 'POST',
      headers: authed(admin.token),
      body: JSON.stringify({
        name: 'Groupe E2E (tests automatisés)',
        description: 'Créé par e2e/global-setup.js — parcours QA.03 et QA.05.',
        level: 'Terminale',
        code: GROUP_CODE,
        score: 0,
      }),
    })
    if (!createRes.ok) {
      throw new Error(
        `Création du groupe refusée (HTTP ${createRes.status}). ` +
          "Le compte d'administration a-t-il bien le rôle 1 ou 4 ?"
      )
    }
    group = (await createRes.json()).data
  }

  const groupId = group.idClassGroup ?? group.id ?? group.classGroupId
  if (!groupId) throw new Error('Groupe créé mais identifiant introuvable dans la réponse.')

  // ── Rattachement des membres ─────────────────────────────────────────────
  // Un 409/400 signifie « déjà membre » : c'est le cas nominal au 2e passage,
  // on ne le traite donc pas comme une erreur.
  for (const [who, role] of [
    [teacher, 'teacher'],
    [student, 'student'],
  ]) {
    const res = await fetch(`${API}/class-groups/${groupId}/members`, {
      method: 'POST',
      headers: authed(admin.token),
      body: JSON.stringify({ userId: who.userId, role }),
    })
    if (!res.ok && ![400, 409].includes(res.status)) {
      throw new Error(`Ajout du membre ${role} refusé (HTTP ${res.status}).`)
    }
  }

  console.log(`[e2e] groupe « ${GROUP_CODE} » (id ${groupId}) prêt : 1 enseignant, 1 étudiant.`)
}
