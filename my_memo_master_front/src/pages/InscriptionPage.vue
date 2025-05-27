<template>
  <div class="flex h-screen w-full contenue border-radius-9px">
    <!-- Colonne de l'image (70%) - Cachée en mode mobile -->
    <div class="hidden md:block w-[70%] h-full bg-blue-500 custom-border border-radius-9px">
      <img src="../../public/inscription.png" alt="Connexion" class="w-full h-full object-cover no-underline border-radius-9px imageConnexion">
    </div>

    <!-- Colonne du formulaire (100% en mobile, 30% en desktop) -->
    <div class="w-full md:w-[30%] flex flex-col justify-center items-center bg-white px-8 md:px-16 border custom-border formulaire border-radius-9px ">
    <img src="../../public/logo/logo-full.svg" alt="logo" class="w-auto h-auto object-cover">
      <h2 class="text-primary text-[2rem] md:text-[3rem] neue-haas-grotesk-font font-bold">Inscription</h2>

      <form @submit.prevent="submitForm" class="w-full max-w-md mt-6 ">
        <div class="mb-4">
          <label class="block text-gray-700 no-underline">Email</label>
          <input type="email" v-model="email" required class="w-full mt-1 p-3 no-underline border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none">
        </div>

        <div class="mb-4">
          <label class="block text-gray-700 no-underline">Mot de passe</label>
          <input type="password" v-model="password" required class="w-full mt-1 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none">
        </div>
        <div class="mb-4">
            <label class="block text-gray-700 no-underline">Confirmer le mot de passe</label>
            <input type="password" v-model="confirmPassword" required
              class="w-full mt-1 p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none">
          </div>

       

        <div class="flex flex-col items-center m-2">
       
       <button type="submit" class="w-[116px] bg-[#1E3BA1] text-white !text-white hover:bg-[#162c7a] focus:outline-none py-2 px-4 rounded valider">
              Valider
            </button>
            <a href="" class="underline m-3">Vous avez déjà un compte? Connectez-vous!
            </a>
            <p v-if="errorMessage" class="text-red-500 text-sm text-center mt-2">
              {{ errorMessage }}
            </p>
    </div>
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
.valider{
  color: white
}
.contenue{
background-color: #1E3BA1;
border-radius: 50px;
}
.formulaire{
  background-color: white;
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