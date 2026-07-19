import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRealtimeTable } from '@/hooks/useRealtimeTable'
import type { Tables, TablesInsert, TablesUpdate } from '@/types/database.types'

export type Program = Tables<'programs'>

export function usePrograms() {
  const [programs, setPrograms] = useState<Program[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const loadedOnce = useRef(false)

  const refetch = useCallback(async () => {
    if (!loadedOnce.current) setLoading(true)
    const { data, error } = await supabase.from('programs').select('*').order('name')
    if (error) setError(error.message)
    else setPrograms(data ?? [])
    loadedOnce.current = true
    setLoading(false)
  }, [])

  useEffect(() => {
    refetch()
  }, [refetch])

  useRealtimeTable('programs', refetch)

  async function createProgram(input: TablesInsert<'programs'>) {
    const { error } = await supabase.from('programs').insert(input)
    if (error) throw new Error(error.message)
    await refetch()
  }

  async function updateProgram(id: string, input: TablesUpdate<'programs'>) {
    const { error } = await supabase.from('programs').update(input).eq('id', id)
    if (error) throw new Error(error.message)
    await refetch()
  }

  async function deleteProgram(id: string) {
    const { error } = await supabase.from('programs').delete().eq('id', id)
    if (error) throw new Error(error.message)
    await refetch()
  }

  return { programs, loading, error, refetch, createProgram, updateProgram, deleteProgram }
}
