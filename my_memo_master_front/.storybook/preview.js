import '../src/assets/main.css'
import '../src/tailwind.css'
import 'vue-toastification/dist/index.css'

import { setup } from '@storybook/vue3-vite'
import { createPinia, setActivePinia } from 'pinia'
import Toast from 'vue-toastification'

import router from '../src/router'
import { useAuthStore } from '../src/stores/auth'
import { useRoleStore } from '../src/stores/roles'
import { useSubjectStore } from '../src/stores/subjects'
import { useTestStore } from '../src/stores/test'

const pinia = createPinia()

setActivePinia(pinia)

const storyStores = [useAuthStore(), useRoleStore(), useSubjectStore(), useTestStore()]
const storeMethodSnapshots = new Map(
  storyStores.map((store) => [
    store.$id,
    Object.fromEntries(
      Object.entries(store)
        .filter(([key, value]) => typeof value === 'function' && !key.startsWith('$'))
        .map(([key, value]) => [key, value.bind(store)]),
    ),
  ]),
)

function resetStoryStores() {
  for (const store of storyStores) {
    store.$reset?.()

    const methods = storeMethodSnapshots.get(store.$id) || {}
    for (const [key, value] of Object.entries(methods)) {
      store[key] = value
    }
  }

  const authStore = useAuthStore()
  authStore.authenticated = false
  authStore.token = null
  authStore.user = {}
}

async function prepareStory(parameters) {
  resetStoryStores()

  if (typeof parameters.storySetup === 'function') {
    await parameters.storySetup()
  }

  await router.isReady()

  if (parameters.route) {
    try {
      await router.replace(parameters.route)
    } catch {
      // Ignore repeated navigations while moving between stories.
    }
  }
}

setup((app) => {
  app.use(pinia)
  app.use(router)
  app.use(Toast)
})

/** @type { import('@storybook/vue3-vite').Preview } */
const preview = {
  decorators: [
    (story, context) => {
      const Story = story()

      return {
        components: { Story },
        async setup() {
          await prepareStory(context.parameters)
          return {}
        },
        template: '<Story />',
      }
    },
  ],
  parameters: {
    layout: 'fullscreen',
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i
      }
    },

    a11y: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: 'todo'
    }
  }
}

export default preview
