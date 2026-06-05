import { mapActions } from 'pinia'
import { useAuthStore } from '@/stores/auth'
export default {
    data() {
        return {
            email: "",
            password: "",
            errorMessage: "",
            submitting: false,
        };
    },
    methods: {
        ...mapActions(useAuthStore, ['login']),
        async submitForm() {
            this.errorMessage = ''
            this.submitting = true
            try {
                const success = await this.login(this.email, this.password, '/')
                if (!success) {
                    this.errorMessage = "Email ou mot de passe incorrect."
                }
            } catch (e) {
                this.errorMessage = e?.message || "Erreur lors de la connexion."
            } finally {
                this.submitting = false
            }
        },
    },
};