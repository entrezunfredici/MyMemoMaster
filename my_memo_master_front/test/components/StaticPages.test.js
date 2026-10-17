import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AccountPage from '@/pages/AccountPage.vue'
import CommunityPage from '@/pages/CommunityPage.vue'
import OnboardingPage from '@/pages/OnboardingPage.vue'
import CreditsPage from '@/pages/CreditsPage.vue'

// Pages sans logique : leur test sert de filet (elles se montent, rendent leur contenu, et la
// structure sémantique du tableau des crédits reste conforme au RGAA).
describe('Pages statiques', () => {
  it('AccountPage - se monte et affiche son contenu provisoire', () => {
    expect(mount(AccountPage).text()).toBe('WIP')
  })

  it('CommunityPage - se monte et affiche son contenu provisoire', () => {
    expect(mount(CommunityPage).text()).toBe('Salut salut')
  })

  it('OnboardingPage - affiche le titre de la section', () => {
    const wrapper = mount(OnboardingPage)
    expect(wrapper.find('section h4').text()).toBe('Informations utilisateur')
  })
})

describe('CreditsPage', () => {
  const wrapper = mount(CreditsPage)
  const rows = () => wrapper.findAll('tbody tr')

  it('affiche le remerciement', () => {
    expect(wrapper.text()).toContain('remercier chaleureusement')
  })

  it('liste les 14 membres de l’équipe', () => {
    expect(rows()).toHaveLength(14)
  })

  it('chaque ligne a 4 cellules : prénom, nom, fonction, période', () => {
    rows().forEach((row) => expect(row.findAll('td')).toHaveLength(4))
    expect(rows()[1].findAll('td').map((td) => td.text())).toEqual([
      'Anthony',
      'Lalba',
      'Lead tech, développeur & associé',
      '17/10/2024 - +∞',
    ])
  })

  it('un nom de famille absent est remplacé par « N/A »', () => {
    const jordan = rows().find((row) => row.text().startsWith('Jordan'))
    expect(jordan.findAll('td')[1].text()).toBe('N/A')
  })

  it('RGAA 5 : le tableau a une légende (masquée visuellement) et des en-têtes de colonne', () => {
    expect(wrapper.find('table caption.sr-only').text()).toBe('Équipe ayant travaillé sur My Memo Master')
    const headers = wrapper.findAll('thead th')
    expect(headers.map((th) => th.text())).toEqual(['Prénom', 'Nom', 'Fonction', 'Période'])
    headers.forEach((th) => expect(th.attributes('scope')).toBe('col'))
  })
})
