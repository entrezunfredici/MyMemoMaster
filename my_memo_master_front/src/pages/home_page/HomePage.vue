<template>
  <section class="home-menu">
    <h2 class="home-menu__title">Accueil</h2>

    <div class="home-menu__divider" />

    <nav class="home-menu__grid" aria-label="Menu principal">
      <RouterLink v-for="item in menuItems" :key="item.label" :to="item.to" class="menu-card"
        :style="{ '--card-color': item.color }">
        <component :is="item.icon" class="menu-card__icon" />
        <span class="menu-card__label">{{ item.label }}</span>
      </RouterLink>
    </nav>
  </section>
</template>

<style scoped src="./home_page.css"></style>
<script src="./home_page.js"></script>
