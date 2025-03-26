<template>
    <div>
        <div class="flex flex-col items-center justify-center space-y-4 mt-4 mx-4">
            <input v-model="authStore.authentication.tabs.resetPassword.fields.code" id="code" type="text"
                class="w-full px-4 p-2 rounded-lg bg-gray-dark text-light" placeholder="Code" />
            <input v-model="authStore.authentication.tabs.resetPassword.fields.password" id="password" type="password"
                class="w-full px-4 p-2 rounded-lg bg-gray-dark text-light" placeholder="Password" />
            <input v-model="authStore.authentication.tabs.resetPassword.fields.confirmPassword" id="confirmPassword"
                type="password" class="w-full px-4 p-2 rounded-lg bg-gray-dark text-light"
                placeholder="Confirm password" />
            <PasswordStrength
                :password="authStore.authentication.tabs.resetPassword.fields.password || authStore.authentication.tabs.resetPassword.fields.confirmPassword || ''" />
        </div>
        <div class="flex flex-row-reverse align-items-center justify-between m-4">
            <button class="text-light transition-colors duration-200 hover:text-gray-light cursor-pointer"
                @click="authStore.setAuthenticationTab('forgotPassword')">Back</button>
        </div>
        <div class="flex flex-col md:flex-row-reverse items-center justify-center md:justify-around gap-4 mt-8 md:m-6">
            <button
                class="bg-dark-light text-light p-2 rounded-lg cursor-pointer transition-colors duration-200 hover:bg-dark-light"
                @click="authStore.resetPassword()">
                <span class="mx-2 my-0.5">Send</span>
            </button>
        </div>
    </div>
</template>

<script setup>
import PasswordStrength from '@/components/PasswordStrengthComponent.vue'
import { useAuthStore } from '@/stores/auth'
import { onMounted } from 'vue'
import { isMobile } from '@/helpers/functions.js'

const authStore = useAuthStore()

onMounted(() => {
    // Add shortcuts
    if (!isMobile()) {
        window.addEventListener('keydown', (e) => {
            // Enter to trigger main action
            if (e.key === 'Enter') {
                authStore.resetPassword()
            }
        })
    }
})
</script>