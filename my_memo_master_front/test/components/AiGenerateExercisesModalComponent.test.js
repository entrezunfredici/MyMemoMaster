import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AiGenerateExercisesModal from '@/components/AiGenerateExercisesModalComponent.vue'

function mountModal(props = {}) {
  return mount(AiGenerateExercisesModal, {
    props: { visible: true, defaultSubjectContext: '', ...props }
  })
}

describe('AiGenerateExercisesModalComponent', () => {
  it('pré-remplit le champ matière avec defaultSubjectContext', () => {
    const wrapper = mountModal({ defaultSubjectContext: 'SVT' })
    const input = wrapper.find('input[aria-label="Matière"]')
    expect(input.element.value).toBe('SVT')
  })

  it('désactive le bouton "Générer les questions" tant qu\'aucun texte source n\'est saisi', async () => {
    const wrapper = mountModal()
    const btn = wrapper.find('.btn-modal-submit')
    expect(btn.attributes('disabled')).toBeDefined()

    await wrapper.find('textarea').setValue('Un texte source.')
    expect(btn.attributes('disabled')).toBeUndefined()
  })

  it('n\'émet pas "submit" si le texte source est vide', async () => {
    const wrapper = mountModal()
    await wrapper.find('.btn-modal-submit').trigger('click')
    expect(wrapper.emitted('submit')).toBeUndefined()
  })

  it('submit - émet la config avec les valeurs par défaut (questionCount 6, questionType "mixed")', async () => {
    const wrapper = mountModal()
    await wrapper.find('textarea').setValue('  Un texte source.  ')

    await wrapper.find('.btn-modal-submit').trigger('click')

    expect(wrapper.emitted('submit')).toHaveLength(1)
    expect(wrapper.emitted('submit')[0][0]).toEqual({
      sourceText: 'Un texte source.',
      pdfFile: null,
      subjectContext: null,
      questionCount: 6,
      questionType: 'mixed'
    })
  })

  it('submit - reflète le type de question sélectionné et la matière saisie', async () => {
    const wrapper = mountModal()
    await wrapper.find('textarea').setValue('Un texte.')
    await wrapper.find('input[aria-label="Matière"]').setValue('Histoire')
    await wrapper.find('input[type="radio"][value="fill_blank"]').setValue()

    await wrapper.find('.btn-modal-submit').trigger('click')

    const emitted = wrapper.emitted('submit')[0][0]
    expect(emitted.questionType).toBe('fill_blank')
    expect(emitted.subjectContext).toBe('Histoire')
  })

  it('émet "close" au clic sur "Annuler"', async () => {
    const wrapper = mountModal()
    await wrapper.find('.btn-modal-cancel').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  // ── import PDF (ajouté après C-02.07) ────────────────────────────────────────

  describe('source PDF', () => {
    it('bascule sur "Importer un PDF" - masque le textarea, affiche la zone de dépôt', async () => {
      const wrapper = mountModal()
      await wrapper.find('input[type="radio"][value="pdf"]').setValue()

      expect(wrapper.find('textarea').exists()).toBe(false)
      expect(wrapper.find('input[type="file"]').exists()).toBe(true)
    })

    it('désactive le bouton tant qu\'aucun PDF n\'est sélectionné', async () => {
      const wrapper = mountModal()
      await wrapper.find('input[type="radio"][value="pdf"]').setValue()

      expect(wrapper.find('.btn-modal-submit').attributes('disabled')).toBeDefined()
    })

    it('sélection d\'un PDF valide via l\'input file - active le bouton, affiche le nom du fichier', async () => {
      const wrapper = mountModal()
      await wrapper.find('input[type="radio"][value="pdf"]').setValue()

      const file = new File(['%PDF-1.4'], 'cours.pdf', { type: 'application/pdf' })
      const input = wrapper.find('input[type="file"]')
      Object.defineProperty(input.element, 'files', { value: [file] })
      await input.trigger('change')

      expect(wrapper.text()).toContain('cours.pdf')
      expect(wrapper.find('.btn-modal-submit').attributes('disabled')).toBeUndefined()
    })

    it('sélection d\'un fichier non-PDF - affiche une erreur, ne fixe pas pdfFile', async () => {
      const wrapper = mountModal()
      await wrapper.find('input[type="radio"][value="pdf"]').setValue()

      const file = new File(['plain text'], 'notes.txt', { type: 'text/plain' })
      const input = wrapper.find('input[type="file"]')
      Object.defineProperty(input.element, 'files', { value: [file] })
      await input.trigger('change')

      expect(wrapper.text()).toContain('Seuls les fichiers PDF sont acceptés.')
      expect(wrapper.find('.btn-modal-submit').attributes('disabled')).toBeDefined()
    })

    it('dépôt d\'un PDF par drag & drop - fixe pdfFile', async () => {
      const wrapper = mountModal()
      await wrapper.find('input[type="radio"][value="pdf"]').setValue()

      const file = new File(['%PDF-1.4'], 'cours.pdf', { type: 'application/pdf' })
      await wrapper.find('.border-dashed').trigger('drop', { dataTransfer: { files: [file] } })

      expect(wrapper.text()).toContain('cours.pdf')
    })

    it('submit - source PDF - émet pdfFile et sourceText: null', async () => {
      const wrapper = mountModal()
      await wrapper.find('input[type="radio"][value="pdf"]').setValue()

      const file = new File(['%PDF-1.4'], 'cours.pdf', { type: 'application/pdf' })
      const input = wrapper.find('input[type="file"]')
      Object.defineProperty(input.element, 'files', { value: [file] })
      await input.trigger('change')

      await wrapper.find('.btn-modal-submit').trigger('click')

      expect(wrapper.emitted('submit')[0][0]).toMatchObject({ sourceText: null, pdfFile: file })
    })

    it('retirer le fichier sélectionné - redésactive le bouton', async () => {
      const wrapper = mountModal()
      await wrapper.find('input[type="radio"][value="pdf"]').setValue()

      const file = new File(['%PDF-1.4'], 'cours.pdf', { type: 'application/pdf' })
      const input = wrapper.find('input[type="file"]')
      Object.defineProperty(input.element, 'files', { value: [file] })
      await input.trigger('change')

      await wrapper.find('button[aria-label="Retirer le fichier"]').trigger('click')

      expect(wrapper.text()).not.toContain('cours.pdf')
      expect(wrapper.find('.btn-modal-submit').attributes('disabled')).toBeDefined()
    })
  })
})
