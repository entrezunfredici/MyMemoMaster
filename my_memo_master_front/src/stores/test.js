import { defineStore } from 'pinia'
import { notif } from '@/helpers/notif.js'
import { api } from '@/helpers/api'

export const useTestStore = defineStore('tests', {
  state: () => ({
    test: {},
    tests: []
  }),
  actions: {
    async fetchTests() {
      try {
        const resp = await api.get('tests/all')
        if (resp.status !== 200 && resp.status !== 201) {
          notif.notify(resp.data.message, 'error')
          return false
        }
        this.tests = resp.data
        return true
      } catch (error) {
        notif.notify(`An error occurred: ${error}`, 'error')
        return false
      }
    },

    async fetchTestById(id) {
      try {
        const resp = await api.get(`tests/${id}`)
        if (resp.status !== 200) {
          notif.notify(resp.data.message, 'error')
          return false
        }
        this.test = resp.data
        return true
      } catch (error) {
        notif.notify(`An error occurred: ${error}`, 'error')
        return false
      }
    },

    async addTest() {
      try {
        const resp = await api.post('tests/add', this.test)
        if (resp.status !== 201) {
          notif.notify(resp.data.message, 'error')
          return false
        }
        notif.notify('Test has been added', 'success')
        return true
      } catch (error) {
        notif.notify(`An error occurred: ${error}`, 'error')
        return false
      }
    },

    async updateTest(id) {
      try {
        const resp = await api.put(`tests/${id}`, this.test)
        if (resp.status !== 200) {
          notif.notify(resp.data.message, 'error')
          return false
        }
        notif.notify('Test has been updated', 'success')
        return true
      } catch (error) {
        notif.notify(`An error occurred: ${error}`, 'error')
        return false
      }
    },

    async deleteTest(id) {
      try {
        const resp = await api.del(`tests/${id}`)
        if (resp.status !== 200 && resp.status !== 204) {
          notif.notify(resp.data.message, 'error')
          return false
        }
        notif.notify('Test has been deleted', 'success')
        return true
      } catch (error) {
        notif.notify(`An error occurred: ${error}`, 'error')
        return false
      }
    }
  }
})
