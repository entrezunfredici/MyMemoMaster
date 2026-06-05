import { mapActions } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import { notif } from '@/helpers/notif.js'

const EMAIL_REGEX = /\S+@\S+\.\S+/

export default {
    data() {
        return {
            name: '',
            email: '',
            password: '',
            confirmPassword: '',
            errorMessage: '',
            submitting: false,
            fieldErrors: {},
        }
    },
    computed: {
        passwordStrengthError() {
            const p = this.password || ''
            if (p.length < 10) return 'Le mot de passe doit contenir au moins 10 caractères.'
            if (!/[A-Z]/.test(p)) return 'Le mot de passe doit contenir au moins une majuscule.'
            if (!/[0-9]/.test(p)) return 'Le mot de passe doit contenir au moins un chiffre.'
            return null
        },
        canSubmit() {
            const trimmedName = (this.name || '').trim()
            const trimmedEmail = (this.email || '').trim()
            return (
                trimmedName.length >= 2 &&
                EMAIL_REGEX.test(trimmedEmail) &&
                !this.passwordStrengthError &&
                this.password === this.confirmPassword
            )
        },
    },

    methods: {
        ...mapActions(useAuthStore, ['register']),
        collectValidationErrors() {
            const errors = []
            const fieldErrors = {}
            const trimmedName = (this.name || '').trim()
            const trimmedEmail = (this.email || '').trim()
            const password = this.password || ''
            const confirmPassword = this.confirmPassword || ''

            if (trimmedName.length < 2) {
                const message = 'Le nom doit contenir au moins 2 caractères.'
                fieldErrors.name = message
                errors.push(message)
            }
            if (!EMAIL_REGEX.test(trimmedEmail)) {
                fieldErrors.email = 'Format de courriel invalide.'
                errors.push("Le format de l'email est invalide.")
            }
            if (this.passwordStrengthError) {
                fieldErrors.password = this.passwordStrengthError
                errors.push(this.passwordStrengthError)
            }
            if (password !== confirmPassword) {
                const message = 'Les mots de passe ne correspondent pas.'
                fieldErrors.confirmPassword = message
                errors.push(message)
            }

            return { errors, fieldErrors }
        },
        async submitForm() {
            this.errorMessage = ''
            const { errors, fieldErrors } = this.collectValidationErrors()
            this.fieldErrors = fieldErrors

            if (errors.length) {
                this.errorMessage = errors.join(' ')
                notif.notify(this.errorMessage, 'error')
                return
            }

            this.submitting = true
            this.fieldErrors = {}
            try {
                await this.register({ name: this.name.trim(), email: this.email.trim(), password: this.password })
            } catch (e) {
                const message = e?.response?.data?.message || e?.message || "Erreur lors de l'inscription."
                this.errorMessage = message
                notif.notify(message, 'error')
            } finally {
                this.submitting = false
            }
        },
    },
}
