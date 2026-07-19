import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRealtimeTable } from '@/hooks/useRealtimeTable'
import type { Tables, TablesInsert, TablesUpdate } from '@/types/database.types'

export type Course = Tables<'courses'> & { programs: { name: string } | null }

export function useCourses() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const loadedOnce = useRef(false)

  const refetch = useCallback(async () => {
    if (!loadedOnce.current) setLoading(true)
    const { data, error } = await supabase
      .from('courses')
      .select('*, programs(name)')
      .order('level')
      .order('code')
    if (error) setError(error.message)
    else setCourses(data as Course[])
    loadedOnce.current = true
    setLoading(false)
  }, [])

  useEffect(() => {
    refetch()
  }, [refetch])

  useRealtimeTable('courses', refetch)

  async function createCourse(input: TablesInsert<'courses'>) {
    const { error } = await supabase.from('courses').insert(input)
    if (error) throw new Error(error.message)
    await refetch()
  }

  async function updateCourse(id: string, input: TablesUpdate<'courses'>) {
    const { error } = await supabase.from('courses').update(input).eq('id', id)
    if (error) throw new Error(error.message)
    await refetch()
  }

  async function deleteCourse(id: string) {
    const { error } = await supabase.from('courses').delete().eq('id', id)
    if (error) throw new Error(error.message)
    await refetch()
  }

  return { courses, loading, error, refetch, createCourse, updateCourse, deleteCourse }
}
