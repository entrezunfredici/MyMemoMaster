import { mapActions } from 'pinia'
import { useAuthStore } from '@/stores/auth'
export default {
    data() {
        return {
        email: "",
        password: "",
        errorMessage: "",
        };
    },
    methods: {
        ...mapActions(useAuthStore, ['login']),
        async submitForm() {
            this.errorMessage = ''
            try {
                await this.login(this.email, this.password, '/')
            } catch (e) {
                this.errorMessage = e?.response?.data?.message || e?.message || "Erreur lors de l'inscription."
            }
        },
    },
};