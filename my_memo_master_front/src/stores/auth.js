import { defineStore } from 'pinia'
import { notif } from '@/helpers/notif.js'
import router from '@/router'
import { api } from '@/helpers/api'
import { isValidEmail } from '@/helpers/functions.js'
import { missingsElementsPassword } from '@/helpers/functions.js'

const decodeJwtPayload = (token) => {
  try {
    return JSON.parse(atob(token.split('.')[1]))
  } catch {
    return null
  }
}

const extractApiError = (resp, fallback = 'Une erreur est survenue.') => {
  if (!resp) return fallback
  if (resp.data?.message) return resp.data.message
  if (Array.isArray(resp.data?.errors) && resp.data.errors.length > 0) {
    return resp.data.errors.map(e => e.msg).join(' · ')
  }
  return fallback
}

export const useAuthStore = defineStore('auth', {
  persist: {
    // Seules les données d'authentification sont persistées — pas les champs de formulaire.
    paths: ['token', 'refreshToken', 'user', 'authenticated'],
  },
  state: () => ({
    authentication: {
      tab: 'login',
      tabs: {
        login: {
          fields: { email: '', password: '' },
          default: { email: '', password: '' }
        },
        register: {
          fields: { name: '', email: '', password: '', confirmPassword: '', acceptTerms: false },
          default: { name: '', email: '', password: '', confirmPassword: '', acceptTerms: false }
        },
        forgotPassword: {
          fields: { email: '' },
          default: { email: '' }
        },
        resetPassword: {
          fields: { code: null, password: '', confirmPassword: '' },
          default: { code: null, password: '', confirmPassword: '' }
        }
      }
    },
    authenticated: false,
    token: null,
    refreshToken: null,
    user: {},
  }),

  actions: {
    setAuthenticationTab(t = 'login') {
      this.authentication.tab = t
    },

    clearTabFields(tab) {
      const defaults = this.authentication.tabs[tab].default
      this.authentication.tabs[tab].fields = { ...defaults }
    },

    async fetchUserInfos() {
      const resp = await api.get(`users/${this.user.userId}`)
      if (!resp) return false

      if (resp.status !== 200) {
        notif.notify(resp.data?.message || 'Erreur lors du chargement du profil.', 'error')
        return false
      }

      this.user = resp.data
      return true
    },

    async updateUserInfos() {
      const { name, email } = this.user
      const resp = await api.put(`users/${this.user.userId}`, { name, email })
      if (!resp) return false

      if (resp.status !== 200) {
        notif.notify(resp.data?.message || 'Erreur lors de la mise à jour.', 'error')
        return false
      }

      this.user = resp.data
      return true
    },

    async deleteAccount() {
      const resp = await api.del(`users/${this.user.userId}`)
      if (!resp) return false

      if (resp.status !== 200) {
        notif.notify(resp.data?.message || 'Erreur lors de la suppression.', 'error')
        return false
      }

      this.logout()
      return true
    },

    async register(user, redirect = null) {
      this.logout(false, null)

      try {
        const resp = await api.post('users/register', user)

        if (!resp || resp.status !== 201) {
          const message = extractApiError(resp, "Erreur lors de l'inscription.")
          throw new Error(message)
        }

        notif.notify('Inscription réussie ! Vérifiez votre email pour activer votre compte.', 'success')

        const target = redirect || { path: '/verify-email', query: { email: user.email } }
        router.push(target)

        return true
      } catch (error) {
        const message = error?.message || "Erreur lors de l'inscription."
        notif.notify(message, 'error')
        throw new Error(message)
      }
    },

    async login(email, password, redirect) {
      const resp = await api.post('users/login', { email, password })

      if (!resp || resp.status !== 200) {
        if (resp?.status === 403 && resp?.data?.message?.includes('vérifier votre adresse email')) {
          router.push({ path: '/verify-email', query: { email, expired: '1' } })
          return 'redirect'
        }
        const message = extractApiError(resp, 'Email ou mot de passe incorrect.')
        notif.notify(message, 'error')
        return false
      }

      this.token = resp.data.token
      this.refreshToken = resp.data.refreshToken ?? null
      this.authenticated = true

      // Décoder le JWT pour récupérer l'userId, puis charger le profil complet
      const payload = decodeJwtPayload(this.token)
      if (payload?.id) {
        this.user = { userId: payload.id }
        await this.fetchUserInfos()
      }

      notif.notify('Connexion réussie.', 'success')

      if (redirect) {
        router.push(redirect)
      }

      return true
    },

    async updateUser(notify = false) {
      const name = this.user.name?.trim() || null

      if (!name || name.length === 0) {
        notif.notify('Veuillez saisir votre nom.', 'error')
        return false
      }

      const resp = await api.put(`users/${this.user.userId}`, { name })

      if (!resp || resp.status !== 200) {
        notif.notify(resp?.data?.message || 'Erreur lors de la mise à jour.', 'error')
        return false
      }

      this.user = { ...this.user, ...resp.data }

      if (notify) {
        notif.notify('Vos informations ont été mises à jour.', 'success')
      }

      return true
    },

    async resendVerificationEmail(email) {
      const resp = await api.post('users/resend-verification', { email })
      if (!resp || resp.status !== 200) {
        notif.notify(resp?.data?.message || "Erreur lors de l'envoi du code.", 'error')
        return false
      }
      notif.notify('Un nouveau code de vérification vous a été envoyé par email.', 'success')
      return true
    },

    async verifyEmail(email, code, notify = true) {
      let error = null

      if (!error && (!code || String(code).length === 0)) error = 'Veuillez saisir le code reçu.'
      if (!error && (!email || email.length === 0)) error = 'Veuillez saisir votre adresse email.'
      if (!error && !isValidEmail(email)) error = "L'adresse email n'est pas valide."

      if (error) {
        notif.notify(error, 'error')
        return false
      }

      const resp = await api.post('users/verify-email', { email, code })

      if (!resp || resp.status !== 201) {
        notif.notify(resp?.data?.message || 'Erreur lors de la vérification.', 'error')
        return false
      }

      if (notify) {
        notif.notify('Votre adresse email a été vérifiée.', 'success')
      }

      return true
    },

    async forgotPassword() {
      const email = this.authentication.tabs.forgotPassword.fields.email.trim() || null

      if (!email) {
        notif.notify('Veuillez saisir votre adresse email.', 'error')
        return false
      }
      if (!isValidEmail(email)) {
        notif.notify("L'adresse email n'est pas valide.", 'error')
        return false
      }

      const resp = await api.post('users/forgot-password', { email })

      if (!resp || resp.status !== 201) {
        notif.notify(resp?.data?.message || 'Erreur lors de la demande.', 'error')
        return false
      }

      notif.notify('Un email avec votre token de réinitialisation a été envoyé. Copiez-collez le token reçu dans le formulaire.', 'success')
      this.setAuthenticationTab('resetPassword')

      return true
    },

    async resetPassword() {
      const code = this.authentication.tabs.resetPassword.fields.code || null
      const newPassword = this.authentication.tabs.resetPassword.fields.password.trim() || null

      let error = null

      if (!error && !code) error = 'Veuillez coller le token de réinitialisation reçu par email.'
      if (!error && !newPassword) error = 'Veuillez saisir votre nouveau mot de passe.'
      if (!error && missingsElementsPassword(newPassword).length > 0) {
        error = `Le mot de passe doit contenir au minimum : ${missingsElementsPassword(newPassword).join(', ')}`
      }

      if (error) {
        notif.notify(error, 'error')
        return false
      }

      const email = this.authentication.tabs.forgotPassword.fields.email.trim() || null

      const resp = await api.post('users/reset-password', { email, code, newPassword })

      if (!resp || resp.status !== 201) {
        notif.notify(resp?.data?.message || 'Erreur lors de la réinitialisation.', 'error')
        return false
      }

      notif.notify('Votre mot de passe a été réinitialisé.', 'success')

      this.clearTabFields('forgotPassword')
      this.clearTabFields('resetPassword')
      this.setAuthenticationTab('login')

      return true
    },

    logout(notify = true, redirect = '/auth') {
      const rt = this.refreshToken

      this.authenticated = false
      this.user = {}
      this.token = null
      this.refreshToken = null

      // Révocation côté serveur — best effort, fire and forget
      if (rt) {
        api.post('users/logout', { refreshToken: rt }).catch(() => {})
      }

      if (redirect) {
        router.push(redirect)
      }

      if (notify) {
        notif.clear()
        notif.notify('Vous avez été déconnecté.', 'info')
      }
    },
  },
})
