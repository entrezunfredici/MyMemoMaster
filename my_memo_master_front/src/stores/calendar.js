import { ref, computed } from 'vue'

export const MONTHS = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre'
]

export const DAYS_SHORT = ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di']

export const EVENT_LABELS = {
  flashcard: 'Flashcards',
  controle: 'Contrôle',
  devoir: 'Devoir',
  revision: 'Révision',
  cours: 'Cours'
}

export const EVENT_COLORS = {
  flashcard: 'blue',
  controle: 'red',
  devoir: 'amber',
  revision: 'green',
  cours: 'purple'
}

/* ── Helpers date ── */
export function getDaysInMonth(y, m) {
  return new Date(y, (((m % 12) + 12) % 12) + 1, 0).getDate()
}

export function getFirstDay(y, m) {
  const d = new Date(y, m, 1).getDay()
  return d === 0 ? 6 : d - 1
}

export function eventKey(y, m, d) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

/* ── Données factices (à remplacer par un appel API) ── */
function buildFakeEvents() {
  const today = new Date()
  const y = today.getFullYear()
  const m = today.getMonth()
  const td = today.getDate()
  const ev = {}

  // Événements relatifs au mois courant
  const add = (d, type, title, meta) => {
    const key = eventKey(y, m, d)
    if (!ev[key]) ev[key] = []
    ev[key].push({ type, title, meta: meta || null, color: EVENT_COLORS[type] })
  }

  const clamp = (d) => Math.min(Math.max(d, 1), getDaysInMonth(y, m))

  add(td, 'flashcard', 'Maths — Trigonométrie', '15 cartes · 08h30')
  add(td, 'revision', 'Révision Histoire', 'Chapitres 4 & 5')
  add(clamp(td - 3), 'controle', 'Contrôle Physique', 'Note : 14/20')
  add(clamp(td - 3), 'devoir', 'Devoir Français', 'Dissertation rendue')
  add(clamp(td - 1), 'cours', 'Cours SVT', 'Salle B12 · 10h00')
  add(clamp(td - 1), 'flashcard', 'Anglais Vocabulaire', '22 cartes · 17h00')
  add(clamp(td + 2), 'controle', 'Contrôle Maths', 'Algèbre linéaire')
  add(clamp(td + 2), 'devoir', 'TP Chimie', 'À rendre en ligne')
  add(clamp(td + 4), 'revision', 'Révision Philo', 'Fiche résumé')
  add(clamp(td + 4), 'cours', 'Cours Éco', 'Marché du travail')
  add(clamp(td + 5), 'devoir', 'Exposé Histoire', 'Révolution industrielle')
  add(clamp(td + 7), 'controle', 'Exam Anglais', 'Compréhension orale')
  add(clamp(td + 7), 'flashcard', 'Latin Vocabulaire', '30 cartes')
  add(clamp(td + 10), 'cours', 'Cours Informatique', 'Algo & structures')
  add(clamp(td + 10), 'flashcard', 'Philo — Citations', '18 cartes')

  // Événements fixes sur un mois donné
  const addFixed = (fixedM, d, type, title, meta) => {
    const key = eventKey(y, fixedM, d)
    if (!ev[key]) ev[key] = []
    ev[key].push({ type, title, meta: meta || null, color: EVENT_COLORS[type] })
  }

  // ── Juin (mois 5) ──
  addFixed(5, 2, 'cours', 'Cours Maths', 'Dérivées & intégrales')
  addFixed(5, 3, 'flashcard', 'Flashcards Chimie', '20 cartes · 09h00')
  addFixed(5, 5, 'devoir', 'Devoir Physique', 'Exercices p.142-145')
  addFixed(5, 9, 'controle', 'Contrôle Histoire-Géo', 'Chapitres 6 à 9')
  addFixed(5, 9, 'revision', 'Révision Anglais', 'Grammaire avancée')
  addFixed(5, 10, 'cours', 'Cours Philo', 'Salle A03 · 14h00')
  addFixed(5, 12, 'flashcard', 'SVT — Génétique', '25 cartes')
  addFixed(5, 16, 'devoir', 'TP Informatique', 'Algorithmes de tri')
  addFixed(5, 16, 'controle', 'Exam Latin', 'Version & thème')
  addFixed(5, 19, 'revision', 'Révision Maths', 'Bac blanc préparation')
  addFixed(5, 18, 'cours', 'Cours Éco', 'Mondialisation')
  addFixed(5, 18, 'devoir', 'Exposé Philo', 'Le libre arbitre')
  addFixed(5, 26, 'controle', 'Bac Blanc Français', 'Dissertation')
  addFixed(5, 29, 'flashcard', 'Anglais — Idioms', '18 cartes · 08h30')
  addFixed(5, 30, 'revision', 'Révision Bac Blanc', 'Toutes matières')

  // ── Juillet (mois 6) ──
  addFixed(6, 1, 'controle', 'Bac Blanc Maths', 'Durée : 4h')
  addFixed(6, 1, 'flashcard', 'Philo — Auteurs clés', '30 cartes · 08h00')
  addFixed(6, 3, 'cours', 'Cours de rattrapage SVT', 'Salle B08 · 10h00')
  addFixed(6, 3, 'devoir', 'Compte-rendu Chimie', 'À rendre avant 18h')
  addFixed(6, 7, 'controle', 'Bac Blanc Physique', 'Durée : 3h30')
  addFixed(6, 7, 'revision', 'Révision Philosophie', 'Fiches auteurs')
  addFixed(6, 10, 'cours', 'Cours Maths', 'Probabilités & stats')
  addFixed(6, 9, 'flashcard', 'Histoire — Dates clés', '35 cartes')
  addFixed(6, 14, 'devoir', 'Dossier Histoire', 'La Seconde Guerre mondiale')
  addFixed(6, 14, 'cours', 'Cours Anglais', 'Expression orale · 11h00')
  addFixed(6, 17, 'controle', 'Exam Histoire-Géo', 'Épreuve terminale')
  addFixed(6, 17, 'revision', 'Révision SVT', 'Génétique & évolution')
  addFixed(6, 21, 'flashcard', 'Maths — Formules', '40 cartes · 07h30')
  addFixed(6, 22, 'devoir', 'Synthèse Éco', 'La croissance économique')
  addFixed(6, 24, 'controle', 'Grand Oral — Blanc', 'Passage à 14h00')
  addFixed(6, 28, 'revision', 'Révision Générale', 'J-7 avant le Bac')
  addFixed(6, 30, 'flashcard', 'Toutes matières', '50 cartes · révision finale')

  return ev
}

