import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import FormulaText from '@/components/FormulaTextComponent.vue'
import FormulaHelper from '@/components/FormulaHelperComponent.vue'
import {
  renderInlineMath,
  hasFormula,
  escapeHtml,
  normalizeFormulaSyntax,
} from '@/components/interpreter/interpreter.js'

// ── renderInlineMath : texte mixte -> HTML (KaTeX pour les segments $…$) ──────

describe('renderInlineMath', () => {
  it('rend une formule $…$ en KaTeX au milieu du texte (cas nominal)', () => {
    const html = renderInlineMath('Calcule $sqrt(16)$ puis conclus')
    expect(html).toContain('katex')
    expect(html).toContain('Calcule ')
    expect(html).toContain(' puis conclus')
  })

  it('rend plusieurs formules dans le même texte', () => {
    const html = renderInlineMath('$a^2$ + $b^2$ = $c^2$')
    expect(html.match(/class="katex"/g)?.length).toBe(3)
  })

  it('retourne le texte échappé tel quel sans délimiteur $', () => {
    expect(renderInlineMath('Bonjour tout le monde')).toBe('Bonjour tout le monde')
  })

  it("laisse littéral un '$' non apparié (cas limite)", () => {
    const html = renderInlineMath('Le prix est 5$')
    expect(html).not.toContain('katex')
    expect(html).toContain('5$')
  })

  it('laisse littéral un double délimiteur vide $$ (cas limite)', () => {
    expect(renderInlineMath('$$')).toBe('$$')
  })

  it('échappe le HTML des segments de texte (pas d’injection via v-html)', () => {
    const html = renderInlineMath('<img src=x onerror=alert(1)> $x$')
    expect(html).toContain('&lt;img')
    expect(html).not.toContain('<img')
  })

  it('ne jette pas sur une formule invalide (throwOnError désactivé)', () => {
    expect(() => renderInlineMath('$frac(1,$')).not.toThrow()
  })

  it('retourne une chaîne vide pour null/undefined (erreur attendue)', () => {
    expect(renderInlineMath(null)).toBe('')
    expect(renderInlineMath(undefined)).toBe('')
  })
})

describe('hasFormula / escapeHtml', () => {
  it('détecte la présence d’une formule $…$', () => {
    expect(hasFormula('énoncé avec $x^2$')).toBe(true)
    expect(hasFormula('énoncé sans formule')).toBe(false)
    expect(hasFormula('un seul $ isolé')).toBe(false)
    expect(hasFormula(null)).toBe(false)
  })

  it('échappe les caractères HTML sensibles', () => {
    expect(escapeHtml('<b>&"</b>')).toBe('&lt;b&gt;&amp;&quot;&lt;/b&gt;')
  })
})

describe('normalizeFormulaSyntax', () => {
  it('réécrit frac( en over( — syntaxe canonique unique', () => {
    expect(normalizeFormulaSyntax('$frac(1, 2)$')).toBe('$over(1, 2)$')
    expect(normalizeFormulaSyntax('a $frac(x, y)$ et $frac(1, 3)$')).toBe('a $over(x, y)$ et $over(1, 3)$')
  })

  it('laisse intact un texte déjà canonique ou sans formule', () => {
    expect(normalizeFormulaSyntax('$over(1, 2)$')).toBe('$over(1, 2)$')
    expect(normalizeFormulaSyntax('fracture du texte')).toBe('fracture du texte')
    expect(normalizeFormulaSyntax(null)).toBe('')
  })
})

// ── FormulaTextComponent : affichage ──────────────────────────────────────────

