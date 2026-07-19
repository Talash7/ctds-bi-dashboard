export const GRADE_LETTERS = ['A', 'B', 'C', 'D', 'F', 'Abs'] as const
export type GradeLetter = (typeof GRADE_LETTERS)[number]

const GRADE_POINTS: Record<GradeLetter, number> = {
  A: 4.0,
  B: 3.0,
  C: 2.0,
  D: 1.0,
  F: 0.0,
  Abs: 0.0,
}

const GRADE_STATUS: Record<GradeLetter, string> = {
  A: 'Passed',
  B: 'Passed',
  C: 'Passed',
  D: 'Passed',
  F: 'Failed',
  Abs: 'Absent',
}

export function gradePointsFor(letter: string): number {
  return GRADE_POINTS[letter as GradeLetter] ?? 0
}

export function statusFor(letter: string): string {
  return GRADE_STATUS[letter as GradeLetter] ?? 'Passed'
}
