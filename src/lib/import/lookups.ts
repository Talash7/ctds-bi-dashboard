import { supabase } from '@/lib/supabase'
import { fetchAllRows } from '@/lib/fetch-all'

export interface ImportLookups {
  programsByName: Map<string, { id: string }>
  programExists: Set<string>
  coursesByProgramAndCode: Set<string>
  courseByCode: Map<string, { id: string; program_id: string }>
  studentByCode: Map<string, { id: string; program_id: string }>
  resultKeys: Set<string>
}

export async function buildImportLookups(): Promise<ImportLookups> {
  const [programs, courses, students, results] = await Promise.all([
    fetchAllRows<{ id: string; name: string }>((from, to) =>
      supabase.from('programs').select('id, name').order('id').range(from, to),
    ),
    fetchAllRows<{ id: string; code: string; program_id: string }>((from, to) =>
      supabase.from('courses').select('id, code, program_id').order('id').range(from, to),
    ),
    fetchAllRows<{ id: string; student_code: string; program_id: string }>((from, to) =>
      supabase.from('students').select('id, student_code, program_id').order('id').range(from, to),
    ),
    fetchAllRows<{ student_id: string; course_id: string; level: number }>((from, to) =>
      supabase.from('results').select('student_id, course_id, level').order('id').range(from, to),
    ),
  ])

  const programsByName = new Map(programs.map((p) => [p.name, { id: p.id }]))
  const coursesByProgramAndCode = new Set(courses.map((c) => `${c.program_id}::${c.code}`))
  const courseByCode = new Map(courses.map((c) => [c.code, { id: c.id, program_id: c.program_id }]))
  const studentByCode = new Map(
    students.map((s) => [s.student_code, { id: s.id, program_id: s.program_id }]),
  )
  const resultKeys = new Set(results.map((r) => `${r.student_id}::${r.course_id}::${r.level}`))

  return {
    programsByName,
    programExists: new Set(programs.map((p) => p.name)),
    coursesByProgramAndCode,
    courseByCode,
    studentByCode,
    resultKeys,
  }
}
