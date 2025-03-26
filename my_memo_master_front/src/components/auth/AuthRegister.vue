<template>
    <div>
        <div class="flex flex-col items-center justify-center space-y-4 mt-4 mx-4">
            <input v-model="authStore.authentication.tabs.register.fields.username" id="username" type="text"
                class="w-full px-4 p-2 rounded-lg bg-gray-dark text-light" placeholder="Username" />
            <input v-model="authStore.authentication.tabs.register.fields.email" id="email" type="email"
                class="w-full px-4 p-2 rounded-lg bg-gray-dark text-light" placeholder="Email" />
            <select v-model="authStore.authentication.tabs.register.fields.language" id="language"
                class="w-full px-4 p-2 rounded-lg bg-gray-dark text-light">
                <option value="" disabled selected>Language</option>
                <option v-for="(value, key) in languages" :key="key" :value="key">{{ value?.label }}</option>
            </select>
            <hr class="w-full" />
            <input v-model="authStore.authentication.tabs.register.fields.password" id="password" type="password"
                class="w-full px-4 p-2 rounded-lg bg-gray-dark text-light" placeholder="Password" />
            <input v-model="authStore.authentication.tabs.register.fields.confirmPassword" id="confirmPassword"
                type="password" class="w-full px-4 p-2 rounded-lg bg-gray-dark text-light"
                placeholder="Confirm password" />
            <PasswordStrength
                :password="authStore.authentication.tabs.register.fields.password || authStore.authentication.tabs.register.fields.confirmPassword || ''" />
            <label class="flex flex-start space-x-2">
                <input v-model="authStore.authentication.tabs.register.fields.acceptTerms" id="acceptTerms"
                    type="checkbox" />
                <span class="text-light">I accept the <router-link to="/terms-and-conditions"
                        class="text-light text-primary">terms
                        and
                        conditions</router-link></span>
            </label>
        </div>
        <div class="flex flex-row-reverse align-items-center justify-between m-4">
            <button class="text-light transition-colors duration-200 hover:text-gray-light cursor-pointer"
                @click="authStore.setAuthenticationTab('forgotPassword')">Forgot password ?</button>
        </div>
        <div class="flex flex-col md:flex-row-reverse items-center justify-center md:justify-around gap-4 mt-8 md:m-6">
            <button
                class="bg-dark-light text-light p-2 rounded-lg cursor-pointer transition-colors duration-200 hover:bg-dark-light"
                @click="authStore.register()">
                <span class="mx-2 my-0.5">Register</span>
            </button>
            <hr class="block md:hidden w-1/3" />
            <button class="text-light p-2 rounded-lg cursor-pointer transition-colors duration-200 hover:bg-gray-dark"
                @click="authStore.setAuthenticationTab('login')">
                <span class="mx-2 my-0.5">Login</span>
            </button>
        </div>
    </div>
</template>

<script setup>
import PasswordStrength from '@/components/PasswordStrengthComponent.vue'
import { languages } from '@/lang/languages.js'
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
                authStore.register()
            }
        })
    }
})
</script>