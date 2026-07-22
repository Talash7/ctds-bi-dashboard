// Session-only, client-side filtering layer for the global per-tab Filter button/drawer (see
// useTabFilters + GlobalFilterPanel) — distinct from a module_kpis row's own persisted
// filter_column/filter_value (an admin-configured default edited via KpiEditDialog). This
// layer always applies ON TOP of that persisted default, never replaces it in the database.
export interface RuntimeFilter {
  programId: string | null
  level: number | null
}

export const EMPTY_RUNTIME_FILTER: RuntimeFilter = { programId: null, level: null }

export function isRuntimeFilterActive(f: RuntimeFilter | undefined): boolean {
  return !!f && (f.programId != null || f.level != null)
}

// students/courses carry program_id directly; results doesn't (no program_id column on that
// table) so it's resolved through whichever joined relation the row actually has loaded —
// courses first (a result's course is the authoritative source of which program it belongs
// to), falling back to the student's program if the course relation wasn't fetched.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowProgramId(row: any): string | null {
  return row.program_id ?? row.courses?.program_id ?? row.students?.program_id ?? null
}

/** Narrows `rows` by a resolved RuntimeFilter — used for every generically-computed
 * (non-`aggregation: 'custom'`) number/chart kpi, and reused directly by each page's
 * bespoke custom-KPI computations so both paths apply filters identically. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applyRuntimeFilter<T>(rows: T[], filter: RuntimeFilter | undefined): T[] {
  if (!isRuntimeFilterActive(filter)) return rows
  return rows.filter((row) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = row as any
    if (filter!.programId != null && rowProgramId(r) !== filter!.programId) return false
    if (filter!.level != null && r.level !== filter!.level) return false
    return true
  })
}

// Which of the two runtime-filter dimensions make sense for a kpi, auto-detected purely from
// what table it queries — every students/results/courses row carries both a program (directly
// or via join) and a level column, so both filters are always offered together for those three
// source tables; 'programs'-sourced kpis (module_kpis rows counting/reducing the programs
// table itself) support neither, since filtering a programs-row KPI by "one program" or by a
// "level" it doesn't have isn't meaningful.
export function supportedRuntimeFilters(sourceTable: string): { program: boolean; level: boolean } {
  const supported = sourceTable === 'students' || sourceTable === 'results' || sourceTable === 'courses'
  return { program: supported, level: supported }
}
