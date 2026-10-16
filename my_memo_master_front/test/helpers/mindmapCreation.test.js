import { describe, it, expect } from 'vitest'
import { ITEM_KINDS } from '@/helpers/mindmap/mindmapItems'
import {
  creationTools,
  creationLabels,
  normalizeCreationType,
  getNodeLabel,
  getSubjectActionLabel,
  getChildActionLabel,
} from '@/helpers/mindmap/mindmapCreation'

describe('mindmapCreation', () => {
  it('les types créables sont exactement les types d’items (source unique : ITEM_KINDS)', () => {
    expect(creationTools).toEqual(ITEM_KINDS.map((kind) => kind.id))
  })

  it('chaque type a ses trois libellés (ajouter un type sans libellé fait échouer ce test)', () => {
    for (const id of creationTools) {
      expect(creationLabels[id], id).toMatchObject({
        node: expect.any(String),
        subject: expect.any(String),
        child: expect.any(String),
      })
    }
  })

  it('un type inconnu retombe sur « text »', () => {
    expect(normalizeCreationType('nimporte')).toBe('text')
    expect(normalizeCreationType('graph')).toBe('graph')
    expect(getNodeLabel('nimporte')).toBe(creationLabels.text.node)
    expect(getSubjectActionLabel('graph')).toBe('Ajouter un graphique lié au sujet')
    expect(getChildActionLabel('graph')).toBe('Ajouter un graphique enfant')
  })
})
