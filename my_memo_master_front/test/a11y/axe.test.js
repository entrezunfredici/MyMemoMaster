/**
 * Tests d'accessibilité automatisés (axe-core) — RGAA / WCAG 2.1.
 *
 * Complément runtime de l'audit statique `scripts/audit-a11y.mjs` : axe vérifie
 * le DOM réellement rendu (rôles ARIA, noms accessibles, structure).
 * Les règles nécessitant un rendu visuel complet (contrastes) sont désactivées :
 * jsdom ne calcule pas les styles — elles relèvent de l'audit navigateur.
 */
import { describe, it, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import axe from 'axe-core'
import ModalComponent from '@/components/ModalComponent.vue'
import ButtonComponent from '@/components/ButtonComponent.vue'
import TutorialItem from '@/components/TutorialItem.vue'
import PasswordStrengthComponent from '@/components/PasswordStrengthComponent.vue'

let wrapper

afterEach(() => {
  wrapper?.unmount()
})

const AXE_OPTIONS = {
  rules: {
    // jsdom : pas de moteur de rendu — les contrastes sont audités au navigateur
    'color-contrast': { enabled: false },
    // les composants sont montés isolés, hors landmark/page complète
    region: { enabled: false },
    'page-has-heading-one': { enabled: false }
  }
}

const runAxe = async (element) => {
  const results = await axe.run(element, AXE_OPTIONS)
  // Message d'échec lisible : liste des violations avec leurs cibles
  const summary = results.violations.map(
    (v) => `${v.id} (${v.impact}) : ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`
  )
  return summary
}

describe('Accessibilité (axe-core)', () => {
  it('ModalComponent - modale ouverte avec contenu - aucune violation axe', async () => {
    wrapper = mount(ModalComponent, {
      props: { visible: true, title: 'Titre test' },
      slots: {
        default: '<label for="champ">Champ</label><input id="champ" type="text" />'
      },
      attachTo: document.body
    })
    expect(await runAxe(wrapper.element)).toEqual([])
  })

  it('ButtonComponent - bouton avec texte - aucune violation axe', async () => {
    wrapper = mount(ButtonComponent, {
      slots: { default: 'Valider' },
      attachTo: document.body
    })
    expect(await runAxe(wrapper.element)).toEqual([])
  })

  it('TutorialItem - lien de tutoriel - aucune violation axe', async () => {
    wrapper = mount(TutorialItem, {
      props: {
        tutorial: {
          name: 'Bien démarrer',
          description: 'Guide de prise en main',
          url: 'https://example.com/tuto'
        }
      },
      attachTo: document.body
    })
    expect(await runAxe(wrapper.element)).toEqual([])
  })

  it('PasswordStrengthComponent - jauge affichée - aucune violation axe', async () => {
    wrapper = mount(PasswordStrengthComponent, {
      props: { password: 'Abcdef123!' },
      attachTo: document.body
    })
    expect(await runAxe(wrapper.element)).toEqual([])
  })
})