describe('FormulaTextComponent', () => {
  it('affiche le texte brut sans formule', () => {
    const wrapper = mount(FormulaText, { props: { text: 'Question simple' } })
    expect(wrapper.text()).toContain('Question simple')
    expect(wrapper.html()).not.toContain('katex')
  })

  it('rend la partie $…$ en KaTeX', () => {
    const wrapper = mount(FormulaText, { props: { text: 'Résous $over(1, 2)$' } })
    expect(wrapper.html()).toContain('katex')
    expect(wrapper.text()).toContain('Résous')
  })

  it('échappe le HTML du texte (sécurité v-html)', () => {
    const wrapper = mount(FormulaText, { props: { text: '<script>alert(1)</script>' } })
    expect(wrapper.html()).not.toContain('<script>')
  })
})

// ── FormulaHelperComponent : champ en slot + bouton ƒ latéral + insertion ─────

describe('FormulaHelperComponent', () => {
  const mountHelper = (modelValue, { disabled = false } = {}) =>
    mount(FormulaHelper, {
      props: { modelValue, disabled },
      slots: { default: '<textarea class="field" />' },
    })

  const findInsertButton = (wrapper) =>
    wrapper.find('button[aria-label="Insérer une formule mathématique"]')

  const applyFormula = async (wrapper, formula) => {
    if (formula !== undefined) {
      await wrapper.get('[role="dialog"] textarea').setValue(formula)
    }
    const applyBtn = wrapper
      .findAll('[role="dialog"] button')
      .find((b) => b.text() === 'Insérer')
    await applyBtn.trigger('click')
  }

  it('affiche le champ (slot) et le bouton ƒ à côté, sans modale ni aperçu', () => {
    const wrapper = mountHelper('')
    expect(wrapper.find('textarea.field').exists()).toBe(true)
    expect(findInsertButton(wrapper).exists()).toBe(true)
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Aperçu')
  })

  it('masque le bouton quand disabled (champ verrouillé)', () => {
    const wrapper = mountHelper('', { disabled: true })
    expect(findInsertButton(wrapper).exists()).toBe(false)
    expect(wrapper.find('textarea.field').exists()).toBe(true)
  })

  it('affiche l’aperçu rendu quand la valeur contient une formule', () => {
    const wrapper = mountHelper('aire : $pi r^2$')
    expect(wrapper.text()).toContain('Aperçu')
    expect(wrapper.html()).toContain('katex')
  })

  it('ouvre la modale de l’interpréteur au clic sur le bouton', async () => {
    const wrapper = mountHelper('')
    await findInsertButton(wrapper).trigger('click')
    expect(wrapper.find('[role="dialog"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Interpréteur de formules')
  })

  it('insère la formule $…$ à la position du curseur du champ (cas nominal)', async () => {
    const wrapper = mountHelper('ab')
    const field = wrapper.get('textarea.field')
    await field.setValue('ab')
    field.element.setSelectionRange(1, 1)

    await findInsertButton(wrapper).trigger('click')
    await applyFormula(wrapper, 'x^2')

    expect(wrapper.emitted('update:modelValue')?.at(-1)?.[0]).toBe('a$x^2$b')
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
  })

  it('insère en fin de valeur si le champ du slot n’est pas synchronisé (cas limite)', async () => {
    const wrapper = mountHelper('Énoncé')
    await findInsertButton(wrapper).trigger('click')
    await applyFormula(wrapper, 'sqrt(2)')
    expect(wrapper.emitted('update:modelValue')?.at(-1)?.[0]).toBe('Énoncé$sqrt(2)$')
  })

  it('normalise la syntaxe insérée : frac devient over', async () => {
    const wrapper = mountHelper('')
    await findInsertButton(wrapper).trigger('click')
    await applyFormula(wrapper, 'frac(1, 2)')
    expect(wrapper.emitted('update:modelValue')?.at(-1)?.[0]).toBe('$over(1, 2)$')
  })

  it('ferme sans émettre si la formule appliquée est vide (cas limite)', async () => {
    const wrapper = mountHelper('Énoncé')
    await findInsertButton(wrapper).trigger('click')
    await applyFormula(wrapper, undefined)
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
  })
})
