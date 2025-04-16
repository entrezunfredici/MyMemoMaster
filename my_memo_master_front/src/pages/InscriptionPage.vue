<template>
  <div class="flex h-screen w-full bg-blue-500 contenue">
    <!-- Colonne de l'image (70%) - Cachée en mode mobile -->
    <div class="hidden md:block w-[70%] h-full bg-blue-500 custom-border ">
      <img src="../../public/inscription.png" alt="Connexion" class="w-full h-full object-cover no-underline border-radius-9px imageConnexion">
    </div>

    <!-- Colonne du formulaire (100% en mobile, 30% en desktop) -->
    <div class="w-full md:w-[30%] flex flex-col justify-center items-center bg-white px-8 md:px-16 border border-[#1E3BA1] underline custom-border ">
    <img src="../../public/logo/logo-full.svg" alt="logo" class="w-auto h-auto object-cover">
      <h2 class="text-primary text-[2rem] md:text-[3rem] neue-haas-grotesk-font font-bold">Inscription</h2>

      <form @submit.prevent="submitForm" class="w-full max-w-md mt-6">
        <div class="mb-4">
          <label class="block text-gray-700">Email</label>
          <input type="email" v-model="email" required class="w-full mt-1 p-3 no-underline border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none">
        </div>

        <div class="mb-4">
          <label class="block text-gray-700">Mot de passe</label>
          <input type="password" v-model="password" required class="w-full mt-1 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none">
        </div>
        <div class="mb-4">
            <label class="block text-gray-700">Confirmer le mot de passe</label>
            <input type="password" v-model="confirmPassword" required
              class="w-full mt-1 p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none">
          </div>

        <a href="#" class="text-sm text-blue-600">Mot de passe oublié ?</a>

        <button type="submit" class="w-full bg-blue-800 text-white py-3 rounded-lg hover:bg-blue-600 transition mt-4">
          Valider
        </button>
        <a href="" class="underline">Vous avez déjà un compte? Connectez-vous!
        </a>
        <p v-if="errorMessage" class="text-red-500 text-sm text-center mt-2">
          {{ errorMessage }}
        </p>
      </form>
    </div>
  </div>
</template>
<style scoped>
.custom-border {
  border: thick solid #1E3BA1;
  border-radius: 18px;
}
.imageConnexion {
  border-radius: 9px;
}
</style>
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