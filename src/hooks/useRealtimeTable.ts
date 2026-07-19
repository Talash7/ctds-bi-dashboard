import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export function useRealtimeTable(table: string, onChange: () => void) {
  useEffect(() => {
    const channel = supabase
      .channel(`realtime-${table}-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, onChange)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [table, onChange])
}
