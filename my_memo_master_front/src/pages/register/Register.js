import { mapActions } from 'pinia'
import { useAuthStore } from '@/stores/auth'
export default {
    data() {
        return {
            name: "",
            email: "",
            password: "",
            confirmPassword: "",
            errorMessage: "",
            submitting: false,
        }
    },
    computed: {
        canSubmit() {
            return (
            /\S+@\S+\.\S+/.test(this.email) &&
            this.password?.length >= 6 &&
            this.password === this.confirmPassword
            )
        },
    },

    methods: {
        ...mapActions(useAuthStore, ['register']),
        async submitForm() {
            this.errorMessage = ''
            if (!this.canSubmit) {
                this.errorMessage = "Veuillez vérifier l'email et la correspondance des mots de passe (≥ 6 caractères)."
                return
            }
            this.submitting = true
            try {
                await this.register({ name: this.name, email: this.email, password: this.password })
            } catch (e) {
                this.errorMessage = e?.response?.data?.message || e?.message || "Erreur lors de l'inscription."
            } finally {
                this.submitting = false
            }
        },
    },
};