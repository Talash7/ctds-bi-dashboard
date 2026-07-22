import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ImportWizard } from '@/components/import/ImportWizard'
import { importConfigs } from '@/lib/import/configs'
import { PageHeader } from '@/components/layout/PageHeader'

export default function ImportPage() {
  return (
    <div className="space-y-3">
      <PageHeader
        title="Data Import"
        subtitle="Download a template, fill it in, then upload to preview and confirm before committing."
      />

      <Tabs defaultValue="students">
        <TabsList>
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="programs">Programs</TabsTrigger>
          <TabsTrigger value="courses">Courses</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
        </TabsList>
        <TabsContent value="students">
          <ImportWizard config={importConfigs.students} />
        </TabsContent>
        <TabsContent value="programs">
          <ImportWizard config={importConfigs.programs} />
        </TabsContent>
        <TabsContent value="courses">
          <ImportWizard config={importConfigs.courses} />
        </TabsContent>
        <TabsContent value="results">
          <ImportWizard config={importConfigs.results} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
