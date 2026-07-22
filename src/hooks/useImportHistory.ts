import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRealtimeTable } from '@/hooks/useRealtimeTable'
import type { Tables } from '@/types/database.types'

export type ImportHistoryRow = Tables<'import_history'>

export function useImportHistory(limit = 5) {
  const [rows, setRows] = useState<ImportHistoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const loadedOnce = useRef(false)

  const refetch = useCallback(async () => {
    if (!loadedOnce.current) setLoading(true)
    const { data } = await supabase
      .from('import_history')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)
    setRows(data ?? [])
    loadedOnce.current = true
    setLoading(false)
  }, [limit])

  useEffect(() => {
    refetch()
  }, [refetch])

  useRealtimeTable('import_history', refetch)

  return { rows, loading, refetch }
}
