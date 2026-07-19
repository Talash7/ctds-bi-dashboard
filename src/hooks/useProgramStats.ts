import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { fetchAllRows } from '@/lib/fetch-all'
import { useRealtimeTable } from '@/hooks/useRealtimeTable'

export interface ProgramStats {
  studentCount: number
  passRate: number | null
}

interface StudentRow {
  id: string
  program_id: string
}

interface ResultRow {
  student_id: string
  status: string
}

export function useProgramStats() {
  const [stats, setStats] = useState<Record<string, ProgramStats>>({})
  const [loading, setLoading] = useState(true)
  const loadedOnce = useRef(false)

  const refetch = useCallback(async () => {
    if (!loadedOnce.current) setLoading(true)
    const [students, results] = await Promise.all([
      fetchAllRows<StudentRow>((from, to) =>
        supabase.from('students').select('id, program_id').order('id').range(from, to),
      ),
      fetchAllRows<ResultRow>((from, to) =>
        supabase.from('results').select('student_id, status').order('id').range(from, to),
      ),
    ])

    const studentProgram = new Map<string, string>()
    const counts: Record<string, { students: number; passed: number; total: number }> = {}

    for (const s of students) {
      studentProgram.set(s.id, s.program_id)
      counts[s.program_id] ??= { students: 0, passed: 0, total: 0 }
      counts[s.program_id].students++
    }
    for (const r of results) {
      const programId = studentProgram.get(r.student_id)
      if (!programId) continue
      counts[programId] ??= { students: 0, passed: 0, total: 0 }
      counts[programId].total++
      if (r.status === 'Passed') counts[programId].passed++
    }

    const next: Record<string, ProgramStats> = {}
    for (const [programId, c] of Object.entries(counts)) {
      next[programId] = {
        studentCount: c.students,
        passRate: c.total ? (c.passed / c.total) * 100 : null,
      }
    }
    setStats(next)
    loadedOnce.current = true
    setLoading(false)
  }, [])

  useEffect(() => {
    refetch()
  }, [refetch])

  useRealtimeTable('students', refetch)
  useRealtimeTable('results', refetch)

  return { stats, loading, refetch }
}
