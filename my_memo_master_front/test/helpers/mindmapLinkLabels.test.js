import { describe, it, expect } from 'vitest'
import { linkLabelText, linkLabelWidth, layoutLinkLabels } from '@/helpers/mindmap/mindmapLinks'

describe('linkLabelText', () => {
  it('libellé du type, préfixé du rang de lecture quand il y en a un', () => {
    expect(linkLabelText('Calcul', 'calcul', null)).toBe('Calcul')
    expect(linkLabelText('Calcul', 'calcul', 2)).toBe('2. Calcul')
  })

  it('sans libellé, retombe sur l’identifiant du type ; sans rien : vide, même avec un rang', () => {
    expect(linkLabelText('', 'maison', 1)).toBe('1. maison')
    expect(linkLabelText('', '', 3)).toBe('')
    expect(linkLabelText(undefined, undefined, null)).toBe('')
  })
})

describe('linkLabelWidth', () => {
  it('largeur minimale pour un texte court', () => {
    expect(linkLabelWidth('')).toBe(48)
    expect(linkLabelWidth('ab')).toBe(48)
  })

  it('assez large pour « appartenance » (police 12 px en gras) : plus que l’ancienne estimation de 7 px par lettre', () => {
    const old = 'appartenance'.length * 7 + 18
    expect(linkLabelWidth('appartenance')).toBeGreaterThan(old)
    expect(linkLabelWidth('2. Appartenance')).toBeGreaterThan(linkLabelWidth('appartenance'))
  })

  it('croît avec la longueur', () => {
    expect(linkLabelWidth('x'.repeat(30))).toBeGreaterThan(linkLabelWidth('x'.repeat(20)))
  })
})

describe('layoutLinkLabels', () => {
  const label = (id, x, y, width = 80) => ({ id, x, y, width })
  const box = (item, offset) => ({ x1: item.x - item.width / 2, x2: item.x + item.width / 2, y1: item.y + offset - 11, y2: item.y + offset + 11 })
  const overlap = (a, b) => !(a.x2 <= b.x1 || a.x1 >= b.x2 || a.y2 <= b.y1 || a.y1 >= b.y2)

  it('aucune étiquette : aucun décalage', () => {
    expect(layoutLinkLabels([])).toEqual({})
  })

  it('une étiquette seule ou des étiquettes éloignées restent en place', () => {
    expect(layoutLinkLabels([label('a', 0, 0)])).toEqual({ a: 0 })
    expect(layoutLinkLabels([label('a', 0, 0), label('b', 500, 0), label('c', 0, 300)])).toEqual({ a: 0, b: 0, c: 0 })
  })

  it('deux étiquettes superposées : la première reste, la seconde est décalée vers le haut', () => {
    const offsets = layoutLinkLabels([label('a', 0, 0), label('b', 10, 0)])
    expect(offsets.a).toBe(0)
    expect(offsets.b).toBeLessThan(0)
  })

  it('l’ordre donne la priorité : l’étiquette passée en premier ne bouge jamais', () => {
    const offsets = layoutLinkLabels([label('b', 10, 0), label('a', 0, 0)])
    expect(offsets.b).toBe(0)
    expect(offsets.a).not.toBe(0)
  })

  it('beaucoup d’étiquettes au même endroit : aucune ne chevauche une autre', () => {
    const items = Array.from({ length: 8 }, (_, i) => label(`l${i}`, i * 3, 0))
    const offsets = layoutLinkLabels(items)
    const boxes = items.map((item) => box(item, offsets[item.id]))
    for (let i = 0; i < boxes.length; i += 1) {
      for (let j = i + 1; j < boxes.length; j += 1) expect(overlap(boxes[i], boxes[j])).toBe(false)
    }
    expect(new Set(Object.values(offsets)).size).toBe(8)
  })

  it('des étiquettes qui se touchent à peine (marge comprise) sont séparées', () => {
    // largeur 80 : centres à 82 px = 2 px d’écart seulement, moins que la marge de 4 px
    const offsets = layoutLinkLabels([label('a', 0, 0), label('b', 82, 0)])
    expect(offsets.b).not.toBe(0)
  })

  it('des étiquettes assez espacées ne bougent pas', () => {
    expect(layoutLinkLabels([label('a', 0, 0), label('b', 90, 0)])).toEqual({ a: 0, b: 0 })
  })

  it('un pas décale d’une hauteur d’étiquette et sa marge (26 px) ; l’alternance haut/bas ensuite', () => {
    const offsets = layoutLinkLabels([label('a', 0, 0), label('b', 0, 0), label('c', 0, 0)])
    expect(offsets).toEqual({ a: 0, b: -26, c: 26 })
  })

  it('ne modifie pas les étiquettes reçues', () => {
    const items = [label('a', 0, 0), label('b', 0, 0)]
    const copy = structuredClone(items)
    layoutLinkLabels(items)
    expect(items).toEqual(copy)
  })
})
