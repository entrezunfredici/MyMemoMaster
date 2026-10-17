import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ConfirmActionModal from '@/components/ConfirmActionModal.vue'

const mountModal = (modal) => mount(ConfirmActionModal, { props: { modal }, attachTo: document.body })

describe('ConfirmActionModal', () => {
  it('fermée : rien dans le DOM', () => {
    expect(mountModal({ visible: false, title: 'T', message: 'M' }).find('[role="dialog"]').exists()).toBe(false)
  })

  it('ouverte : dialogue modal nommé par son titre, message affiché', () => {
    const w = mountModal({ visible: true, title: 'Supprimer le groupe', message: 'Supprimer « A » ?' })
    const d = w.find('[role="dialog"]')
    expect(d.attributes('aria-modal')).toBe('true')
    expect(d.attributes('aria-label')).toBe('Supprimer le groupe')
    expect(d.text()).toContain('Supprimer « A » ?')
  })

  it('« Annuler » émet « cancel », « Confirmer » émet « confirm »', async () => {
    const w = mountModal({ visible: true, title: 'T', message: 'M' })
    await w.find('.btn-modal-cancel').trigger('click')
    await w.find('.btn-modal-danger').trigger('click')
    expect(w.emitted('cancel')).toHaveLength(1)
    expect(w.emitted('confirm')).toHaveLength(1)
  })

  it('Échap émet « cancel » (fermeture par le clavier, RGAA 7.1)', () => {
    const w = mountModal({ visible: true, title: 'T', message: 'M' })
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(w.emitted('cancel')).toHaveLength(1)
  })

  it('le bouton de confirmation est visuellement « danger » (action destructrice)', () => {
    const w = mountModal({ visible: true, title: 'T', message: 'M' })
    expect(w.find('.btn-modal-danger').text()).toBe('Confirmer')
  })
})
