import { defineStore } from 'pinia'
import { notif } from '@/helpers/notif.js'
import router from '@/router'
import { api } from '@/helpers/api'
import { isValidEmail } from '@/helpers/functions.js'
import { isValidDate } from '@/helpers/functions.js'
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
            language: 'en-US',
            password: '',
            confirmPassword: '',
          },
          default: {
            name: '',
            email: '',
            language: 'en-US',
            password: '',
            confirmPassword: '',
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

      await api.get(`uusers/ser-infos/${this.user.userId}`).then(resp => {

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

    async updateUserInfos() {

      const userPayload = this.user
      delete userPayload.connectionToken
      delete userPayload.password

      await api.put(`uusers/ser-update/${this.user.userId}`, userPayload).then(resp => {

        if (resp.status === 'error') {
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

    async verifyEmail(email, token) {
      // TODO: WIP
      console.log('verifyEmail', email, token)
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

      this.clearTabFields('forgotPassword')

      // TODO: WIP
      console.log('forgotPassword', email)
    },

    async resetPassword() {
      const code = this.authentication.tabs.resetPassword.fields.code || null
      const password = this.authentication.tabs.resetPassword.fields.password.trim() || null
      const confirmPassword = this.authentication.tabs.resetPassword.fields.confirmPassword.trim() || null

      let error = null

      if (!error && !code) error = "Please enter your code"
      if (!error && !password) error = "Please enter your password"
      if (!error && !confirmPassword) error = "Please enter your password"
      if (!error && password !== confirmPassword) error = 'Passwords do not match'
      if (!error && missingsElementsPassword(password).length > 0) error = `Password must at least contain: ${missingsElementsPassword(password).join(', ')}`

      if (error) {
        notif.notify(error, 'error')
        return false
      }

      this.clearTabFields('resetPassword')

      // TODO: WIP
      console.log('reset password', code, password, confirmPassword)
    },

    async deleteAccount() {

      await api.del(`uusers/ser-delete/${this.user.userId}`).then(resp => {

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

      const name = this.authentication.tabs.register.fields.name.trim() || null
      const email = this.authentication.tabs.register.fields.email.trim() || null
      const language = this.authentication.tabs.register.fields.language || null
      const password = this.authentication.tabs.register.fields.password.trim() || null
      const confirmPassword = this.authentication.tabs.register.fields.confirmPassword.trim() || null

      let error = null

      if (!error && (!name || name.length === 0)) error = "Please enter your name"
      if (!error && (!language || language.length === 0)) error = "Please select your language"
      if (!error && (!email || email.length === 0)) error = "Please enter your email"
      if (!error && !isValidEmail(email)) error = "Please enter a valid email"
      if (!error && (!password || password.length === 0)) error = "Please enter your password"
      if (!error && (!confirmPassword || confirmPassword.length === 0)) error = "Please enter your password"
      if (!error && password !== confirmPassword) error = 'Passwords do not match'
      if (!error && missingsElementsPassword(password).length > 0) error = `Password must at least contain: ${missingsElementsPassword(password).join(', ')}`

      if (error) {
        notif.notify(error, 'error')
        return false
      }

      const user = {
        name,
        email,
        language,
        password,
      }

      await api.post('users/register', user).then(resp => {

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

      await api.post('users/login', { email, password }).then(resp => {

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