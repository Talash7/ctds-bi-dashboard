import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PageHeader } from '@/components/layout/PageHeader'
import { Skeleton } from '@/components/ui/skeleton'
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
          <TabsList className="flex-wrap">
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
