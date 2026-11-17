import { Colors } from '@/constants/Colors';

type ThemeColors = typeof Colors.light;

export interface SubjectColor {
  bg: string;
  border: string;
  accent: string;
}

const BASE_TOKENS: (keyof ThemeColors)[] = [
  'accent',
  'info',
  'success',
  'warning',
  'primary',
  'roleStudent',
  'roleFaculty',
  'danger',
  'roleAdmin',
  'successLight',
  'warningLight',
  'dangerLight',
  'infoLight',
];

/**
 * Deterministic low-tint palette for subject coding.
 * Same course code -> same color in every Academics segment, on both themes.
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
  const token = BASE_TOKENS[hash % BASE_TOKENS.length];
  const base = colors[token] as string;
  return {
    bg: `${base}${isDark ? '1F' : '14'}`,
    border: `${base}${isDark ? '66' : '55'}`,
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
  const token = BASE_TOKENS[((index % BASE_TOKENS.length) + BASE_TOKENS.length) % BASE_TOKENS.length];
  const base = colors[token] as string;
  return {
    bg: `${base}${isDark ? '1F' : '14'}`,
    border: `${base}${isDark ? '66' : '55'}`,
    accent: base,
  };
}
