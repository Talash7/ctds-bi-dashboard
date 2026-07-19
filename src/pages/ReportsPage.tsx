import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { DeanListReport } from '@/components/reports/DeanListReport'
import { EarlyWarningReport } from '@/components/reports/EarlyWarningReport'
import { CourseDifficultyReport } from '@/components/reports/CourseDifficultyReport'
import { LevelProgressionReport } from '@/components/reports/LevelProgressionReport'
import { GradeDistributionReport } from '@/components/reports/GradeDistributionReport'
import { ProgramSummaryReport } from '@/components/reports/ProgramSummaryReport'
import { useStudents } from '@/hooks/useStudents'
import { useCourses } from '@/hooks/useCourses'
import { useResults } from '@/hooks/useResults'
import { usePrograms } from '@/hooks/usePrograms'
import { useProgramStats } from '@/hooks/useProgramStats'

export default function ReportsPage() {
  const { students, loading: studentsLoading } = useStudents()
  const { courses, loading: coursesLoading } = useCourses()
  const { results, loading: resultsLoading } = useResults()
  const { programs, loading: programsLoading } = usePrograms()
  const { stats: programStats, loading: programStatsLoading } = useProgramStats()

  const loading =
    studentsLoading || coursesLoading || resultsLoading || programsLoading || programStatsLoading

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Reports</h1>
        <p className="text-muted-foreground">Pre-defined institutional reports, exportable as CSV</p>
      </div>

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        <Tabs defaultValue="deans-list">
          <TabsList className="flex-wrap">
            <TabsTrigger value="deans-list">Dean's List</TabsTrigger>
            <TabsTrigger value="early-warning">Early Warning</TabsTrigger>
            <TabsTrigger value="course-difficulty">Course Difficulty</TabsTrigger>
            <TabsTrigger value="level-progression">Level Progression</TabsTrigger>
            <TabsTrigger value="grade-distribution">Grade Distribution</TabsTrigger>
            <TabsTrigger value="program-summary">Program Summary</TabsTrigger>
          </TabsList>
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
        </Tabs>
      )}
    </div>
  )
}
