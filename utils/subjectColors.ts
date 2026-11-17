import { Colors } from '@/constants/Colors';

type ThemeColors = typeof Colors.light;

export interface SubjectColor {
  bg: string;
  border: string;
  accent: string;
}

// Full-strength, equally-bright brand hues (same perceived brightness)
const SATURATED = [
  '#4F46E5', // indigo
  '#7C3AED', // violet
  '#2563EB', // blue
  '#0EA5E9', // sky
  '#0891B2', // cyan
  '#0D9488', // teal
  '#059669', // emerald
  '#65A30D', // lime
  '#F59E0B', // amber
  '#F97316', // orange
  '#EF4444', // red
  '#EC4899', // pink
  '#A855F7', // purple
];

/**
 * Deterministic low-tint palette for subject coding.
 * Same course code -> same color in every Academics segment, on both themes.
 * Hues are full-strength with equal perceived brightness.
 */
export function getSubjectColor(
  courseCode: string | undefined,
  colors: ThemeColors,
  isDark: boolean
): SubjectColor {
  const code = (courseCode || 'OTHER').trim().toUpperCase();
  let hash = 0;
  for (let i = 0; i < code.length; i++) {
    hash = (hash * 31 + code.charCodeAt(i)) >>> 0;
  }
  const base = SATURATED[hash % SATURATED.length];
  return {
    bg: `${base}${isDark ? '26' : '1A'}`,
    border: `${base}${isDark ? '70' : '60'}`,
    accent: base,
  };
}

/**
 * Sequential tint used for the Events tab (events, internships, communities).
 * Adjacent cards always differ.
 */
export function getEventsColor(
  index: number,
  colors: ThemeColors,
  isDark: boolean
): SubjectColor {
  const base =
    SATURATED[((index % SATURATED.length) + SATURATED.length) % SATURATED.length];
  return {
    bg: `${base}${isDark ? '26' : '1A'}`,
    border: `${base}${isDark ? '70' : '60'}`,
    accent: base,
  };
}
