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

export const useAuthStore = defineStore('auth', {
  persist: true,
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

    async register(user, redirect = '/auth') {
      this.logout(false, null)

      try {
        const resp = await api.post('users/register', user)

        if (!resp || resp.status !== 201) {
          const message = resp?.data?.message || 'Registration failed.'
          throw new Error(message)
        }

        notif.notify('You have been registered', 'success')

        if (redirect) {
          router.push(redirect)
        }

        return true
      } catch (error) {
        const message = error?.response?.data?.message || error?.message || "Erreur lors de l'inscription."
        notif.notify(message, 'error')
        throw new Error(message)
      }
    },

    async login(email, password, redirect) {
      const resp = await api.post('users/login', { email, password })

      if (!resp || resp.status !== 200) {
        notif.notify(resp?.data?.message || 'Erreur lors de la connexion.', 'error')
        return false
      }

      this.token = resp.data.token
      this.authenticated = true

      // Décoder le JWT pour récupérer l'userId, puis charger le profil complet
      const payload = decodeJwtPayload(this.token)
      if (payload?.id) {
        this.user = { userId: payload.id }
        await this.fetchUserInfos()
      }

      notif.notify('You have been logged in', 'success')

      if (redirect) {
        router.push(redirect)
      }

      return true
    },

    async updateUser(notify = false) {
      const name = this.user.name?.trim() || null

      if (!name || name.length === 0) {
        notif.notify("Please enter your name", 'error')
        return false
      }

      const resp = await api.put(`users/${this.user.userId}`, { name })

      if (!resp || resp.status !== 200) {
        notif.notify(resp?.data?.message || 'Erreur lors de la mise à jour.', 'error')
        return false
      }

      this.user = { ...this.user, ...resp.data }

      if (notify) {
        notif.notify('Your informations have been updated', 'success')
      }

      return true
    },

    async verifyEmail(email, code, notify = true) {
      let error = null

      if (!error && (!code || String(code).length === 0)) error = "No code provided"
      if (!error && (!email || email.length === 0)) error = "No email provided"
      if (!error && !isValidEmail(email)) error = "The email is not valid"

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
        notif.notify('Your email has been verified', 'success')
      }

      return true
    },

    async forgotPassword() {
      const email = this.authentication.tabs.forgotPassword.fields.email.trim() || null

      if (!email) {
        notif.notify("Please enter your email", 'error')
        return false
      }
      if (!isValidEmail(email)) {
        notif.notify("Please enter a valid email", 'error')
        return false
      }

      const resp = await api.post('users/forgot-password', { email })

      if (!resp || resp.status !== 201) {
        notif.notify(resp?.data?.message || 'Erreur lors de la demande.', 'error')
        return false
      }

      notif.notify('An email has been sent with a code', 'success')
      this.setAuthenticationTab('resetPassword')

      return true
    },

    async resetPassword() {
      const code = this.authentication.tabs.resetPassword.fields.code || null
      const newPassword = this.authentication.tabs.resetPassword.fields.password.trim() || null

      let error = null

      if (!error && !code) error = "Please enter your code"
      if (!error && !newPassword) error = "Please enter your password"
      if (!error && missingsElementsPassword(newPassword).length > 0) {
        error = `Password must at least contain: ${missingsElementsPassword(newPassword).join(', ')}`
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

      notif.notify('Your password has been reset', 'success')

      this.clearTabFields('forgotPassword')
      this.clearTabFields('resetPassword')
      this.setAuthenticationTab('login')

      return true
    },

    logout(notify = true, redirect = '/auth') {
      this.authenticated = false
      this.user = {}
      this.token = null

      if (redirect) {
        router.push(redirect)
      }

      if (notify) {
        notif.clear()
        notif.notify('You have been logged out', 'info')
      }
    },
  },
})
