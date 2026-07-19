import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { fetchAllRows } from '@/lib/fetch-all'
import { useRealtimeTable } from '@/hooks/useRealtimeTable'

export interface CourseStats {
  resultCount: number
  avgGradePoints: number | null
  passRate: number | null
}

interface ResultRow {
  course_id: string
  grade_points: number
  status: string
}

export function useCourseStats() {
  const [stats, setStats] = useState<Record<string, CourseStats>>({})
  const [loading, setLoading] = useState(true)
  const loadedOnce = useRef(false)

  const refetch = useCallback(async () => {
    if (!loadedOnce.current) setLoading(true)
    const results = await fetchAllRows<ResultRow>((from, to) =>
      supabase.from('results').select('course_id, grade_points, status').order('id').range(from, to),
    )

    const acc: Record<string, { sum: number; count: number; passed: number }> = {}
    for (const r of results) {
      acc[r.course_id] ??= { sum: 0, count: 0, passed: 0 }
      acc[r.course_id].sum += r.grade_points
      acc[r.course_id].count++
      if (r.status === 'Passed') acc[r.course_id].passed++
    }

    const next: Record<string, CourseStats> = {}
    for (const [courseId, c] of Object.entries(acc)) {
      next[courseId] = {
        resultCount: c.count,
        avgGradePoints: c.count ? c.sum / c.count : null,
        passRate: c.count ? (c.passed / c.count) * 100 : null,
      }
    }
    setStats(next)
    loadedOnce.current = true
    setLoading(false)
  }, [])

  useEffect(() => {
    refetch()
  }, [refetch])

  useRealtimeTable('results', refetch)

  return { stats, loading, refetch }
}
