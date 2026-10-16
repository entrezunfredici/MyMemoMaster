/* eslint-env node */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { FALLBACKS, themeColor, themeHex, themeRgba, contrastRatio, readableTextColor, tagColors } from '@/helpers/themeColors'

// Les valeurs de repli de themeColors.js (utilisées hors navigateur) doivent rester
// identiques à src/assets/base.css : source unique des couleurs.
const baseCss = readFileSync(resolve(process.cwd(), 'src/assets/base.css'), 'utf8')
const declared = new Map([...baseCss.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]))

const toHex = (value) => {
  if (value.startsWith('#')) return value.toLowerCase()
  return '#' + value.split(/\s+/).map((n) => Number(n).toString(16).padStart(2, '0')).join('')
}

describe('themeColors — repli identique à base.css', () => {
  it.each(Object.entries(FALLBACKS))('%s', (name, fallback) => {
    expect(declared.has(name), `${name} doit être défini dans base.css`).toBe(true)
    expect(fallback.toLowerCase()).toBe(toHex(declared.get(name)))
  })
})

describe('themeColors — conversions', () => {
  it('themeColor rend la valeur de repli hors feuille de style', () => {
    expect(themeColor('--mindmap-node-bg')).toBe('#1E3A8A')
  })

  it('themeHex convertit un triplet RGB (variable de thème) et un hex en #rrggbb minuscule', () => {
    expect(themeHex('--primary')).toBe('#1e3ba1')
    expect(themeHex('--white')).toBe('#ffffff')
    expect(themeHex('--gray-400')).toBe('#9ca3af')
  })

  it('themeRgba produit une couleur utilisable par un canvas', () => {
    expect(themeRgba('--primary', 0.15)).toBe('rgba(30, 59, 161, 0.15)')
    expect(themeRgba('--red-500', 0.85)).toBe('rgba(239, 68, 68, 0.85)')
  })
})

describe('themeColors — couleurs de tags', () => {
  it('15 couleurs distinctes, en #RRGGBB majuscules (format enregistré en base)', () => {
    const { palette } = tagColors
    expect(palette).toHaveLength(15)
    expect(new Set(palette).size).toBe(15)
    palette.forEach((color) => expect(color).toMatch(/^#[0-9A-F]{6}$/))
  })

  it('même palette et même couleur par défaut qu’avant la migration vers base.css', () => {
    expect(tagColors.palette).toEqual([
      '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16',
      '#22C55E', '#10B981', '#14B8A6', '#06B6D4', '#3B82F6',
      '#6366F1', '#8B5CF6', '#D946EF', '#EC4899', '#64748B',
    ])
    expect(tagColors.default).toBe('#6366F1')
  })
})

describe('base.css — contraste du texte sur les fonds de thème', () => {
  // Garde-fou RGAA 3.2 : les couples texte/fond du thème ne doivent pas régresser.
  const lum = (hex) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  }
  const ratio = (a, b) => {
    const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p)
    return (x + 0.05) / (y + 0.05)
  }

  it('blanc sur --primary et sur --primary-dark : au moins 4,5:1', () => {
    expect(ratio(themeHex('--white'), themeHex('--primary'))).toBeGreaterThanOrEqual(4.5)
    expect(ratio(themeHex('--white'), toHex(declared.get('--primary-dark')))).toBeGreaterThanOrEqual(4.5)
  })

  it('--accent (liens, onglets actifs du calendrier) sur blanc : au moins 4,5:1', () => {
    expect(ratio(toHex(declared.get('--accent')), themeHex('--white'))).toBeGreaterThanOrEqual(4.5)
  })
})

describe('themeColors — texte lisible sur une couleur de tag', () => {
  it('chaque couleur de la palette des tags donne au moins 4,5:1 (blanc ou foncé selon le fond)', () => {
    tagColors.palette.forEach((color) => {
      expect(contrastRatio(readableTextColor(color), color), color).toBeGreaterThanOrEqual(4.5)
    })
  })

  it('blanc sur fond sombre, foncé sur fond clair', () => {
    expect(readableTextColor('#1e3a8a')).toBe('#ffffff')
    expect(readableTextColor('#fde68a')).toBe('#000000')
  })

  it('quelle que soit la couleur libre, le contraste atteint 4,5:1', () => {
    for (let r = 0; r < 256; r += 51) for (let g = 0; g < 256; g += 51) for (let b = 0; b < 256; b += 51) {
      const hex = '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')
      expect(contrastRatio(readableTextColor(hex), hex), hex).toBeGreaterThanOrEqual(4.5)
    }
  })
})
