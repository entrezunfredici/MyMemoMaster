// Fournisseurs OAuth 2.0 / OpenID Connect pour la connexion « Se connecter avec… ».
// Un fournisseur n'est actif que si son identifiant ET son secret sont définis dans l'environnement.
// Les URI de redirection à déclarer chez chaque fournisseur : `<URL du front>/oauth/callback/<id>`.

const microsoftTenant = () => process.env.OAUTH_MICROSOFT_TENANT || 'common'

const PROVIDERS = {
  google: {
    label: 'Google',
    clientIdEnv: 'OAUTH_GOOGLE_CLIENT_ID',
    clientSecretEnv: 'OAUTH_GOOGLE_CLIENT_SECRET'
  },
  github: {
    label: 'GitHub',
    clientIdEnv: 'OAUTH_GITHUB_CLIENT_ID',
    clientSecretEnv: 'OAUTH_GITHUB_CLIENT_SECRET',
    authorizeUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    scope: 'read:user user:email'
  },
  microsoft: {
    label: 'Microsoft',
    clientIdEnv: 'OAUTH_MICROSOFT_CLIENT_ID',
    clientSecretEnv: 'OAUTH_MICROSOFT_CLIENT_SECRET',
    authorizeUrl: () => `https://login.microsoftonline.com/${microsoftTenant()}/oauth2/v2.0/authorize`,
    tokenUrl: () => `https://login.microsoftonline.com/${microsoftTenant()}/oauth2/v2.0/token`,
    scope: 'openid profile email'
  }
}

const PROVIDER_IDS = Object.keys(PROVIDERS)

/**
 * Retourne la configuration d'un fournisseur avec ses identifiants lus dans l'environnement.
 *
 * @param {string} id - Identifiant du fournisseur (google, github, microsoft)
 * @returns {{ id: string, label: string, clientId: string, clientSecret: string, scope?: string,
 *   authorizeUrl?: string, tokenUrl?: string }|null} null si le fournisseur est inconnu
 */
const getProvider = (id) => {
  if (!Object.prototype.hasOwnProperty.call(PROVIDERS, id)) return null
  const def = PROVIDERS[id]
  const resolve = (value) => (typeof value === 'function' ? value() : value)
  return {
    id,
    label: def.label,
    clientId: (process.env[def.clientIdEnv] || '').trim(),
    clientSecret: (process.env[def.clientSecretEnv] || '').trim(),
    scope: def.scope,
    authorizeUrl: resolve(def.authorizeUrl),
    tokenUrl: resolve(def.tokenUrl)
  }
}

module.exports = { PROVIDER_IDS, getProvider }
