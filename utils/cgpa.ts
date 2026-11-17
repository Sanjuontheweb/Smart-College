/**
 * VTU-style CGPA -> aggregate percentage mapping.
 * Single source for the formula and the classification bands.
 */
export const clampCgpa = (cgpa?: number): number =>
  typeof cgpa === 'number' && !Number.isNaN(cgpa)
    ? Math.min(10, Math.max(0, cgpa))
    : 0;

export const aggregateScoreFromCgpa = (cgpa?: number): number => {
  const value = clampCgpa(cgpa);
  return Math.round(Math.min(100, Math.max(0, (value - 0.75) * 10)) * 10) / 10;
};

export const classificationFromCgpa = (
  cgpa?: number
): 'Distinction' | 'First Class' | 'Second Class' | 'Pass' => {
  const value = clampCgpa(cgpa);
  if (value >= 8.5) return 'Distinction';
  if (value >= 7.5) return 'First Class';
  if (value >= 6.5) return 'Second Class';
  return 'Pass';
};
