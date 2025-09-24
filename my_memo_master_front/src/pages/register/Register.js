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
        canSubmit() {
            const trimmedName = (this.name || '').trim()
            const trimmedEmail = (this.email || '').trim()
            const password = this.password || ''
            const confirmPassword = this.confirmPassword || ''
            const hasValidPassword = password.length >= 6
            return (
                trimmedName.length > 0 &&
                EMAIL_REGEX.test(trimmedEmail) &&
                hasValidPassword &&
                password === confirmPassword
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

            if (!trimmedName) {
                const message = 'Le nom est obligatoire.'
                fieldErrors.name = message
                errors.push(message)
            }
            if (!EMAIL_REGEX.test(trimmedEmail)) {
                fieldErrors.email = 'Format de courriel invalide.'
                errors.push("Le format de l'email est invalide.")
            }
            if (password.length < 6) {
                const message = 'Le mot de passe doit contenir au moins 6 caracteres.'
                fieldErrors.password = message
                errors.push('Le mot de passe doit faire au moins 6 caracteres.')
            }
            if (password !== confirmPassword) {
                const message = 'Les mots de passe ne correspondent pas.'
                fieldErrors.confirmPassword = message
                errors.push('Les mots de passe doivent etre identiques.')
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
