import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import AiValidationScreen from '@/components/AiValidationScreenComponent.vue'
import { useAiCardGenerationStore } from '@/stores/aiCardGeneration'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@/helpers/notif', () => ({ notif: { notify: vi.fn() } }))

// Stub minimal : se comporte comme un vrai composant contrôlé (v-model) pour vérifier
// le câblage (prop `mindMapJson` transmise, `save` remonté avec `mindMapNodeId`), sans
// dépendre du rendu SVG réel du sélecteur (déjà couvert par ses propres tests dédiés).
const AiCardEditModalStub = {
  name: 'AiCardEditModal',
  props: ['visible', 'card', 'mindMapJson'],
  emits: ['close', 'save'],
  template: '<div class="ai-card-edit-modal-stub" v-if="visible"><button class="stub-save" @click="$emit(\'save\', { statement: card.statement, type: card.type, answer: card.answer, acceptedAnswers: card.acceptedAnswers, options: card.options, mindMapNodeId: \'n-ohm\' })">save</button></div>',
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

const MIND_MAP = { id: 'map-1', title: 'Électricité', subjectNodeId: 'n-subject', nodes: {}, links: [] }

const BATCH = {
  id: 10,
  idSystem: 5,
  warnings: [],
  cards: [
    { id: 1, statement: 'Q1', type: 'open', answer: 'A1', acceptedAnswers: [], options: null, status: 'pending', mindMapNodeId: null },
  ],
}

function mountScreen(props = {}) {
  return mount(AiValidationScreen, {
    props: { batch: BATCH, mindMapJson: MIND_MAP, ...props },
    global: {
      plugins: [createTestingPinia({ createSpy: vi.fn, stubActions: true })],
      stubs: { AiCardEditModal: AiCardEditModalStub },
    },
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────
// Régression : les cartes générées par IA n'avaient aucun moyen d'être liées à un
// nœud de carte mentale — demande explicite de l'utilisateur (2026-09-04).

describe('AiValidationScreenComponent', () => {
  beforeEach(() => vi.clearAllMocks())

  it('transmet mindMapJson à AiCardEditModal', async () => {
    const wrapper = mountScreen()
    await wrapper.find('button[title="Modifier"]').trigger('click')

    const modal = wrapper.findComponent({ name: 'AiCardEditModal' })
    expect(modal.props('mindMapJson')).toEqual(MIND_MAP)
  })

  it('affiche le badge "🗺 nœud lié" après édition avec un nœud choisi', async () => {
    const wrapper = mountScreen()
    const store = useAiCardGenerationStore()
    store.updateCard.mockResolvedValue({ id: 1, statement: 'Q1', type: 'open', mindMapNodeId: 'n-ohm', status: 'edited' })

    expect(wrapper.text()).not.toContain('nœud lié')

    await wrapper.find('button[title="Modifier"]').trigger('click')
    await wrapper.find('.stub-save').trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('nœud lié')
  })

  it('n\'affiche pas le badge pour une carte sans nœud lié', () => {
    const wrapper = mountScreen()
    expect(wrapper.text()).not.toContain('nœud lié')
  })

  it('submit() transmet mindMapNodeId de la carte à promoteCard', async () => {
    const wrapper = mountScreen()
    const store = useAiCardGenerationStore()
    store.updateCard.mockResolvedValue({ id: 1, statement: 'Q1', type: 'open', mindMapNodeId: 'n-ohm', status: 'edited' })
    store.promoteCard.mockResolvedValue({ success: true })
    store.markBatchStatus.mockResolvedValue(true)

    await wrapper.find('button[title="Modifier"]').trigger('click')
    await wrapper.find('.stub-save').trigger('click')
    await wrapper.vm.$nextTick()

    await wrapper.find('.btn-modal-submit').trigger('click')
    await wrapper.vm.$nextTick()
    await new Promise((r) => setTimeout(r, 0))

    expect(store.promoteCard).toHaveBeenCalledWith(
      expect.objectContaining({ idSystem: 5, mindMapNodeId: 'n-ohm' })
    )
  })
})
