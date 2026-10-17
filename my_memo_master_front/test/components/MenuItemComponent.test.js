import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import MenuItem from '@/components/MenuItemComponent.vue'

const mountItem = (props = {}) =>
  mount(MenuItem, { props: { title: 'Algèbre', actionLabel: 'Commencer', onAction: vi.fn(), ...props } })

describe('MenuItemComponent', () => {
  it('titre, description et action principale', async () => {
    const onAction = vi.fn()
    const w = mountItem({ description: 'Maths', onAction })
    expect(w.find('h5').text()).toBe('Algèbre')
    expect(w.text()).toContain('Maths')
    await w.findAll('button').find((b) => b.text() === 'Commencer').trigger('click')
    expect(onAction).toHaveBeenCalledTimes(1)
  })

  it('RGAA 6.1 / 11.9 : les boutons ✎ et ✕ citent l’élément concerné dans leur nom accessible', () => {
    const w = mountItem({ onEdit: vi.fn(), onDelete: vi.fn() })
    expect(w.find('button[aria-label="Modifier Algèbre"]').exists()).toBe(true)
    expect(w.find('button[aria-label="Supprimer Algèbre"]').exists()).toBe(true)
  })

  it('deux cartes ont des noms de boutons distincts', () => {
    const a = mountItem({ title: 'Algèbre', onEdit: vi.fn() })
    const b = mountItem({ title: 'Analyse', onEdit: vi.fn() })
    expect(a.find('button[aria-label^="Modifier"]').attributes('aria-label')).not.toBe(
      b.find('button[aria-label^="Modifier"]').attributes('aria-label'),
    )
  })

  it('modifier et supprimer appellent leurs fonctions', async () => {
    const onEdit = vi.fn()
    const onDelete = vi.fn()
    const w = mountItem({ onEdit, onDelete })
    await w.find('button[aria-label^="Modifier"]').trigger('click')
    await w.find('button[aria-label^="Supprimer"]').trigger('click')
    expect(onEdit).toHaveBeenCalledTimes(1)
    expect(onDelete).toHaveBeenCalledTimes(1)
  })

  it('sans fonction de modification ou de suppression, les boutons sont absents', () => {
    const w = mountItem()
    expect(w.find('button[aria-label^="Modifier"]').exists()).toBe(false)
    expect(w.find('button[aria-label^="Supprimer"]').exists()).toBe(false)
  })

  it('le contenu supplémentaire passe par le slot « stats »', () => {
    const w = mount(MenuItem, {
      props: { title: 'T', actionLabel: 'Go', onAction: vi.fn() },
      slots: { stats: '<span data-testid="extra">12 cartes</span>' },
    })
    expect(w.find('[data-testid="extra"]').text()).toBe('12 cartes')
  })
})
