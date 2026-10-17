import { describe, it, expect, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import { provideConfirmAction, useConfirmAction } from '@/composables/useConfirmAction'

// Un parent qui fournit la modale + un enfant qui demande une confirmation
function mountPair() {
  let api
  let ask
  const Child = defineComponent({
    setup() {
      ask = useConfirmAction()
      return () => h('i')
    },
  })
  const Parent = defineComponent({
    setup() {
      api = provideConfirmAction()
      return () => h(Child)
    },
  })
  mount(Parent)
  return { api, ask }
}

describe('provideConfirmAction / useConfirmAction', () => {
  it('fermée au départ', () => {
    const { api } = mountPair()
    expect(api.confirmModal).toMatchObject({ visible: false, title: '', message: '', action: null })
  })

  it('askConfirm (depuis un enfant) ouvre la modale avec titre et message', () => {
    const { api, ask } = mountPair()
    ask('Supprimer', 'Sûr ?', () => {})
    expect(api.confirmModal).toMatchObject({ visible: true, title: 'Supprimer', message: 'Sûr ?' })
  })

  it('runConfirmedAction ferme la modale PUIS exécute l’action (une seule fois)', async () => {
    const { api, ask } = mountPair()
    const action = vi.fn(() => {
      expect(api.confirmModal.visible).toBe(false) // déjà fermée quand l’action démarre
    })
    ask('t', 'm', action)
    await api.runConfirmedAction()
    expect(action).toHaveBeenCalledTimes(1)
    expect(api.confirmModal.action).toBeNull()
    await api.runConfirmedAction() // deuxième clic : plus d'action en attente
    expect(action).toHaveBeenCalledTimes(1)
  })

  it('closeConfirmModal annule sans exécuter l’action', async () => {
    const { api, ask } = mountPair()
    const action = vi.fn()
    ask('t', 'm', action)
    api.closeConfirmModal()
    await api.runConfirmedAction()
    expect(api.confirmModal.visible).toBe(false)
    expect(action).not.toHaveBeenCalled()
  })

  it('runConfirmedAction sans action en attente ne lève pas d’erreur', async () => {
    const { api } = mountPair()
    await expect(api.runConfirmedAction()).resolves.toBeUndefined()
  })

  it('useConfirmAction sans parent fournisseur : erreur explicite', () => {
    const Orphan = defineComponent({
      setup() {
        useConfirmAction()
        return () => h('i')
      },
    })
    expect(() => mount(Orphan)).toThrow(/provideConfirmAction/)
  })
})
