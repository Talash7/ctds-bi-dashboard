import { supabase } from '@/lib/supabase'
import { deriveResultFields } from '@/lib/grades'
import type { ImportLookups } from './lookups'
import type { TablesInsert } from '@/types/database.types'

export type ImportEntityKey = 'students' | 'programs' | 'courses' | 'results'

export interface ValidationResult<T> {
  errors: string[]
  warnings?: string[]
  value?: T
}

const MIN_ADMISSION_YEAR = 2010

export interface ImportConfig<T> {
  key: ImportEntityKey
  label: string
  table: 'students' | 'programs' | 'courses' | 'results'
  templateHeaders: string[]
  templateExample: string[]
  previewColumns: { header: string; get: (raw: Record<string, string>) => string }[]
  validateRow: (raw: Record<string, string>, lookups: ImportLookups) => ValidationResult<T>
  insertOne: (value: T) => Promise<void>
}

function parseLevel(raw: string): number | null {
  const n = Number(raw)
  return [1, 2, 3].includes(n) ? n : null
}

const programsConfig: ImportConfig<TablesInsert<'programs'>> = {
  key: 'programs',
  label: 'Programs',
  table: 'programs',
  templateHeaders: ['name', 'department', 'qualification', 'study_duration', 'status'],
  templateExample: [
    'دبلوم تقانة المعلومات',
    'كلية الدراسات التقنية والتنموية',
    'دبلوم',
    '3 مستويات',
    'active',
  ],
  previewColumns: [
    { header: 'Name', get: (r) => r.name },
    { header: 'Department', get: (r) => r.department },
  ],
  validateRow: (raw, lookups) => {
    const errors: string[] = []
    const name = raw.name?.trim()
    if (!name) errors.push('Name is required')
    else if (lookups.programExists.has(name)) errors.push(`Program "${name}" already exists`)
    if (errors.length) return { errors }
    return {
      errors,
      value: {
        name,
        department: raw.department?.trim() || null,
        qualification: raw.qualification?.trim() || null,
        study_duration: raw.study_duration?.trim() || null,
        status: raw.status?.trim() || 'active',
      },
    }
  },
  insertOne: async (value) => {
    const { error } = await supabase.from('programs').insert(value)
    if (error) throw new Error(error.message)
  },
}

const studentsConfig: ImportConfig<TablesInsert<'students'>> = {
  key: 'students',
  label: 'Students',
  table: 'students',
  templateHeaders: [
    'student_code',
    'name',
    'program_name',
    'level',
    'enrollment_status',
    'admission_year',
    'batch',
  ],
  templateExample: [
    '1234567890',
    'اسم الطالب',
    'دبلوم تقانة المعلومات',
    '1',
    'Active - Passed',
    '2024',
    'A',
  ],
  previewColumns: [
    { header: 'Code', get: (r) => r.student_code },
    { header: 'Name', get: (r) => r.name },
  ],
  validateRow: (raw, lookups) => {
    const errors: string[] = []
    const studentCode = raw.student_code?.trim()
    const name = raw.name?.trim()
    const programName = raw.program_name?.trim()
    const level = parseLevel(raw.level)

    if (!studentCode) errors.push('student_code is required')
    // A colliding student_code is rejected outright rather than silently suffixed —
    // real ID collisions between different students need manual review, not an
    // auto-generated "-DUP2"-style code that would break downstream derived fields.
    else if (lookups.studentByCode.has(studentCode))
      errors.push(`Student code "${studentCode}" already exists — review for a possible ID collision before re-importing`)
    if (!name) errors.push('name is required')
    if (!programName) errors.push('program_name is required')
    else if (!lookups.programsByName.has(programName))
      errors.push(`Unknown program "${programName}"`)
    if (level == null) errors.push('level must be 1, 2, or 3')

    // admission_year always comes from this explicit column, never derived from
    // student_code — a prior one-off migration script parsed it from the code's
    // suffix and produced garbage (e.g. 2099) for codes that don't follow that
    // convention, or for codes suffixed with "-DUP2" to resolve a collision.
    let admissionYear: number | null = null
    const warnings: string[] = []
    if (raw.admission_year?.trim()) {
      const parsed = Number(raw.admission_year)
      const currentYear = new Date().getFullYear()
      if (!Number.isInteger(parsed)) {
        errors.push('admission_year must be a whole number')
      } else if (parsed < MIN_ADMISSION_YEAR || parsed > currentYear) {
        // Out of plausible range: don't write it, don't block the row — flag for review instead.
        warnings.push(
          `admission_year "${raw.admission_year}" is outside the plausible range (${MIN_ADMISSION_YEAR}-${currentYear}) and was left blank`,
        )
      } else {
        admissionYear = parsed
      }
    }

    if (errors.length) return { errors }
    const program = lookups.programsByName.get(programName)!
    return {
      errors,
      warnings,
      value: {
        student_code: studentCode,
        name,
        program_id: program.id,
        level: level!,
        enrollment_status: raw.enrollment_status?.trim() || 'Active - Passed',
        admission_year: admissionYear,
        batch: raw.batch?.trim() || null,
      },
    }
  },
  insertOne: async (value) => {
    const { error } = await supabase.from('students').insert(value)
    if (error) throw new Error(error.message)
  },
}

