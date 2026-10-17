import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import AiGenerateCardsModal from '@/components/AiGenerateCardsModalComponent.vue'
import { useAiCardGenerationStore } from '@/stores/aiCardGeneration'

function mountModal({ props = {}, quota = null } = {}) {
  const pinia = createTestingPinia({
    createSpy: vi.fn,
    stubActions: true,
    initialState: { aiCardGeneration: { quota } },
  })
  const wrapper = mount(AiGenerateCardsModal, {
    props: { visible: true, idSystem: 4, ...props },
    global: { plugins: [pinia] },
    attachTo: document.body,
  })
  return { wrapper, store: useAiCardGenerationStore() }
}

const submitBtn = (w) => w.findAll('button').find((b) => b.text() === 'Générer les cartes')
const text = (w) => w.find('textarea[aria-label="Texte source pour la génération de cartes"]')
const pdf = (name = 'cours.pdf', type = 'application/pdf', size = 1024 * 1024) => {
  const f = new File(['x'], name, { type })
  Object.defineProperty(f, 'size', { value: size })
  return f
}
const choosePdfSource = (w) => w.find('input[name="ai-source"][value="pdf"]').setValue(true)
const selectFile = async (w, file) => {
  const input = w.find('input[type="file"]')
  Object.defineProperty(input.element, 'files', { value: [file], configurable: true })
  await input.trigger('change')
}

