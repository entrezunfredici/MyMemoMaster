import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import TodoPage from '@/pages/TodoPage.vue'
import { useRevisionSessionStore } from '@/stores/revisionSessions'
import { useDeadlineStore } from '@/stores/deadlines'

const mountPage = () =>
  mount(TodoPage, {
    global: {
      plugins: [createTestingPinia({ createSpy: vi.fn, stubActions: true })],
      stubs: { TodoWidget: { template: '<div data-testid="todo-widget" />' } },
    },
  })

describe('TodoPage', () => {
  it('affiche le titre et le widget', () => {
    const wrapper = mountPage()
    expect(wrapper.find('h1').text()).toBe('To-do')
    expect(wrapper.find('[data-testid="todo-widget"]').exists()).toBe(true)
  })

  it('affiche la date du jour en français', () => {
    const label = mountPage().find('.todo-date-label').text()
    const expected = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
    expect(label).toBe(expected)
  })

  it('charge les sessions de révision et les échéances au montage', async () => {
    const wrapper = mountPage()
    await flushPromises()
    expect(useRevisionSessionStore().fetchSessions).toHaveBeenCalledTimes(1)
    expect(useDeadlineStore().fetchDeadlines).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })
})
