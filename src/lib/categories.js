/**
 * Single source of truth for course categories (technology-only) and their
 * icons. Used by admin/teacher forms, public filters and course cards.
 */
import {
  BrainCircuit,
  Globe,
  Code2,
  Cloud,
  ShieldCheck,
  Network,
  Palette,
  Megaphone,
  Briefcase,
} from 'lucide-react'

export const CATEGORIES = [
  'AI & Data',
  'Web Development',
  'Programming',
  'Cloud & DevOps',
  'Cyber Security',
  'Networking',
  'Design',
  'Digital Marketing',
  'Business Software',
]

export const CATEGORY_ICONS = {
  'AI & Data': BrainCircuit,
  'Web Development': Globe,
  'Programming': Code2,
  'Cloud & DevOps': Cloud,
  'Cyber Security': ShieldCheck,
  'Networking': Network,
  'Design': Palette,
  'Digital Marketing': Megaphone,
  'Business Software': Briefcase,
}

/** Resolve the icon for a course category (falls back to Code2). */
export function categoryIcon(category) {
  return CATEGORY_ICONS[category] || Code2
}
