import { RouterLink } from 'vue-router'
import { CalendarDaysIcon } from '@heroicons/vue/24/outline'
import FlashardIcon from '@/icons/FlashardIcon.vue'
import MindmapIcon from '@/icons/MindmapIcon.vue'
import ExercisesIcon from '@/icons/ExercisesIcon.vue'
import ClassroomIcon from '@/icons/ClassroomIcon.vue'

const menuItems = [
  {
    label: 'Boite leitner',
    to: '/flashcards',
    color: '#2f49bf',
    icon: FlashardIcon,
  },
  {
    label: 'Mind map',
    to: '/mindmaps',
    color: '#257f9f',
    icon: MindmapIcon,
  },
  {
    label: 'Exercices',
    to: '/exercises',
    color: '#73299a',
    icon: ExercisesIcon,
  },
  {
    label: 'Calendrier',
    to: '/tutorials',
    color: '#3450cf',
    icon: CalendarDaysIcon,
  },
  {
    label: 'Groupes classes',
    to: '/classroom',
    color: '#2d8b72',
    icon: ClassroomIcon,
  },
]

export default {
  name: 'HomePageMenu',
  components: {
    RouterLink,
  },
  setup() {
    return {
      menuItems,
    }
  },
}
