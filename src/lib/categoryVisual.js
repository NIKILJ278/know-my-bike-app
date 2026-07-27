import { FuelIcon, WrenchIcon, ShieldIcon, BackpackIcon, PinIcon, NoteIcon } from '../components/icons/Icon.jsx'

export const CATEGORY_VISUAL = {
  Fuel: { bg: 'bg-pastel-yellow', tint: 'text-amber-dark', icon: FuelIcon },
  Service: { bg: 'bg-pastel-blue', tint: 'text-blue-700', icon: WrenchIcon },
  Repair: { bg: 'bg-pastel-orange', tint: 'text-orange-700', icon: WrenchIcon },
  Insurance: { bg: 'bg-pastel-green', tint: 'text-green-700', icon: ShieldIcon },
  Accessories: { bg: 'bg-pastel-pink', tint: 'text-pink-700', icon: BackpackIcon },
  Trip: { bg: 'bg-pastel-teal', tint: 'text-teal-700', icon: PinIcon },
  Other: { bg: 'bg-surface-muted dark:bg-surface-darkmuted', tint: 'text-ink/60 dark:text-white/60', icon: NoteIcon },
}

export function visualFor(category) {
  return CATEGORY_VISUAL[category] || CATEGORY_VISUAL.Other
}

// Slightly more saturated tones (same hue families as the pastel palette)
// used for report bar-fills, where a light pastel wouldn't read against a
// muted card background. Each category gets its own distinct hue so the
// spending breakdown chart doesn't read as "everything looks the same."
export const CATEGORY_BAR_COLOR = {
  Fuel: '#F2A93B',
  Service: '#6FA8DC',
  Repair: '#E08A3E',
  Insurance: '#4CAF7D',
  Accessories: '#E38AA0',
  Trip: '#2FB6A6',
  Other: '#9AA0AC',
}

export function barColorFor(category) {
  return CATEGORY_BAR_COLOR[category] || CATEGORY_BAR_COLOR.Other
}
