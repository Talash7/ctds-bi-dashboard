import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ImportWizard } from '@/components/import/ImportWizard'
import { importConfigs } from '@/lib/import/configs'

export default function ImportPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Data Import</h1>
        <p className="text-muted-foreground">
          Download a template, fill it in, then upload to preview and confirm before committing.
        </p>
      </div>

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
