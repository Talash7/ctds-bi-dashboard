import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRealtimeTable } from '@/hooks/useRealtimeTable'
import type { Tables, TablesInsert, TablesUpdate } from '@/types/database.types'

export type Student = Tables<'students'> & { programs: { name: string } | null }

export function useStudents() {
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const loadedOnce = useRef(false)

  const refetch = useCallback(async () => {
    if (!loadedOnce.current) setLoading(true)
    const { data, error } = await supabase
      .from('students')
      .select('*, programs(name)')
      .order('student_code')
    if (error) setError(error.message)
    else setStudents(data as Student[])
    loadedOnce.current = true
    setLoading(false)
  }, [])

  useEffect(() => {
    refetch()
  }, [refetch])

  useRealtimeTable('students', refetch)

  async function createStudent(input: TablesInsert<'students'>) {
    const { error } = await supabase.from('students').insert(input)
    if (error) throw new Error(error.message)
    await refetch()
  }

  async function updateStudent(id: string, input: TablesUpdate<'students'>) {
    const { error } = await supabase.from('students').update(input).eq('id', id)
    if (error) throw new Error(error.message)
    await refetch()
  }

  async function deleteStudent(id: string) {
    const { error } = await supabase.from('students').delete().eq('id', id)
    if (error) throw new Error(error.message)
    await refetch()
  }

  return { students, loading, error, refetch, createStudent, updateStudent, deleteStudent }
}