/* ── Composable principal ── */
export function useCalendar() {
  const today = new Date()
  const view = ref('month')
  const currentYear = ref(today.getFullYear())
  const currentMonth = ref(today.getMonth())
  const selectedDay = ref(null)
  const events = ref(buildFakeEvents())

  function isToday(y, m, d) {
    return y === today.getFullYear() && m === today.getMonth() && d === today.getDate()
  }

  function isWeekend(y, m, d) {
    return (getFirstDay(y, m) + d - 1) % 7 >= 5
  }

  function isSelected(y, m, d) {
    return (
      selectedDay.value !== null &&
      selectedDay.value.y === y &&
      selectedDay.value.m === m &&
      selectedDay.value.d === d
    )
  }

  function hasEvent(y, m, d) {
    return !!events.value[eventKey(y, m, d)]?.length
  }

  function getEvents(y, m, d) {
    return events.value[eventKey(y, m, d)] || []
  }

  function selectDay(y, m, d) {
    if (isSelected(y, m, d)) closePanel()
    else selectedDay.value = { y, m, d }
  }

  function closePanel() {
    selectedDay.value = null
  }

  function prevMonth() {
    if (currentMonth.value === 0) {
      currentMonth.value = 11
      currentYear.value--
    } else currentMonth.value--
    closePanel()
  }

  function nextMonth() {
    if (currentMonth.value === 11) {
      currentMonth.value = 0
      currentYear.value++
    } else currentMonth.value++
    closePanel()
  }

  function goToMonth(idx) {
    currentMonth.value = idx
    view.value = 'month'
    closePanel()
  }

  const trailingDays = computed(() => {
    const total =
      getFirstDay(currentYear.value, currentMonth.value) +
      getDaysInMonth(currentYear.value, currentMonth.value)
    return (7 - (total % 7)) % 7
  })

  return {
    today,
    view,
    currentYear,
    currentMonth,
    selectedDay,
    events,
    isToday,
    isWeekend,
    isSelected,
    hasEvent,
    getEvents,
    selectDay,
    closePanel,
    prevMonth,
    nextMonth,
    goToMonth,
    trailingDays
  }
}
