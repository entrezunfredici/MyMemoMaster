import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AnswerQualityBadge from '@/components/AnswerQualityBadgeComponent.vue'

// AnswerQualityBadgeComponent — affichage synthétique du résultat de AnswerQuality.service.js
// (back), DECISIONS.md 2026-09-12. RGAA 3.3 : l'information n'est jamais portée par la seule
// couleur — chaque niveau garde une icône ET un libellé texte.

describe('AnswerQualityBadgeComponent', () => {
  it('n\'affiche rien quand level est null (non applicable, ex. carte QCM)', () => {
    const wrapper = mount(AnswerQualityBadge, { props: { level: null, warnings: [] } })
    expect(wrapper.text()).toBe('')
  })

  it('affiche "Bonne qualité" (vert) sans liste de détails pour le niveau "high"', () => {
    const wrapper = mount(AnswerQualityBadge, { props: { level: 'high', warnings: [] } })
    expect(wrapper.text()).toContain('Bonne qualité')
    expect(wrapper.find('.bg-green-100').exists()).toBe(true)
    expect(wrapper.find('ul').exists()).toBe(false)
  })

  it('affiche "À vérifier" (jaune) pour le niveau "medium"', () => {
    const wrapper = mount(AnswerQualityBadge, { props: { level: 'medium', warnings: ['un point'] } })
    expect(wrapper.text()).toContain('À vérifier')
    expect(wrapper.find('.bg-yellow-100').exists()).toBe(true)
  })

  it('affiche "À revoir" (rouge) et le détail des avertissements pour le niveau "low"', () => {
    const wrapper = mount(AnswerQualityBadge, {
      props: {
        level: 'low',
        warnings: ['La réponse ne semble mentionner aucun mot-clé distinctif…', 'Formule non balisée.'],
      },
    })
    expect(wrapper.text()).toContain('À revoir')
    expect(wrapper.find('.bg-red-100').exists()).toBe(true)
    const items = wrapper.findAll('li')
    expect(items).toHaveLength(2)
    expect(items[0].text()).toContain('mot-clé distinctif')
    expect(items[1].text()).toContain('Formule non balisée')
  })

  it('n\'affiche pas de liste quand aucun avertissement n\'est fourni, même avec un niveau non "high"', () => {
    // Cas limite : level fourni sans warnings (ne devrait pas arriver depuis le back, mais le
    // composant doit rester robuste plutôt que planter sur `warnings` absent).
    const wrapper = mount(AnswerQualityBadge, { props: { level: 'medium' } })
    expect(wrapper.find('ul').exists()).toBe(false)
  })
})
