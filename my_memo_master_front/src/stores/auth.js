import { defineStore } from 'pinia'
import { notif } from '@/helpers/notif.js'
import router from '@/router'
import { api } from '@/helpers/api'
import { isValidEmail } from '@/helpers/functions.js'
import { missingsElementsPassword } from '@/helpers/functions.js'

export const useAuthStore = defineStore('auth', {
  persist: true,
  state: () => ({
    authentication: {
      tab: 'login',
      tabs: {
        login: {
          fields: {
            email: '',
            password: ''
          },
          default: {
            email: '',
            password: ''
          }
        },
        register: {
          fields: {
            name: '',
            email: '',
            password: '',
            confirmPassword: '',
            acceptTerms: false,
          },
          default: {
            name: '',
            email: '',
            password: '',
            confirmPassword: '',
            acceptTerms: false,
          }
        },
        forgotPassword: {
          fields: {
            email: ''
          },
          default: {
            email: ''
          }
        },
        resetPassword: {
          fields: {
            code: null,
            password: '',
            confirmPassword: '',
          },
          default: {
            code: null,
            password: '',
            confirmPassword: '',
          }
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

      await api.get(`user/${this.user.userId}`).then(resp => {

        if (resp.status !== 200) {
          notif.notify(resp.data.message, 'error')
          return false
        }

        this.user = resp.data.data
        this.token = resp.data.data.connectionToken
        this.authenticated = true

        return true
      }).catch(error => {
        notif.notify(`An error occured: ${error}`, 'error')
        return false
      })
    },

    async updateUserInfos() {

      const userPayload = this.user
      delete userPayload.connectionToken
      delete userPayload.password

      await api.put(`user-update/${this.user.userId}`, userPayload).then(resp => {

        if (resp.status === 200) {
          notif.notify(resp.data.message, 'error')
          return false
        }

        // notif.notify('Your informations have been updated', 'success')

        return true
      }).catch(error => {
        notif.notify(`An error occured: ${error}`, 'error')
        return false
      })
    },

    async deleteAccount() {

      await api.del(`user-delete/${this.user.userId}`).then(resp => {

        if (resp.status !== 200) {
          notif.notify(resp.data.message, 'error')
          return false
        }

        this.logout()

        return true
      }).catch(error => {
        notif.notify(`An error occured: ${error}`, 'error')
        return false
      })
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

      await api.post('users/login', { email: email, password: password }).then(resp => {

        if (resp.status !== 200) {
          notif.notify(resp.data.message, 'error')
          return false
        }

        this.token = resp.data.token
        this.authenticated = true

        notif.notify('You have been logged in', 'success')

        return true
      }).catch(error => {
        notif.notify(`An error occured: ${error}`, 'error')
        return false
      })
      if (redirect) {
        router.push(redirect)
      }
    },

    async updateUser(notify = false) {

      const name = this.user.name.trim() || null

      let error = null

      if (!error && (!name || name.length === 0)) error = "Please enter your name"

      if (error) {
        notif.notify(error, 'error')
        return false
      }

      const user = {
        name,
      }

      await api.put(`user/${this.user.userId}`, user).then(resp => {

        if (resp.status !== 200) {
          notif.notify(resp.data.message, 'error')
          return false
        } else if (notify) {
          notif.notify('Your informations have been updated', 'success')
        }

        return true
      }).catch(error => {
        notif.notify(`An error occured: ${error}`, 'error')
        return false
      })
    },

    async verifyEmail(email, token, notify = true) {
      let error = null

      if (!error && (!token || token.length === 0)) error = "No token provided"
      if (!error && (!email || email.length === 0)) error = "No email provided"
      if (!error && !isValidEmail(email)) error = "The email is not valid"

      if (error) {
        notif.notify(error, 'error')
        return false
      }

      await api.post(`verify-email`, { email, token, }).then(resp => {

        if (resp.status !== 200) {
          notif.notify(resp.data.message, 'error')
          return false
        } else if (notify) {
          notif.notify('Your email has been verified', 'success')
        }

        return true
      }).catch(error => {
        notif.notify(`An error occured: ${error}`, 'error')
        return false
      })
    },

    async forgotPassword() {
      const email = this.authentication.tabs.forgotPassword.fields.email.trim() || null

      let error = null

      if (!error && !email) error = "Please enter your email"
      if (!error && !isValidEmail(email)) error = "Please enter a valid email"

      if (error) {
        notif.notify(error, 'error')
        return false
      }

      await api.post('forgot-password', { email }).then(resp => {

        if (resp.status !== 200) {
          notif.notify(resp.data.message, 'error')
          return false
        }

        notif.notify(`An email has been sent with a code`, 'success')

        this.setAuthenticationTab('resetPassword')

        return true
      }).catch(error => {
        notif.notify(`An error occured: ${error}`, 'error')
        return false
      })
    },

    async resetPassword() {
      const code = this.authentication.tabs.resetPassword.fields.code || null
      const password = this.authentication.tabs.resetPassword.fields.password.trim() || null

      let error = null

      if (!error && !code) error = "Please enter your code"
      if (!error && !password) error = "Please enter your password"
      if (!error && missingsElementsPassword(password).length > 0) error = `Password must at least contain: ${missingsElementsPassword(password).join(', ')}`

      if (error) {
        notif.notify(error, 'error')
        return false
      }

      const email = this.authentication.tabs.forgotPassword.fields.email.trim() || null

      await api.post('reset-password', { email, code, password }).then(resp => {

        if (resp.status !== 200) {
          notif.notify(resp.data.message, 'error')
          return false
        }

        notif.notify('Your password has been reset', 'success')

        this.clearTabFields('forgotPassword')
        this.clearTabFields('resetPassword')

        this.setAuthenticationTab('login')

        return true
      }).catch(error => {
        notif.notify(`An error occured: ${error}`, 'error')
        return false
      });
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

