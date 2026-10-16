import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import MindMapNodePicker from '@/components/MindMapNodePickerComponent.vue'

// ── Fixtures ──────────────────────────────────────────────────────────────────

const MIND_MAP = {
  id: 'map-1',
  title: 'Électricité',
  subjectNodeId: 'n-subject',
  nodes: {
    'n-subject': {
      id: 'n-subject',
      label: 'Électricité',
      style: {},
      layout: { x: 400, y: 300 },
      meta: { isSubject: true }
    },
    'n-ohm': {
      id: 'n-ohm',
      label: "Loi d'Ohm",
      style: {},
      layout: { x: 700, y: 300 },
      meta: {}
    },
    'n-joule': {
      id: 'n-joule',
      label: 'Effet Joule',
      style: {},
      layout: { x: 400, y: 600 },
      meta: {}
    }
  },
  links: [
    { id: 'l-1', from: 'n-subject', to: 'n-ohm' },
    { id: 'l-2', from: 'n-subject', to: 'n-joule' },
    { id: 'l-orphan', from: 'n-subject', to: 'n-deleted' }
  ]
}

const mountPicker = (props = {}) =>
  mount(MindMapNodePicker, {
    props: { mindMapJson: MIND_MAP, modelValue: null, ...props }
  })

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('MindMapNodePickerComponent', () => {
  it('affiche un nœud cliquable par nœud de la carte mentale', () => {
    const wrapper = mountPicker()
    const nodes = wrapper.findAll('[role="button"]')
    expect(nodes).toHaveLength(3)
    expect(wrapper.text()).toContain("Loi d'Ohm")
  })

  it("n'affiche pas les liens vers des nœuds supprimés (référence orpheline)", () => {
    const wrapper = mountPicker()
    expect(wrapper.findAll('line')).toHaveLength(2)
  })

  it('clic sur un nœud — émet update:modelValue avec son id et node-selected avec le nœud', async () => {
    const wrapper = mountPicker()
    const ohm = wrapper.findAll('[role="button"]').find((n) => n.text().includes("Loi d'Ohm"))
    await ohm.trigger('click')

    expect(wrapper.emitted('update:modelValue')[0]).toEqual(['n-ohm'])
    expect(wrapper.emitted('node-selected')[0][0].label).toBe("Loi d'Ohm")
  })

  it('clic sur le nœud déjà sélectionné — désélectionne (émet null)', async () => {
    const wrapper = mountPicker({ modelValue: 'n-ohm' })
    const ohm = wrapper.findAll('[role="button"]').find((n) => n.text().includes("Loi d'Ohm"))
    await ohm.trigger('click')

    expect(wrapper.emitted('update:modelValue')[0]).toEqual([null])
    expect(wrapper.emitted('node-selected')[0]).toEqual([null])
  })

  it('sélection au clavier — Entrée sur un nœud focusable émet la sélection', async () => {
    const wrapper = mountPicker()
    const joule = wrapper.findAll('[role="button"]').find((n) => n.text().includes('Effet Joule'))
    expect(joule.attributes('tabindex')).toBe('0')
    await joule.trigger('keydown.enter')

    expect(wrapper.emitted('update:modelValue')[0]).toEqual(['n-joule'])
  })

  it('nœud sélectionné — aria-pressed et libellé « Nœud lié » affichés', () => {
    const wrapper = mountPicker({ modelValue: 'n-joule' })
    const joule = wrapper.findAll('[role="button"]').find((n) => n.text().includes('Effet Joule'))
    expect(joule.attributes('aria-pressed')).toBe('true')
    expect(wrapper.text()).toContain('Nœud lié : Effet Joule')
  })

  it('bouton Retirer — émet update:modelValue null', async () => {
    const wrapper = mountPicker({ modelValue: 'n-ohm' })
    await wrapper.findAll('button').find((b) => b.text() === 'Retirer').trigger('click')

    expect(wrapper.emitted('update:modelValue')[0]).toEqual([null])
  })

  it('accepte le JSON sérialisé en chaîne (format renvoyé par l’API)', () => {
    const wrapper = mountPicker({ mindMapJson: JSON.stringify(MIND_MAP) })
    expect(wrapper.findAll('[role="button"]')).toHaveLength(3)
  })

  it('aucune sélection - message d’invite affiché', () => {
    const wrapper = mountPicker()
    expect(wrapper.text()).toContain('Clique sur un nœud pour le lier')
  })
})
