import { describe, it, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import ModalComponent from '@/components/ModalComponent.vue'

// attachTo: document.body — indispensable pour que document.activeElement
// reflète réellement le focus (tests du focus trap)
let wrapper

const factory = (props = {}) => {
  wrapper = mount(ModalComponent, {
    props: { visible: true, title: 'Titre test', ...props },
    slots: {
      default: '<input id="champ" type="text" /><button id="action">Action</button>',
    },
    attachTo: document.body,
  })
  return wrapper
}

afterEach(() => {
  wrapper?.unmount()
})

describe('ModalComponent', () => {
  it('affiche le panneau avec role="dialog" et aria-modal quand visible', () => {
    factory()
    const overlay = wrapper.find('[role="dialog"]')
    expect(overlay.exists()).toBe(true)
    expect(overlay.attributes('aria-modal')).toBe('true')
    expect(overlay.attributes('aria-label')).toBe('Titre test')
  })

  it("n'affiche rien quand visible est false", () => {
    factory({ visible: false })
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
  })

  it('le bouton de fermeture a un nom accessible', () => {
    factory()
    expect(wrapper.find('.modal-close').attributes('aria-label')).toBe('Fermer')
  })

  it('clic sur l’overlay — émet close ; clic dans le panneau — n’émet pas', async () => {
    factory()
    await wrapper.find('.modal-panel').trigger('click')
    expect(wrapper.emitted('close')).toBeUndefined()
    await wrapper.find('.modal-overlay').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('touche Échap — émet close', async () => {
    factory()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await nextTick()
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('touche Échap modale fermée — n’émet pas close', async () => {
    factory({ visible: false })
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await nextTick()
    expect(wrapper.emitted('close')).toBeUndefined()
  })

  it('à l’ouverture — le focus est déplacé dans le panneau', async () => {
    factory()
    await nextTick()
    expect(document.activeElement).toBe(wrapper.find('.modal-panel').element)
  })

  it('focus trap — Tab depuis le dernier élément boucle sur le premier', async () => {
    factory()
    await nextTick()
    const action = wrapper.find('#action').element
    action.focus()
    await wrapper.find('.modal-panel').trigger('keydown.tab')
    expect(document.activeElement).toBe(wrapper.find('.modal-close').element)
  })

  it('focus trap — Shift+Tab depuis le premier élément boucle sur le dernier', async () => {
    factory()
    await nextTick()
    wrapper.find('.modal-close').element.focus()
    await wrapper.find('.modal-panel').trigger('keydown.tab', { shiftKey: true })
    expect(document.activeElement).toBe(wrapper.find('#action').element)
  })

  it('à la fermeture — le focus est restitué à l’élément précédent', async () => {
    const outside = document.createElement('button')
    outside.id = 'outside'
    document.body.appendChild(outside)
    outside.focus()

    factory({ visible: false })
    await wrapper.setProps({ visible: true })
    await nextTick()
    expect(document.activeElement).toBe(wrapper.find('.modal-panel').element)

    await wrapper.setProps({ visible: false })
    await nextTick()
    expect(document.activeElement).toBe(outside)
    outside.remove()
  })
})
