export const GRADE_LETTERS = ['A', 'B', 'C', 'D', 'F', 'Abs'] as const
export type GradeLetter = (typeof GRADE_LETTERS)[number]

/** score is the single source of truth. grade_letter/grade_points/status are always derived from it. */
export function gradeLetterForScore(score: number): GradeLetter {
  if (score >= 70) return 'A'
  if (score >= 60) return 'B'
  if (score >= 50) return 'C'
  if (score >= 40) return 'D'
  return 'F'
}

export function gradePointsForScore(score: number): number {
  return Math.round((score / 25) * 100) / 100
}

export function statusForLetter(letter: GradeLetter): string {
  if (letter === 'Abs') return 'Absent'
  return letter === 'F' ? 'Failed' : 'Passed'
}

export interface DerivedResultFields {
  grade_letter: GradeLetter
  grade_points: number
  status: string
}

/** null score = no-score-entered absence path. */
export function deriveResultFields(score: number | null): DerivedResultFields {
  if (score == null) {
    return { grade_letter: 'Abs', grade_points: 0, status: 'Absent' }
  }
  const grade_letter = gradeLetterForScore(score)
  return { grade_letter, grade_points: gradePointsForScore(score), status: statusForLetter(grade_letter) }
}
