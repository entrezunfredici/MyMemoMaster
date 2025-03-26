<template>
    <div>
        <div class="flex flex-col items-center justify-center space-y-4 mt-4 mx-4">
            <input v-model="authStore.authentication.tabs.login.fields.email" id="email" type="email" class="w-full px-4 p-2 rounded-lg bg-gray-dark text-light"
                placeholder="Email" />
            <input v-model="authStore.authentication.tabs.login.fields.password" id="password" type="password"
                class="w-full px-4 p-2 rounded-lg bg-gray-dark text-light" placeholder="Password" />
        </div>
        <div class="flex flex-row-reverse align-items-center justify-between m-4">
            <button class="text-light transition-colors duration-200 hover:text-gray-light cursor-pointer"
                @click="authStore.setAuthenticationTab('forgotPassword')">Forgot password ?</button>
        </div>
        <div class="flex flex-col md:flex-row-reverse items-center justify-center md:justify-around gap-4 mt-8 md:m-6">
            <button
                class="bg-dark-light text-light p-2 rounded-lg cursor-pointer hover:bg-gray-dark transition-colors duration-200"
                @click="authStore.login()">
                <span class="mx-2 my-0.5">Login</span>
            </button>
            <hr class="block md:hidden w-1/3" />
            <button class="text-light p-2 rounded-lg cursor-pointer hover:bg-dark-light transition-colors duration-200"
                @click="authStore.setAuthenticationTab('register')">
                <span class="mx-2 my-0.5">Register</span>
            </button>
        </div>
    </div>
</template>

<script setup>
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
                authStore.login()
            }
        })
    }
})
</script>