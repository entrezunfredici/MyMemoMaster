<template>
  <section class="profile">

    <!-- Informations personnelles -->
    <div class="profile__card">
      <h2 class="profile__title">Informations personnelles</h2>
      <div class="profile__info-grid">
        <div class="profile__info-row">
          <span class="profile__info-label">Nom</span>
          <span class="profile__info-value">{{ authStore.user.name ?? '—' }}</span>
        </div>
        <div class="profile__info-row">
          <span class="profile__info-label">Email</span>
          <span class="profile__info-value">{{ authStore.user.email ?? '—' }}</span>
        </div>
        <div class="profile__info-row">
          <span class="profile__info-label">Rôle</span>
          <span class="profile__info-value profile__badge">{{ roleLabel }}</span>
        </div>
      </div>
    </div>

    <!-- Modifier le profil -->
    <div class="profile__card">
      <h2 class="profile__title">Modifier le profil</h2>
      <form @submit.prevent="saveProfile" class="profile__form">
        <div class="profile__field">
          <label for="profile-name">Nom</label>
          <input
            id="profile-name"
            v-model="form.name"
            type="text"
            minlength="2"
            maxlength="50"
            required
          />
        </div>
        <div class="profile__field">
          <label for="profile-email">Email</label>
          <input
            id="profile-email"
            v-model="form.email"
            type="email"
            required
          />
        </div>
        <button type="submit" class="profile__btn" :disabled="savingProfile">
          {{ savingProfile ? 'Enregistrement...' : 'Enregistrer' }}
        </button>
      </form>
    </div>

    <!-- Sécurité -->
    <div class="profile__card">
      <h2 class="profile__title">Sécurité</h2>
      <form @submit.prevent="changePassword" class="profile__form">
        <div class="profile__field">
          <label for="old-password">Ancien mot de passe</label>
          <input
            id="old-password"
            v-model="security.oldPassword"
            type="password"
            required
          />
        </div>
        <div class="profile__field">
          <label for="new-password">Nouveau mot de passe</label>
          <input
            id="new-password"
            v-model="security.newPassword"
            type="password"
            required
          />
        </div>
        <div class="profile__field">
          <label for="confirm-password">Confirmer le nouveau mot de passe</label>
          <input
            id="confirm-password"
            v-model="security.confirmPassword"
            type="password"
            required
          />
        </div>
        <p v-if="passwordError" class="profile__error">{{ passwordError }}</p>
        <button type="submit" class="profile__btn" :disabled="savingPassword">
          {{ savingPassword ? 'Modification...' : 'Changer le mot de passe' }}
        </button>
      </form>
    </div>

    <!-- Déconnexion -->
    <div class="profile__card profile__card--row">
      <div>
        <p class="profile__deconnect-label">Déconnexion</p>
        <p class="profile__deconnect-hint">Terminer votre session sur cet appareil.</p>
      </div>
      <button class="profile__btn profile__btn--danger" @click="authStore.logout()">
        Se déconnecter
      </button>
    </div>

  </section>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { api } from '@/helpers/api'
import { notif } from '@/helpers/notif'
import { missingsElementsPassword } from '@/helpers/functions'

const authStore = useAuthStore()

const ROLE_LABELS = {
  1: 'Admin plateforme',
  2: 'Étudiant',
  3: 'Enseignant',
  4: 'Admin établissement',
  5: 'Modérateur',
}

const roleLabel = computed(() => ROLE_LABELS[authStore.user?.roleId] ?? 'Inconnu')

const form = ref({ name: '', email: '' })
const savingProfile = ref(false)

const security = ref({ oldPassword: '', newPassword: '', confirmPassword: '' })
const savingPassword = ref(false)
const passwordError = ref('')

onMounted(async () => {
  await authStore.fetchUserInfos()
  form.value.name = authStore.user.name ?? ''
  form.value.email = authStore.user.email ?? ''
})

async function saveProfile() {
  savingProfile.value = true
  const resp = await api.put(`users/${authStore.user.userId}`, {
    name: form.value.name,
    email: form.value.email,
  })
  savingProfile.value = false

  if (!resp || resp.status !== 200) {
    notif.notify(resp?.data?.message || 'Erreur lors de la mise à jour.', 'error')
    return
  }

  authStore.user = { ...authStore.user, ...resp.data }
  notif.notify('Profil mis à jour avec succès.', 'success')
}

async function changePassword() {
  passwordError.value = ''

  if (security.value.newPassword !== security.value.confirmPassword) {
    passwordError.value = 'Les mots de passe ne correspondent pas.'
    return
  }

  const missing = missingsElementsPassword(security.value.newPassword)
  if (missing.length > 0) {
    passwordError.value = `Le mot de passe doit contenir : ${missing.join(', ')}`
    return
  }

  savingPassword.value = true
  const resp = await api.put(`users/${authStore.user.userId}/change-password`, {
    id: authStore.user.userId,
    oldPassword: security.value.oldPassword,
    newPassword: security.value.newPassword,
  })
  savingPassword.value = false

  if (!resp || resp.status !== 200) {
    notif.notify(resp?.data?.message || 'Erreur lors du changement de mot de passe.', 'error')
    return
  }

  notif.notify('Mot de passe modifié avec succès.', 'success')
  security.value = { oldPassword: '', newPassword: '', confirmPassword: '' }
}
</script>

<style scoped>
.profile {
  max-width: 680px;
  margin: 0 auto;
  padding: 32px 16px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.profile__card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 24px;
}

.profile__card--row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.profile__title {
  font-size: 1.1rem;
  font-weight: 600;
  color: #1E3BA1;
  margin-bottom: 16px;
}

.profile__info-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.profile__info-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.profile__info-label {
  font-weight: 500;
  color: #374151;
  min-width: 60px;
}

.profile__info-value {
  color: #6b7280;
}

.profile__badge {
  background: #eff2fb;
  color: #1E3BA1;
  font-size: 0.8rem;
  font-weight: 600;
  padding: 2px 10px;
  border-radius: 999px;
}

.profile__form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.profile__field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.profile__field label {
  font-size: 0.9rem;
  color: #374151;
}

.profile__field input {
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.95rem;
  outline: none;
  transition: border-color 0.15s;
}

.profile__field input:focus {
  border-color: #1E3BA1;
  box-shadow: 0 0 0 2px rgba(30, 59, 161, 0.15);
}

.profile__btn {
  align-self: flex-start;
  background: #1E3BA1;
  color: #fff;
  border: none;
  padding: 10px 24px;
  border-radius: 8px;
  font-size: 0.95rem;
  cursor: pointer;
  transition: background 0.15s;
}

.profile__btn:hover:not(:disabled) {
  background: #162c7a;
}

.profile__btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.profile__btn--danger {
  align-self: auto;
  white-space: nowrap;
}

.profile__error {
  font-size: 0.85rem;
  color: #dc2626;
}

.profile__deconnect-label {
  font-weight: 500;
  color: #1f2937;
}

.profile__deconnect-hint {
  font-size: 0.85rem;
  color: #6b7280;
  margin-top: 2px;
}
</style>
