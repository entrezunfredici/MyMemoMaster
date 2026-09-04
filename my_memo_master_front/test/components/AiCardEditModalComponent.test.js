import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AiCardEditModal from '@/components/AiCardEditModalComponent.vue'

// ── Fixtures ──────────────────────────────────────────────────────────────────

const MIND_MAP = {
  id: 'map-1',
  title: 'Électricité',
  subjectNodeId: 'n-subject',
  nodes: {
    'n-subject': { id: 'n-subject', label: 'Électricité', style: {}, layout: { x: 400, y: 300 }, meta: { isSubject: true } },
    'n-ohm': { id: 'n-ohm', label: "Loi d'Ohm", style: {}, layout: { x: 700, y: 300 }, meta: {} },
  },
  links: [{ id: 'l-1', from: 'n-subject', to: 'n-ohm' }],
}

const openCard = {
  id: 1,
  statement: 'Qu\'est-ce que la loi d\'Ohm ?',
  type: 'open',
  answer: 'U = R × I',
  acceptedAnswers: [],
  options: null,
  mindMapNodeId: null,
}

// ── Tests ─────────────────────────────────────────────────────────────────────
// Régression : les cartes générées par IA n'avaient aucun moyen d'être liées à un
// nœud de carte mentale, contrairement aux cartes créées manuellement — demande
// explicite de l'utilisateur (2026-09-04).

describe('AiCardEditModalComponent', () => {
  it("n'affiche pas le sélecteur de nœud quand le système n'a pas de carte mentale liée (mindMapJson absent)", () => {
    const wrapper = mount(AiCardEditModal, {
      props: { visible: true, card: openCard, mindMapJson: null },
    })
    expect(wrapper.find('.mindmap-node-picker').exists()).toBe(false)
  })

  it('affiche le sélecteur de nœud quand une carte mentale est liée au système', () => {
    const wrapper = mount(AiCardEditModal, {
      props: { visible: true, card: openCard, mindMapJson: MIND_MAP },
    })
    expect(wrapper.find('.mindmap-node-picker').exists()).toBe(true)
    expect(wrapper.text()).toContain("Loi d'Ohm")
  })

  it('pré-remplit le sélecteur avec le nœud déjà lié à la carte, à l\'ouverture', () => {
    const wrapper = mount(AiCardEditModal, {
      props: { visible: true, card: { ...openCard, mindMapNodeId: 'n-ohm' }, mindMapJson: MIND_MAP },
    })
    expect(wrapper.text()).toContain('Nœud lié')
  })

  it('choisir un nœud puis enregistrer émet "save" avec mindMapNodeId', async () => {
    const wrapper = mount(AiCardEditModal, {
      props: { visible: true, card: openCard, mindMapJson: MIND_MAP },
    })

    // Clique sur le nœud "Loi d'Ohm" dans le SVG du sélecteur (role="button")
    const nodeButtons = wrapper.findAll('[role="button"][aria-label*="Lier la carte au nœud"]')
    await nodeButtons.find((b) => b.attributes('aria-label').includes("Loi d'Ohm")).trigger('click')

    await wrapper.find('form').trigger('submit')

    expect(wrapper.emitted('save')).toBeTruthy()
    expect(wrapper.emitted('save')[0][0]).toEqual(
      expect.objectContaining({ mindMapNodeId: 'n-ohm' })
    )
  })

  it('enregistrer sans toucher au sélecteur conserve mindMapNodeId à null', async () => {
    const wrapper = mount(AiCardEditModal, {
      props: { visible: true, card: openCard, mindMapJson: MIND_MAP },
    })

    await wrapper.find('form').trigger('submit')

    expect(wrapper.emitted('save')[0][0]).toEqual(
      expect.objectContaining({ mindMapNodeId: null })
    )
  })

  it('carte déjà liée à un nœud — retirer le lien puis enregistrer émet mindMapNodeId: null', async () => {
    const wrapper = mount(AiCardEditModal, {
      props: { visible: true, card: { ...openCard, mindMapNodeId: 'n-ohm' }, mindMapJson: MIND_MAP },
    })

    const removeBtn = wrapper.findAll('button').find((b) => b.text() === 'Retirer')
    await removeBtn.trigger('click')
    await wrapper.find('form').trigger('submit')

    expect(wrapper.emitted('save')[0][0]).toEqual(
      expect.objectContaining({ mindMapNodeId: null })
    )
  })
})
