<template>
  <div>
    <section>Salut salut</section>
    <section>
      <DiagramTest />
    </section>
    <section>
      <h2>Test de l'Interpréteur</h2>
      <!-- Zone de saisie pour tester -->
      <textarea
        v-model="userInput"
        placeholder="Écrivez votre contenu ici..."
        rows="5"
        cols="50"
      ></textarea>

      <!-- Affichage du résultat interprété -->
      <h3>Résultat :</h3>
      <Interpreter :content="userInput" />
    </section>
  </div>
</template>

<script setup>
import DiagramTest from '@/components/DiagramTestComponent.vue'
import Interpreter from '@/components/Interpreter.vue'
import { ref } from 'vue'

// Texte saisi par l'utilisateur
const userInput = ref(`
<text bold color:red>Texte de test</text>
<formula>\\frac{a}{b} + \\sqrt{x^2 + y^2}</formula>
`)
</script>

<style scoped>
textarea {
  width: 100%;
  margin-bottom: 20px;
  background-color: #f0f0f0; /* Couleur de fond */
  color: #333333; /* Couleur du texte */
  border: 1px solid #ccc; /* Bordure grise */
  padding: 10px; /* Espacement intérieur */
  font-size: 14px; /* Taille de police */
}
</style>
