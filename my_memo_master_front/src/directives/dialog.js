// Directive `v-dialog` : comportement clavier/focus d'une fenêtre de dialogue modale (RGAA 7.1, 12.x, WCAG 2.4.3 / 2.1.2).
//
// Usage : sur l'élément racine de la modale (celui qui porte role="dialog" aria-modal="true"
// aria-labelledby="…"), avec la fonction de fermeture :
//   <div v-if="open" v-dialog="close" role="dialog" aria-modal="true" aria-labelledby="mon-titre" class="modal-overlay">
//
// Ce que la directive garantit :
//  - à l'ouverture, le focus entre dans le panneau (et la position de l'utilisateur est mémorisée) ;
//  - Tab / Maj+Tab bouclent à l'intérieur du panneau ;
//  - Échap ferme la fenêtre ;
//  - à la fermeture, le focus retourne à l'élément qui l'avait avant l'ouverture.
//
// CHOIX: une directive plutôt qu'un composable ou le composant ModalComponent.
// RAISON: ces modales sont montées par un `v-if` du composant parent (pas par une prop `visible`) :
// une directive suit exactement le cycle de vie de l'élément (montage / démontage) sans refactorer leur
// balisage ni leurs tests existants. Même logique que ModalComponent.vue, qui reste la référence.

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

const STATE = new WeakMap()

// Le panneau est le premier enfant « .modal-panel » s'il existe, sinon le premier enfant élément, sinon la racine.
function findPanel(el) {
  return el.querySelector('.modal-panel') || el.firstElementChild || el
}

function visibleFocusables(panel) {
  return Array.from(panel.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
    (node) => !node.hasAttribute('hidden') && node.getAttribute('aria-hidden') !== 'true',
  )
}

export const dialogDirective = {
  mounted(el, binding) {
    const panel = findPanel(el)
    const state = {
      previouslyFocused: document.activeElement,
      onClose: binding.value,
      panel,
    }

    if (!panel.hasAttribute('tabindex')) panel.setAttribute('tabindex', '-1')

    state.onKeydown = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        if (typeof state.onClose === 'function') state.onClose()
        return
      }
      if (event.key !== 'Tab') return

      const focusables = visibleFocusables(state.panel)
      if (!focusables.length) {
        event.preventDefault()
        state.panel.focus()
        return
      }
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      const active = document.activeElement

      if (event.shiftKey && (active === first || active === state.panel)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
    }

    el.addEventListener('keydown', state.onKeydown)
    STATE.set(el, state)
    panel.focus()
  },

  // La fonction de fermeture peut changer d'un rendu à l'autre (fermeture liée à des données).
  updated(el, binding) {
    const state = STATE.get(el)
    if (state) state.onClose = binding.value
  },

  beforeUnmount(el) {
    const state = STATE.get(el)
    if (!state) return
    el.removeEventListener('keydown', state.onKeydown)
    STATE.delete(el)
    const target = state.previouslyFocused
    if (target instanceof HTMLElement && document.contains(target)) target.focus()
  },
}

export default dialogDirective
