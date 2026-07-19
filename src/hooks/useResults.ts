import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { fetchAllRows } from '@/lib/fetch-all'
import { useRealtimeTable } from '@/hooks/useRealtimeTable'
import type { Tables, TablesInsert, TablesUpdate } from '@/types/database.types'

export type Result = Tables<'results'> & {
  students: { name: string; student_code: string } | null
  courses: { name: string; code: string } | null
}

export function useResults() {
  const [results, setResults] = useState<Result[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const loadedOnce = useRef(false)

  const refetch = useCallback(async () => {
    if (!loadedOnce.current) setLoading(true)
    try {
      const data = await fetchAllRows<Result>((from, to) =>
        supabase
          .from('results')
          .select('*, students(name, student_code), courses(name, code)')
          .order('created_at', { ascending: false })
          .order('id')
          .range(from, to),
      )
      setResults(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load results')
    } finally {
      loadedOnce.current = true
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refetch()
  }, [refetch])

  useRealtimeTable('results', refetch)

  async function createResult(input: TablesInsert<'results'>) {
    const { error } = await supabase.from('results').insert(input)
    if (error) throw new Error(error.message)
    await refetch()
  }

  async function updateResult(id: string, input: TablesUpdate<'results'>) {
    const { error } = await supabase.from('results').update(input).eq('id', id)
    if (error) throw new Error(error.message)
    await refetch()
  }

  async function deleteResult(id: string) {
    const { error } = await supabase.from('results').delete().eq('id', id)
    if (error) throw new Error(error.message)
    await refetch()
  }

  return { results, loading, error, refetch, createResult, updateResult, deleteResult }
}
