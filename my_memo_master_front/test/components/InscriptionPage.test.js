import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import InscriptionPage from '@/pages/register/InscriptionPage.vue'
import { useAuthStore } from '@/stores/auth'

const { mockNotify } = vi.hoisted(() => ({ mockNotify: vi.fn() }))

vi.mock('@/helpers/notif.js', () => ({ notif: { notify: mockNotify } }))

const RULES_URL = 'https://my-memo-master.com/regles-usage'

let wrapper
let register

function mountPage() {
  const pinia = createPinia()
  setActivePinia(pinia)
  register = vi.spyOn(useAuthStore(), 'register').mockResolvedValue()
  wrapper = mount(InscriptionPage, {
    global: {
      plugins: [pinia],
      stubs: {
        AuthFormLayout: { template: '<div><slot /></div>' },
        'router-link': { template: '<a><slot /></a>' },
      },
    },
  })
}

async function fillValidForm() {
  await wrapper.find('#register-name').setValue('Alice')
  await wrapper.find('#register-email').setValue('alice@example.com')
  await wrapper.find('#register-password').setValue('MotDePasse123')
  await wrapper.find('#register-confirm-password').setValue('MotDePasse123')
}

describe('InscriptionPage - conditions d\'usage', () => {
  beforeEach(() => {
    mockNotify.mockClear()
    mountPage()
  })

  afterEach(() => {
    wrapper.unmount()
  })

  it('affiche une case décochée dont le libellé pointe vers la page des règles d\'usage', () => {
    const checkbox = wrapper.find('#register-accept-rules')
    expect(checkbox.exists()).toBe(true)
    expect(checkbox.element.checked).toBe(false)

    const link = wrapper.find('label[for="register-accept-rules"] a')
    expect(link.attributes('href')).toBe(RULES_URL)
    expect(link.attributes('target')).toBe('_blank')
    expect(link.attributes('rel')).toContain('noopener')
  })

  it('désactive le bouton Valider tant que la case n\'est pas cochée', async () => {
    await fillValidForm()
    const submit = wrapper.find('button[type="submit"]')
    expect(submit.attributes('disabled')).toBeDefined()

    await wrapper.find('#register-accept-rules').setValue(true)
    expect(submit.attributes('disabled')).toBeUndefined()
  })

  it('refuse l\'envoi sans acceptation et affiche l\'erreur', async () => {
    await fillValidForm()
    await wrapper.find('form').trigger('submit')

    expect(register).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain("Vous devez accepter les conditions d'usage de l'application.")
    expect(wrapper.find('#register-accept-rules').attributes('aria-invalid')).toBe('true')
  })

  it('envoie l\'inscription une fois la case cochée', async () => {
    await fillValidForm()
    await wrapper.find('#register-accept-rules').setValue(true)
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(register).toHaveBeenCalledWith({
      name: 'Alice',
      email: 'alice@example.com',
      password: 'MotDePasse123',
    })
  })
})
