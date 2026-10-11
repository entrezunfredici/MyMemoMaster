import { describe, it, expect } from 'vitest'
import {
  boxColorToHex,
  hexToBoxColor,
  ensureSecondaryColor,
} from '@/helpers/mindmap'
import { mindmapColors, themeColor } from '@/helpers/themeColors'

describe('couleurs des boîtes de Leitner', () => {
  it('convertit un entier 0xRRGGBB en hexadécimal', () => {
    expect(boxColorToHex(0xe74c3c)).toBe('#e74c3c')
    expect(boxColorToHex('2600544')).toBe('#27ae60')
    expect(boxColorToHex(0)).toBe('#000000')
  })

  it('retourne le gris par défaut pour une valeur invalide ou hors plage', () => {
    expect(boxColorToHex(undefined)).toBe('#C0C5D2')
    expect(boxColorToHex(-1)).toBe('#C0C5D2')
    expect(boxColorToHex(0x1000000)).toBe('#C0C5D2')
  })

  it('hexToBoxColor est l’inverse de boxColorToHex', () => {
    expect(hexToBoxColor('#F39C12')).toBe(0xf39c12)
    expect(boxColorToHex(hexToBoxColor('#2ecc71'))).toBe('#2ecc71')
  })

  it('hexToBoxColor refuse un format invalide', () => {
    expect(hexToBoxColor('rouge')).toBeNull()
    expect(hexToBoxColor('#fff')).toBeNull()
    expect(hexToBoxColor(undefined)).toBeNull()
  })
})

describe('ensureSecondaryColor — items liés à une flashcard', () => {
  it('conserve la couleur de la boîte quand l’item est lié', () => {
    const node = { idCard: 4, mastery: 'low', style: { secondaryColor: '#2ecc71' } }
    expect(ensureSecondaryColor(node).style.secondaryColor).toBe('#2ecc71')
  })

  it('applique la couleur neutre quand l’item n’est pas lié', () => {
    const node = { idCard: null, mastery: 'low', style: { secondaryColor: '#2ecc71' } }
    expect(ensureSecondaryColor(node).style.secondaryColor).toBe('#C0C5D2')
  })
})

describe('couleurs du thème (base.css)', () => {
  it('lit la variable CSS quand elle est définie', () => {
    document.documentElement.style.setProperty('--mindmap-node-bg', '#112233')
    try {
      expect(themeColor('--mindmap-node-bg')).toBe('#112233')
      expect(mindmapColors.nodeBg).toBe('#112233')
    } finally {
      document.documentElement.style.removeProperty('--mindmap-node-bg')
    }
  })

  it('retombe sur la valeur par défaut sans feuille de style', () => {
    expect(mindmapColors.nodeBg).toBe('#1E3A8A')
    expect(mindmapColors.secondary).toBe('#C0C5D2')
  })
})
