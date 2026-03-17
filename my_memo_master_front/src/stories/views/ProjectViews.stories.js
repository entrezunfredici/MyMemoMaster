import App from '@/App.vue'
import { useAuthStore } from '@/stores/auth'
import { useRoleStore } from '@/stores/roles'
import { useSubjectStore } from '@/stores/subjects'
import { useTestStore } from '@/stores/test'

const meta = {
  title: 'Documentation/Vues',
  component: App,
  parameters: {
    docs: {
      description: {
        component:
          'Stories de reference pour documenter les ecrans routes du front MyMemoMaster dans leur contexte applicatif.',
      },
    },
  },
}

export default meta

const mockUser = {
  userId: 1,
  name: 'Jeannine',
  connectionToken: 'storybook-token',
}

const mockSubjects = [
  { subjectId: 1, name: 'Mathematiques' },
  { subjectId: 2, name: 'Physique' },
  { subjectId: 3, name: 'Histoire' },
]

const mockTests = [
  {
    idTest: 1,
    name: 'Equations differentielles',
    description: 'Serie de questions a choix libre autour des equations lineaires.',
    url: 'https://example.com/tests/equations-differentielles',
    subjectId: 1,
    subject: { name: 'Mathematiques' },
    revision_tips: true,
  },
  {
    idTest: 2,
    name: 'Lois de Newton',
    description: 'Questions de revision sur la mecanique classique et ses lois.',
    url: 'https://example.com/tests/lois-newton',
    subjectId: 2,
    subject: { name: 'Physique' },
    revision_tips: false,
  },
]

const renderApp = () => ({
  components: { App },
  template: '<App />',
})

const buildRouteStory = ({ route, description, storySetup }) => ({
  render: renderApp,
  parameters: {
    route,
    storySetup,
    docs: {
      description: {
        story: description,
      },
    },
  },
})

const chainSetup =
  (...steps) =>
  async () => {
    for (const step of steps.filter(Boolean)) {
      await step()
    }
  }

const withAuthenticatedUser = async () => {
  const authStore = useAuthStore()
  authStore.authenticated = true
  authStore.token = 'storybook-token'
  authStore.user = { ...mockUser }
}

const withSubjects = async () => {
  const subjectStore = useSubjectStore()
  subjectStore.subjects = [...mockSubjects]
  subjectStore.fetchSubjects = async () => true
}

const withTests = async () => {
  const testStore = useTestStore()
  testStore.tests = [...mockTests]
  testStore.fetchTests = async () => true
}

const withAdminRole = async () => {
  const roleStore = useRoleStore()
  roleStore.role = { roleId: 1, name: 'Admin' }
  roleStore.fetchRoleById = async () => true
}

export const Home = buildRouteStory({
  route: '/',
  description: "Vue d'accueil avec le menu principal et l'interpreteur mathematique.",
})

export const Login = buildRouteStory({
  route: '/auth',
  description: 'Ecran de connexion sans authentification active.',
})

export const Register = buildRouteStory({
  route: '/register',
  description:
    "Ecran d'inscription tel qu'il est aujourd'hui branche dans le routeur et le layout applicatif.",
})

export const Credits = buildRouteStory({
  route: '/credits',
  description: 'Vue de credits statique et autonome.',
})

export const Tutorials = buildRouteStory({
  route: '/tutorials',
  description: 'Catalogue de tutoriels avec store de matieres simule.',
  storySetup: withSubjects,
})

export const Exercises = buildRouteStory({
  route: '/exercises',
  description: 'Vue liste des exercices avec donnees de tests et matieres simulees.',
  storySetup: chainSetup(withAuthenticatedUser, withSubjects, withTests),
})

export const Flashcards = buildRouteStory({
  route: '/flashcards',
  description: 'Vue Flashcards dans le shell principal.',
  storySetup: withAuthenticatedUser,
})

export const CreateTest = buildRouteStory({
  route: '/create-test',
  description: 'Vue de creation de quiz dans le shell principal.',
  storySetup: withAuthenticatedUser,
})

export const Classroom = buildRouteStory({
  route: '/classroom',
  description: 'Vue Classroom actuellement reduite a un placeholder.',
  storySetup: withAuthenticatedUser,
})

export const Onboarding = buildRouteStory({
  route: '/onboarding',
  description: 'Vue Onboarding actuellement reduite a un placeholder.',
  storySetup: withAuthenticatedUser,
})

export const Account = buildRouteStory({
  route: '/account',
  description: 'Vue Mon compte actuellement reduite a un placeholder.',
  storySetup: withAuthenticatedUser,
})

export const Profile = buildRouteStory({
  route: '/profile',
  description: 'Vue Profil avec role admin simule.',
  storySetup: chainSetup(withAuthenticatedUser, withAdminRole),
})

export const Settings = buildRouteStory({
  route: '/settings',
  description: 'Vue Parametres avec role admin simule.',
  storySetup: chainSetup(withAuthenticatedUser, withAdminRole),
})

export const Error500 = buildRouteStory({
  route: '/error-server',
  description: 'Page de repli serveur.',
})

export const Error404 = buildRouteStory({
  route: '/storybook-route-inconnue',
  description: 'Page de repli pour une route inconnue via le catch-all.',
})
