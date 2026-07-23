import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PageHeader } from '@/components/layout/PageHeader'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { DeanListReport } from '@/components/reports/DeanListReport'
import { EarlyWarningReport } from '@/components/reports/EarlyWarningReport'
import { CourseDifficultyReport } from '@/components/reports/CourseDifficultyReport'
import { LevelProgressionReport } from '@/components/reports/LevelProgressionReport'
import { GradeDistributionReport } from '@/components/reports/GradeDistributionReport'
import { ProgramSummaryReport } from '@/components/reports/ProgramSummaryReport'
import { GpaAnalysisReport } from '@/components/reports/GpaAnalysisReport'
import { StudentPerformanceReport } from '@/components/reports/StudentPerformanceReport'
import { ComparativeAnalysisReport } from '@/components/reports/ComparativeAnalysisReport'
import { CohortTrackingReport } from '@/components/reports/CohortTrackingReport'
import { useStudents } from '@/hooks/useStudents'
import { useCourses } from '@/hooks/useCourses'
import { useResults } from '@/hooks/useResults'
import { usePrograms } from '@/hooks/usePrograms'
import { useProgramStats } from '@/hooks/useProgramStats'

// The 10 report tabs don't fit on one line at most viewport widths — TabsList is `inline-flex
// w-fit`, so left unconstrained it either wraps (overlapping the description text below, the
// bug this fixes) or overflows off-screen. This wraps it in its own horizontally scrollable
// track with fade edges + arrow buttons, and forces the tabs themselves to stay on one line.
function ScrollableTabsList({ children }: { children: ReactNode }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const updateArrows = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 4)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    updateArrows()
    const resizeObserver = new ResizeObserver(updateArrows)
    resizeObserver.observe(el)
    el.addEventListener('scroll', updateArrows, { passive: true })
    return () => {
      resizeObserver.disconnect()
      el.removeEventListener('scroll', updateArrows)
    }
  }, [updateArrows])

  function scrollBy(delta: number) {
    scrollRef.current?.scrollBy({ left: delta, behavior: 'smooth' })
  }

  return (
    <div className="relative">
      <div
        className={cn(
          'pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-background to-transparent transition-opacity',
          canScrollLeft ? 'opacity-100' : 'opacity-0',
        )}
      />
      <div
        className={cn(
          'pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-background to-transparent transition-opacity',
          canScrollRight ? 'opacity-100' : 'opacity-0',
        )}
      />
      {canScrollLeft && (
        <button
          type="button"
          aria-label="Scroll tabs left"
          onClick={() => scrollBy(-160)}
          className="absolute left-0 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 rounded-full border bg-background p-1 shadow-sm hover:bg-muted"
        >
          <ChevronLeft className="size-4" />
        </button>
      )}
      <div ref={scrollRef} className="no-scrollbar overflow-x-auto">
        <TabsList className="w-max flex-nowrap">{children}</TabsList>
      </div>
      {canScrollRight && (
        <button
          type="button"
          aria-label="Scroll tabs right"
          onClick={() => scrollBy(160)}
          className="absolute right-0 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 rounded-full border bg-background p-1 shadow-sm hover:bg-muted"
        >
          <ChevronRight className="size-4" />
        </button>
      )}
    </div>
  )
}

export default function ReportsPage() {
  const { students, loading: studentsLoading } = useStudents()
  const { courses, loading: coursesLoading } = useCourses()
  const { results, loading: resultsLoading } = useResults()
  const { programs, loading: programsLoading } = usePrograms()
  const { stats: programStats, loading: programStatsLoading } = useProgramStats()

  const loading =
    studentsLoading || coursesLoading || resultsLoading || programsLoading || programStatsLoading

  return (
    <div className="space-y-3">
      <PageHeader title="Reports" subtitle="Pre-defined institutional reports, exportable as CSV" />

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        <Tabs defaultValue="deans-list">
          <ScrollableTabsList>
            <TabsTrigger value="deans-list">Dean's List</TabsTrigger>
            <TabsTrigger value="early-warning">Early Warning</TabsTrigger>
            <TabsTrigger value="course-difficulty">Course Difficulty</TabsTrigger>
            <TabsTrigger value="level-progression">Level Progression</TabsTrigger>
            <TabsTrigger value="grade-distribution">Grade Distribution</TabsTrigger>
            <TabsTrigger value="program-summary">Program Summary</TabsTrigger>
            <TabsTrigger value="gpa-analysis">GPA Analysis</TabsTrigger>
            <TabsTrigger value="student-performance">Student Performance</TabsTrigger>
            <TabsTrigger value="comparative-analysis">Comparative Analysis</TabsTrigger>
            <TabsTrigger value="cohort-tracking">Cohort Tracking</TabsTrigger>
          </ScrollableTabsList>
          <TabsContent value="deans-list">
            <DeanListReport students={students} />
          </TabsContent>
          <TabsContent value="early-warning">
            <EarlyWarningReport students={students} results={results} />
          </TabsContent>
          <TabsContent value="course-difficulty">
            <CourseDifficultyReport courses={courses} results={results} />
          </TabsContent>
          <TabsContent value="level-progression">
            <LevelProgressionReport students={students} results={results} />
          </TabsContent>
          <TabsContent value="grade-distribution">
            <GradeDistributionReport courses={courses} results={results} />
          </TabsContent>
          <TabsContent value="program-summary">
            <ProgramSummaryReport programs={programs} students={students} stats={programStats} />
          </TabsContent>
          <TabsContent value="gpa-analysis">
            <GpaAnalysisReport students={students} programs={programs} />
          </TabsContent>
          <TabsContent value="student-performance">
            <StudentPerformanceReport students={students} results={results} />
          </TabsContent>
          <TabsContent value="comparative-analysis">
            <ComparativeAnalysisReport students={students} results={results} />
          </TabsContent>
          <TabsContent value="cohort-tracking">
            <CohortTrackingReport students={students} results={results} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
