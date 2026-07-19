import { supabase } from '@/lib/supabase'
import { GRADE_LETTERS, gradePointsFor, statusFor } from '@/lib/grades'
import type { ImportLookups } from './lookups'
import type { TablesInsert } from '@/types/database.types'

export type ImportEntityKey = 'students' | 'programs' | 'courses' | 'results'

export interface ValidationResult<T> {
  errors: string[]
  value?: T
}

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
  templateHeaders: ['student_code', 'name', 'program_name', 'level', 'enrollment_status', 'gpa'],
  templateExample: ['1234567890', 'اسم الطالب', 'دبلوم تقانة المعلومات', '1', 'Active - Passed', ''],
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
    else if (lookups.studentByCode.has(studentCode))
      errors.push(`Student code "${studentCode}" already exists`)
    if (!name) errors.push('name is required')
    if (!programName) errors.push('program_name is required')
    else if (!lookups.programsByName.has(programName))
      errors.push(`Unknown program "${programName}"`)
    if (level == null) errors.push('level must be 1, 2, or 3')

    let gpa: number | null = null
    if (raw.gpa?.trim()) {
      gpa = Number(raw.gpa)
      if (Number.isNaN(gpa) || gpa < 0 || gpa > 4) errors.push('gpa must be a number between 0 and 4')
    }

    if (errors.length) return { errors }
    const program = lookups.programsByName.get(programName)!
    return {
      errors,
      value: {
        student_code: studentCode,
        name,
        program_id: program.id,
        level: level!,
        enrollment_status: raw.enrollment_status?.trim() || 'Active - Passed',
        gpa,
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
  templateHeaders: ['student_code', 'course_code', 'level', 'grade_letter', 'exam_type'],
  templateExample: ['1234567890', 'كود101', '1', 'A', 'Final'],
  previewColumns: [
    { header: 'Student', get: (r) => r.student_code },
    { header: 'Course', get: (r) => r.course_code },
    { header: 'Grade', get: (r) => r.grade_letter },
  ],
  validateRow: (raw, lookups) => {
    const errors: string[] = []
    const studentCode = raw.student_code?.trim()
    const courseCode = raw.course_code?.trim()
    const level = parseLevel(raw.level)
    const gradeLetter = raw.grade_letter?.trim()

    if (!studentCode) errors.push('student_code is required')
    else if (!lookups.studentByCode.has(studentCode))
      errors.push(`Unknown student code "${studentCode}"`)
    if (!courseCode) errors.push('course_code is required')
    else if (!lookups.courseByCode.has(courseCode))
      errors.push(`Unknown course code "${courseCode}"`)
    if (level == null) errors.push('level must be 1, 2, or 3')
    if (!gradeLetter || !GRADE_LETTERS.includes(gradeLetter as (typeof GRADE_LETTERS)[number]))
      errors.push(`grade_letter must be one of ${GRADE_LETTERS.join(', ')}`)

    const student = lookups.studentByCode.get(studentCode)
    const course = lookups.courseByCode.get(courseCode)
    if (student && course && level != null) {
      const key = `${student.id}::${course.id}::${level}`
      if (lookups.resultKeys.has(key)) {
        errors.push('A result for this student, course, and level already exists')
      }
    }

    if (errors.length) return { errors }
    return {
      errors,
      value: {
        student_id: student!.id,
        course_id: course!.id,
        level: level!,
        grade_letter: gradeLetter,
        grade_points: gradePointsFor(gradeLetter),
        status: statusFor(gradeLetter),
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
