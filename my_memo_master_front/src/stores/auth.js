import { defineStore } from 'pinia'
import { notif } from '@/composables/notif.js'
import router from '@/router'
import { api } from '@/composables/api'
import { isValidEmail } from '@/composables/helpers.js'
import { isValidDate } from '@/composables/helpers.js'
import { missingsElementsPassword } from '@/composables/helpers.js'

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
            username: '',
            birthdate: '2000-01-01T00:00:00.000Z',
            email: '',
            language: 'en-US',
            password: '',
            confirmPassword: '',
            acceptTerms: false,
          },
          default: {
            username: '',
            birthdate: '2000-01-01T00:00:00.000Z',
            email: '',
            language: 'en-US',
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

        return true
      }).catch(error => {
        notif.notify(`An error occured: ${error}`, 'error')
        return false
      })
    },

    async updateUser(notify = false) {

      const username = this.user.username.trim() || null
      const birthdate = this.user.birthdate || null
      const language = this.user.language || null
      const homePageEnableSpents = this.user.homePageEnableSpents || false
      const homePageEnableStats = this.user.homePageEnableStats || false
      const homePageEnableQuote = this.user.homePageEnableQuote || false
      const homePageEnableLasts = this.user.homePageEnableLasts || false

      let error = null

      if (!error && (!username || username.length === 0)) error = "Please enter your username"
      if (!error && (!birthdate || birthdate.length === 0)) error = "Please enter your birthdate"
      if (!error && !isValidDate(birthdate)) error = "Please enter a valid birthdate"
      if (!error && (!language || language.length === 0)) error = "Please select your language"

      if (error) {
        notif.notify(error, 'error')
        return false
      }

      const user = {
        username,
        birthdate,
        language,
        homePageEnableSpents,
        homePageEnableStats,
        homePageEnableQuote,
        homePageEnableLasts,
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

    async deleteAccount() {

      await api.del(`user/${this.user.userId}`).then(resp => {

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

    async register() {

      this.logout(false)

      const username = this.authentication.tabs.register.fields.username.trim() || null
      const birthdate = this.authentication.tabs.register.fields.birthdate || null
      const email = this.authentication.tabs.register.fields.email.trim() || null
      const language = this.authentication.tabs.register.fields.language || null
      const password = this.authentication.tabs.register.fields.password.trim() || null
      const confirmPassword = this.authentication.tabs.register.fields.confirmPassword.trim() || null
      const acceptTerms = this.authentication.tabs.register.fields.acceptTerms || null

      let error = null

      if (!error && (!username || username.length === 0)) error = "Please enter your username"
      if (!error && (!birthdate || birthdate.length === 0)) error = "Please enter your birthdate"
      if (!error && !isValidDate(birthdate)) error = "Please enter a valid birthdate"
      if (!error && (!language || language.length === 0)) error = "Please select your language"
      if (!error && (!email || email.length === 0)) error = "Please enter your email"
      if (!error && !isValidEmail(email)) error = "Please enter a valid email"
      if (!error && (!password || password.length === 0)) error = "Please enter your password"
      if (!error && (!confirmPassword || confirmPassword.length === 0)) error = "Please enter your password"
      if (!error && password !== confirmPassword) error = 'Passwords do not match'
      if (!error && missingsElementsPassword(password).length > 0) error = `Password must at least contain: ${missingsElementsPassword(password).join(', ')}`
      if (!error && !acceptTerms) error = 'Please accept the terms and conditions'

      if (error) {
        notif.notify(error, 'error')
        return false
      }

      const user = {
        username,
        email,
        birthdate,
        language,
        password,
      }

      await api.post('register', user).then(resp => {

        if (resp.status !== 201) {
          notif.notify(resp.data.message, 'error')
          return false
        }

        notif.notify(`You have been registered`, 'success')

        this.clearTabFields('register')

        this.setAuthenticationTab('login')

        return true
      }).catch(error => {
        notif.notify(`An error occured: ${error}`, 'error')
        return false
      })
    },

    async login(redirect = '/') {

      const email = this.authentication.tabs.login.fields.email.trim() || null
      const password = this.authentication.tabs.login.fields.password.trim() || null

      let error = null

      if (!error && (!password || password.length === 0)) error = "Please enter your password"
      if (!error && email && email.length === 0) error = "Please enter your email"
      if (!error && !isValidEmail(email)) error = "Please enter a valid email"

      if (error) {
        notif.notify(error, 'error')
        return false
      }

      await api.post('login', { email, password }).then(resp => {

        if (resp.status !== 200) {
          notif.notify(resp.data.message, 'error')
          return false
        }

        this.user = resp.data.data
        this.token = resp.data.data.connectionToken
        this.authenticated = true

        notif.notify('You have been logged in', 'success')

        this.clearTabFields('login')

        return true
      }).catch(error => {
        notif.notify(`An error occured: ${error}`, 'error')
        return false
      })

      if (redirect) {
        router.push(redirect)
      }
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
},
)