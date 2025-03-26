<template>
    <div class="flex h-screen w-full bg-blue-500">
      <!-- Colonne de l'image (70%) - Cachée en mode mobile -->
      <div class="hidden md:block w-[70%] h-full bg-blue-500">
        <img src="../../public/connexion.png" alt="Connexion" class="w-full h-full object-cover">
      </div>
  
      <!-- Colonne du formulaire (100% en mobile, 30% en desktop) -->
      <div class="w-full md:w-[30%] flex flex-col justify-center items-center bg-white px-8 md:px-16 border border-blue-900 ">
        <img src="../../public/logo/logo-full.svg" alt="logo" class="w-auto h-auto object-cover">
        <h2 class="text-primary text-[3rem] md:text-[4rem] neue-haas-grotesk-font font-bold">Connexion</h2>
  
        <form @submit.prevent="submitForm" class="w-full max-w-md mt-6">
          <div class="mb-4">
            <label class="block text-gray-700">Email</label>
            <input type="email" v-model="email" required class="w-full mt-1 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none">
          </div>
  
          <div class="mb-4">
            <label class="block text-gray-700">Mot de passe</label>
            <input type="password" v-model="password" required class="w-full mt-1 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none">
          </div>
  
          <a href="#" class="text-sm text-blue-600">Mot de passe oublié ?</a>
  
          <button type="submit" class="w-full bg-blue-800 text-white py-3 rounded-lg hover:bg-blue-600 transition mt-4">
            Valider
          </button>
  
          <p v-if="errorMessage" class="text-red-500 text-sm text-center mt-2">
            {{ errorMessage }}
          </p>
        </form>
      </div>
    </div>
  </template>
  
  <script>
  export default {
    data() {
      return {
        email: "",
        password: "",
        errorMessage: "",
      };
    },
    methods: {
      submitForm() {
        alert("Connexion réussie !");
      },
    },
  };
  </script>
  