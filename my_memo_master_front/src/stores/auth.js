import { defineStore } from 'pinia'
import { notif } from '@/helpers/notif.js'
import router from '@/router'
import { api } from '@/helpers/api'

export const useAuthStore = defineStore('auth', 
  {
    persist: true,
    state: () => ({
      authenticated: false,
      token: null,
      user: {},
      fogotPasswordEmail: '',
    }),

    actions: {
      async fetchUserInfos() {

        await api.get(`users/${this.user.userId}`).then(resp => {

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

      async verifyEmail(email, token) {
        // TODO: WIP
        console.log('verifyEmail', email, token)
      },

      async forgotPassword(email) {
        // TODO: WIP
        console.log('forgotPassword', email)
      },

      async resetPassword(code, newPassword, email = this.fogotPasswordEmail) {
        // TODO: WIP
        console.log('resetPassword', code, newPassword, email)
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

