export const CATEGORY_VISUAL = {
  Fuel: { bg: 'bg-pastel-yellow', emoji: '⛽' },
  Service: { bg: 'bg-pastel-blue', emoji: '🔧' },
  Repair: { bg: 'bg-pastel-blue', emoji: '🛠️' },
  Insurance: { bg: 'bg-pastel-green', emoji: '🛡️' },
  Accessories: { bg: 'bg-pastel-pink', emoji: '🎒' },
  Trip: { bg: 'bg-pastel-blue', emoji: '📍' },
  Other: { bg: 'bg-surface-muted dark:bg-surface-darkmuted', emoji: '📝' },
}

export function visualFor(category) {
  return CATEGORY_VISUAL[category] || CATEGORY_VISUAL.Other
}

// Slightly more saturated tones (same hue families as the pastel palette)
// used for report bar-fills, where a light pastel wouldn't read against a
// muted card background.
export const CATEGORY_BAR_COLOR = {
  Fuel: '#F2A93B',
  Service: '#6FA8DC',
  Repair: '#4A87C7',
  Insurance: '#4CAF7D',
  Accessories: '#E38AA0',
  Other: '#9AA0AC',
}

export function barColorFor(category) {
  return CATEGORY_BAR_COLOR[category] || CATEGORY_BAR_COLOR.Other
}