describe('AiGenerateCardsModalComponent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ''
  })

  it('charge le quota à l’ouverture', () => {
    const { store } = mountModal()
    expect(store.fetchQuota).toHaveBeenCalledTimes(1)
  })

  it('dialogue modal « Générer des cartes par IA »', () => {
    const { wrapper } = mountModal()
    const dialog = wrapper.find('[role="dialog"]')
    expect(dialog.attributes('aria-label')).toBe('Générer des cartes par IA')
    expect(dialog.attributes('aria-modal')).toBe('true')
  })

  describe('quota', () => {
    it('affiché quand il est connu', () => {
      const { wrapper } = mountModal({ quota: { remainingGenerationsToday: 3, maxGenerationsPerDay: 10 } })
      expect(wrapper.text()).toContain('Quota restant aujourd\'hui : 3 / 10 générations')
    })
    it('masqué sinon', () => {
      expect(mountModal().wrapper.text()).not.toContain('Quota restant')
    })
  })

  describe('source texte', () => {
    it('par défaut : zone de texte, bouton désactivé tant qu’elle est vide ou blanche', async () => {
      const { wrapper } = mountModal()
      expect(text(wrapper).exists()).toBe(true)
      expect(submitBtn(wrapper).attributes('disabled')).toBeDefined()
      await text(wrapper).setValue('   \n ')
      expect(submitBtn(wrapper).attributes('disabled')).toBeDefined()
    })

    it('compteur de caractères (singulier à 1)', async () => {
      const { wrapper } = mountModal()
      await text(wrapper).setValue('a')
      expect(wrapper.text()).toContain('1 caractère')
      expect(wrapper.text()).not.toContain('1 caractères')
      await text(wrapper).setValue('abc')
      expect(wrapper.text()).toContain('3 caractères')
    })

    it('émet « submit » avec le texte nettoyé et les valeurs par défaut', async () => {
      const { wrapper } = mountModal()
      await text(wrapper).setValue('  La photosynthèse…  ')
      await submitBtn(wrapper).trigger('click')
      expect(wrapper.emitted('submit')[0][0]).toEqual({
        idSystem: 4,
        sourceText: 'La photosynthèse…',
        pdfFile: null,
        subjectContext: null,
        cardCount: 8,
        cardType: 'open',
      })
    })
  })

  describe('options', () => {
    it('matière : préremplie par la valeur par défaut puis nettoyée', async () => {
      const { wrapper } = mountModal({ props: { defaultSubjectContext: 'SVT' } })
      expect(wrapper.find('input[aria-label="Matière"]').element.value).toBe('SVT')
      await wrapper.find('input[aria-label="Matière"]').setValue('  Biologie ')
      await text(wrapper).setValue('x')
      await submitBtn(wrapper).trigger('click')
      expect(wrapper.emitted('submit')[0][0].subjectContext).toBe('Biologie')
    })

    it('nombre de cartes : curseur de 1 à 20, valeur affichée et transmise en nombre', async () => {
      const { wrapper } = mountModal()
      const slider = wrapper.find('input[type="range"]')
      expect([slider.attributes('min'), slider.attributes('max')]).toEqual(['1', '20'])
      await slider.setValue('12')
      expect(wrapper.text()).toContain('Nombre de cartes souhaité : 12')
      await text(wrapper).setValue('x')
      await submitBtn(wrapper).trigger('click')
      expect(wrapper.emitted('submit')[0][0].cardCount).toBe(12)
    })

    it('type de cartes : groupe radio nommé (RGAA 11.6), 3 choix', async () => {
      const { wrapper } = mountModal()
      const group = wrapper.find('[role="radiogroup"]')
      expect(group.attributes('aria-labelledby')).toBe('ai-card-type-legend')
      expect(wrapper.find('#ai-card-type-legend').text()).toBe('Type de cartes')
      expect(group.findAll('input[type="radio"]')).toHaveLength(3)
      await group.find('input[value="mcq"]').setValue(true)
      await text(wrapper).setValue('x')
      await submitBtn(wrapper).trigger('click')
      expect(wrapper.emitted('submit')[0][0].cardType).toBe('mcq')
    })
  })

  describe('source PDF', () => {
    it('bascule vers la zone de dépôt, bouton désactivé sans fichier', async () => {
      const { wrapper } = mountModal()
      await choosePdfSource(wrapper)
      expect(text(wrapper).exists()).toBe(false)
      expect(wrapper.text()).toContain('Glissez un PDF ici')
      expect(submitBtn(wrapper).attributes('disabled')).toBeDefined()
    })

    it('PDF valide : nom et taille affichés, soumission avec le fichier (et sans texte)', async () => {
      const { wrapper } = mountModal()
      await choosePdfSource(wrapper)
      const file = pdf('cours.pdf', 'application/pdf', 2.5 * 1024 * 1024)
      await selectFile(wrapper, file)
      expect(wrapper.text()).toContain('cours.pdf (2.5 Mo)')
      await submitBtn(wrapper).trigger('click')
      const payload = wrapper.emitted('submit')[0][0]
      expect(payload.pdfFile).toBe(file)
      expect(payload.sourceText).toBeNull()
    })

    it('fichier d’un autre type : erreur, aucun fichier retenu', async () => {
      const { wrapper } = mountModal()
      await choosePdfSource(wrapper)
      await selectFile(wrapper, pdf('image.png', 'image/png'))
      expect(wrapper.text()).toContain('Seuls les fichiers PDF sont acceptés.')
      expect(submitBtn(wrapper).attributes('disabled')).toBeDefined()
    })

    it('fichier trop gros (> 10 Mo) : erreur', async () => {
      const { wrapper } = mountModal()
      await choosePdfSource(wrapper)
      await selectFile(wrapper, pdf('gros.pdf', 'application/pdf', 11 * 1024 * 1024))
      expect(wrapper.text()).toContain('dépasse la taille maximale autorisée (10 Mo)')
      expect(submitBtn(wrapper).attributes('disabled')).toBeDefined()
    })

    it('exactement 10 Mo : accepté', async () => {
      const { wrapper } = mountModal()
      await choosePdfSource(wrapper)
      await selectFile(wrapper, pdf('limite.pdf', 'application/pdf', 10 * 1024 * 1024))
      expect(wrapper.text()).not.toContain('dépasse')
      expect(submitBtn(wrapper).attributes('disabled')).toBeUndefined()
    })

    it('glisser-déposer : survol signalé, puis fichier retenu', async () => {
      const { wrapper } = mountModal()
      await choosePdfSource(wrapper)
      const zone = wrapper.find('.border-dashed')
      await zone.trigger('dragover')
      expect(zone.classes()).toContain('border-primary')
      await zone.trigger('drop', { dataTransfer: { files: [pdf('depose.pdf')] } })
      expect(zone.classes()).not.toContain('border-primary')
      expect(wrapper.text()).toContain('depose.pdf')
    })

    it('« Retirer le fichier » remet la zone de dépôt', async () => {
      const { wrapper } = mountModal()
      await choosePdfSource(wrapper)
      await selectFile(wrapper, pdf())
      await wrapper.find('button[aria-label="Retirer le fichier"]').trigger('click')
      expect(wrapper.text()).toContain('Glissez un PDF ici')
    })

    it('le bouton « Parcourir… » est un vrai bouton et le champ fichier est nommé (RGAA 11.1)', async () => {
      const { wrapper } = mountModal()
      await choosePdfSource(wrapper)
      expect(wrapper.findAll('button').some((b) => b.text().startsWith('Parcourir'))).toBe(true)
      expect(wrapper.find('input[type="file"]').attributes('aria-label')).toBe('Sélectionner un fichier PDF')
    })
  })

  it('l’état saisi survit à un changement de visibilité (aller-retour vers l’écran d’attente)', async () => {
    const { wrapper } = mountModal()
    await text(wrapper).setValue('Mon texte')
    await wrapper.setProps({ visible: false })
    await wrapper.setProps({ visible: true })
    expect(text(wrapper).element.value).toBe('Mon texte')
  })

  it('« Annuler » et Échap émettent « close »', async () => {
    const { wrapper } = mountModal()
    await wrapper.findAll('button').find((b) => b.text() === 'Annuler').trigger('click')
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(wrapper.emitted('close')).toHaveLength(2)
  })
})