const coursesConfig: ImportConfig<TablesInsert<'courses'>> = {
  key: 'courses',
  label: 'Courses',
  table: 'courses',
  templateHeaders: ['code', 'name', 'program_name', 'level'],
  templateExample: ['كود101', 'اسم المقرر', 'دبلوم تقانة المعلومات', '1'],
  previewColumns: [
    { header: 'Code', get: (r) => r.code },
    { header: 'Name', get: (r) => r.name },
  ],
  validateRow: (raw, lookups) => {
    const errors: string[] = []
    const code = raw.code?.trim()
    const name = raw.name?.trim()
    const programName = raw.program_name?.trim()
    const level = parseLevel(raw.level)

    if (!code) errors.push('code is required')
    if (!name) errors.push('name is required')
    if (!programName) errors.push('program_name is required')
    else if (!lookups.programsByName.has(programName))
      errors.push(`Unknown program "${programName}"`)
    if (level == null) errors.push('level must be 1, 2, or 3')

    const program = programName ? lookups.programsByName.get(programName) : undefined
    if (program && code && lookups.coursesByProgramAndCode.has(`${program.id}::${code}`)) {
      errors.push(`Course "${code}" already exists in this program`)
    }

    if (errors.length) return { errors }
    return {
      errors,
      value: { code, name, program_id: program!.id, level: level! },
    }
  },
  insertOne: async (value) => {
    const { error } = await supabase.from('courses').insert(value)
    if (error) throw new Error(error.message)
  },
}

const resultsConfig: ImportConfig<TablesInsert<'results'>> = {
  key: 'results',
  label: 'Results',
  table: 'results',
  templateHeaders: ['student_code', 'course_code', 'level', 'score', 'exam_type'],
  templateExample: ['1234567890', 'كود101', '1', '87.5', 'Final'],
  previewColumns: [
    { header: 'Student', get: (r) => r.student_code },
    { header: 'Course', get: (r) => r.course_code },
    { header: 'Score', get: (r) => r.score },
  ],
  validateRow: (raw, lookups) => {
    const errors: string[] = []
    const studentCode = raw.student_code?.trim()
    const courseCode = raw.course_code?.trim()
    const level = parseLevel(raw.level)
    const scoreRaw = raw.score?.trim()

    if (!studentCode) errors.push('student_code is required')
    else if (!lookups.studentByCode.has(studentCode))
      errors.push(`Unknown student code "${studentCode}"`)
    if (!courseCode) errors.push('course_code is required')
    else if (!lookups.courseByCode.has(courseCode))
      errors.push(`Unknown course code "${courseCode}"`)
    if (level == null) errors.push('level must be 1, 2, or 3')

    let score: number | null = null
    if (scoreRaw) {
      score = Number(scoreRaw)
      if (Number.isNaN(score) || score < 0 || score > 100) {
        errors.push('score must be a number between 0 and 100, or left blank for an absence')
      }
    }

    const student = lookups.studentByCode.get(studentCode)
    const course = lookups.courseByCode.get(courseCode)
    if (student && course && level != null) {
      const key = `${student.id}::${course.id}::${level}`
      if (lookups.resultKeys.has(key)) {
        errors.push('A result for this student, course, and level already exists')
      }
    }

    if (errors.length) return { errors }
    const derived = deriveResultFields(score)
    return {
      errors,
      value: {
        student_id: student!.id,
        course_id: course!.id,
        level: level!,
        score,
        grade_letter: derived.grade_letter,
        grade_points: derived.grade_points,
        status: derived.status,
        exam_type: raw.exam_type?.trim() || 'Final',
      },
    }
  },
  insertOne: async (value) => {
    const { error } = await supabase.from('results').insert(value)
    if (error) throw new Error(error.message)
  },
}

export const importConfigs = {
  programs: programsConfig,
  students: studentsConfig,
  courses: coursesConfig,
  results: resultsConfig,
}
