import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AiGenerationProgressModal from '@/components/AiGenerationProgressModalComponent.vue'

const mountModal = (props = {}) =>
  mount(AiGenerationProgressModal, {
    props: { visible: true, status: 'generating', ...props },
    attachTo: document.body,
  })

const button = (w, text) => w.findAll('button').find((b) => b.text() === text)

describe('AiGenerationProgressModalComponent', () => {
  it('invisible : rien dans le DOM', () => {
    const wrapper = mountModal({ visible: false })
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
  })

  it('dialogue modal nommé « Génération en cours… »', () => {
    const wrapper = mountModal()
    const dialog = wrapper.find('[role="dialog"]')
    expect(dialog.attributes('aria-modal')).toBe('true')
    expect(dialog.attributes('aria-label')).toBe('Génération en cours…')
  })

  describe('en cours de génération', () => {
    it('affiche les trois étapes et la durée possible', () => {
      const text = mountModal().text()
      expect(text).toContain('Analyse de votre contenu')
      expect(text).toContain('Contenu reçu')
      expect(text).toContain('Génération des cartes')
      expect(text).toContain('Préparation de la validation')
      expect(text).toContain("jusqu'à une minute")
    })

    it('un seul bouton : « Annuler » émet « cancel »', async () => {
      const wrapper = mountModal()
      expect(wrapper.findAll('button').filter((b) => ['Annuler', 'Fermer', 'Réessayer'].includes(b.text())).map((b) => b.text())).toEqual(['Annuler'])
      await button(wrapper, 'Annuler').trigger('click')
      expect(wrapper.emitted('cancel')).toHaveLength(1)
      expect(wrapper.emitted('close')).toBeUndefined()
    })

    it('Échap ferme par « cancel » (la génération n’est pas terminée)', async () => {
      const wrapper = mountModal()
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
      expect(wrapper.emitted('cancel')).toHaveLength(1)
    })
  })

  describe('échec', () => {
    const failed = () => mountModal({ status: 'error', errorMessage: 'Le service IA est indisponible.' })

    it('affiche le message d’erreur et plus les étapes', () => {
      const text = failed().text()
      expect(text).toContain('La génération a échoué')
      expect(text).toContain('Le service IA est indisponible.')
      expect(text).not.toContain('Analyse de votre contenu')
    })

    it('« Fermer » émet « close » et « Réessayer » émet « retry »', async () => {
      const wrapper = failed()
      await button(wrapper, 'Fermer').trigger('click')
      await button(wrapper, 'Réessayer').trigger('click')
      expect(wrapper.emitted('close')).toHaveLength(1)
      expect(wrapper.emitted('retry')).toHaveLength(1)
      expect(wrapper.emitted('cancel')).toBeUndefined()
    })

    it('pas de bouton « Annuler » après un échec', () => {
      expect(button(failed(), 'Annuler')).toBeUndefined()
    })

    it('sans message d’erreur : le paragraphe reste vide, sans planter', () => {
      const wrapper = mountModal({ status: 'error' })
      expect(wrapper.text()).toContain('La génération a échoué')
    })
  })
})
