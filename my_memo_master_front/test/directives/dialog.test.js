import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, ref, nextTick } from 'vue'
import { dialogDirective } from '@/directives/dialog'

const Host = defineComponent({
  directives: { dialog: dialogDirective },
  props: { onCloseSpy: { type: Function, default: () => {} } },
  setup(props) {
    const open = ref(false)
    const close = () => {
      props.onCloseSpy()
      open.value = false
    }
    return { open, close }
  },
  template: `
    <div>
      <button id="opener" @click="open = true">Ouvrir</button>
      <div v-if="open" v-dialog="close" role="dialog" aria-modal="true" aria-labelledby="t" class="modal-overlay">
        <div class="modal-panel">
          <h2 id="t">Titre</h2>
          <input id="a" />
          <button id="b" type="button">B</button>
          <button id="c" type="button" disabled>C</button>
          <button id="d" type="button">D</button>
        </div>
      </div>
    </div>`,
})

const mountOpen = async (props = {}) => {
  const wrapper = mount(Host, { props, attachTo: document.body })
  const opener = wrapper.find('#opener')
  opener.element.focus()
  await opener.trigger('click')
  await nextTick()
  return wrapper
}
const key = (wrapper, k, opts = {}) =>
  wrapper.find('[role="dialog"]').trigger('keydown', { key: k, ...opts })

describe('v-dialog', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('à l’ouverture, le focus entre dans le panneau', async () => {
    const wrapper = await mountOpen()
    expect(document.activeElement).toBe(wrapper.find('.modal-panel').element)
    expect(wrapper.find('.modal-panel').attributes('tabindex')).toBe('-1')
  })

  it('Échap appelle la fonction de fermeture', async () => {
    const spy = vi.fn()
    const wrapper = await mountOpen({ onCloseSpy: spy })
    await key(wrapper, 'Escape')
    expect(spy).toHaveBeenCalledTimes(1)
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
  })

  it('à la fermeture, le focus retourne à l’élément qui l’avait avant', async () => {
    const wrapper = await mountOpen()
    expect(document.activeElement).not.toBe(wrapper.find('#opener').element)
    await key(wrapper, 'Escape')
    await nextTick()
    expect(document.activeElement).toBe(wrapper.find('#opener').element)
  })

  it('Tab sur le dernier élément focalisable revient au premier (boutons désactivés ignorés)', async () => {
    const wrapper = await mountOpen()
    wrapper.find('#d').element.focus()
    const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })
    wrapper.find('[role="dialog"]').element.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(wrapper.find('#a').element)
  })

  it('Maj+Tab sur le panneau ou le premier élément passe au dernier', async () => {
    const wrapper = await mountOpen()
    const event = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true })
    wrapper.find('[role="dialog"]').element.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(wrapper.find('#d').element)
  })

  it('Tab au milieu du panneau n’est pas détourné', async () => {
    const wrapper = await mountOpen()
    wrapper.find('#b').element.focus()
    const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })
    wrapper.find('[role="dialog"]').element.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(false)
  })

  it('une autre touche est ignorée', async () => {
    const spy = vi.fn()
    const wrapper = await mountOpen({ onCloseSpy: spy })
    await key(wrapper, 'a')
    expect(spy).not.toHaveBeenCalled()
  })

  it('sans élément focalisable, le focus reste sur le panneau', async () => {
    const wrapper = mount(
      defineComponent({
        directives: { dialog: dialogDirective },
        template: '<div v-dialog="() => {}" role="dialog"><div class="modal-panel"><p>Rien à faire</p></div></div>',
      }),
      { attachTo: document.body },
    )
    const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })
    wrapper.find('[role="dialog"]').element.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(wrapper.find('.modal-panel').element)
  })

  it('le panneau par défaut est le premier enfant quand « .modal-panel » est absent', async () => {
    const wrapper = mount(
      defineComponent({
        directives: { dialog: dialogDirective },
        template: '<div v-dialog="() => {}" role="dialog"><div id="inner"><button>x</button></div></div>',
      }),
      { attachTo: document.body },
    )
    expect(document.activeElement).toBe(wrapper.find('#inner').element)
  })

  it('une fermeture qui change d’un rendu à l’autre utilise la dernière version', async () => {
    const first = vi.fn()
    const second = vi.fn()
    const wrapper = mount(
      defineComponent({
        directives: { dialog: dialogDirective },
        props: ['fn'],
        template: '<div v-dialog="fn" role="dialog"><div class="modal-panel"><button>x</button></div></div>',
      }),
      { props: { fn: first }, attachTo: document.body },
    )
    await wrapper.setProps({ fn: second })
    await wrapper.find('[role="dialog"]').trigger('keydown', { key: 'Escape' })
    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledTimes(1)
  })

  it('Échap n’est pas propagé (pas de fermeture en cascade d’une modale parente)', async () => {
    const outer = vi.fn()
    document.addEventListener('keydown', outer)
    const wrapper = await mountOpen()
    await key(wrapper, 'Escape')
    expect(outer).not.toHaveBeenCalled()
    document.removeEventListener('keydown', outer)
  })

  it('le focus n’est pas restitué à un élément qui a quitté le document', async () => {
    const wrapper = await mountOpen()
    const opener = wrapper.find('#opener').element
    opener.remove()
    await key(wrapper, 'Escape')
    await nextTick()
    expect(document.activeElement).toBe(document.body)
  })
})
