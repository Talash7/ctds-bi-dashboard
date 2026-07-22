import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { Download, Upload, CheckCircle2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { parseSpreadsheetFile, downloadTemplate } from '@/lib/import/spreadsheet'
import { buildImportLookups } from '@/lib/import/lookups'
import type { ImportConfig } from '@/lib/import/configs'

interface PreviewRow {
  raw: Record<string, string>
  errors: string[]
  warnings: string[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value?: any
}

export function ImportWizard<T>({ config }: { config: ImportConfig<T> }) {
  const { user } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [preview, setPreview] = useState<PreviewRow[] | null>(null)
  const [parsing, setParsing] = useState(false)
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [summary, setSummary] = useState<{ inserted: number; skipped: number } | null>(null)

  const validCount = preview?.filter((p) => p.errors.length === 0).length ?? 0
  const invalidCount = preview ? preview.length - validCount : 0

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setSummary(null)
    setParsing(true)
    try {
      const rawRows = await parseSpreadsheetFile(file)
      const lookups = await buildImportLookups()
      const results: PreviewRow[] = rawRows.map((raw) => {
        const result = config.validateRow(raw, lookups)
        return { raw, errors: result.errors, warnings: result.warnings ?? [], value: result.value }
      })
      setPreview(results)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to parse file')
      setPreview(null)
    } finally {
      setParsing(false)
    }
  }

  async function handleCommit() {
    if (!preview) return
    const validRows = preview.filter((p) => p.errors.length === 0 && p.value)
    if (validRows.length === 0) {
      toast.error('No valid rows to import')
      return
    }

    setImporting(true)
    setProgress(0)
    let inserted = 0
    let skipped = preview.length - validRows.length
    const flaggedForReview: string[] = []

    for (let i = 0; i < validRows.length; i++) {
      try {
        await config.insertOne(validRows[i].value)
        inserted++
        if (validRows[i].warnings.length) {
          const code = validRows[i].raw.student_code ?? validRows[i].raw.code ?? `row ${i + 1}`
          flaggedForReview.push(`${code}: ${validRows[i].warnings.join('; ')}`)
        }
      } catch {
        skipped++
      }
      setProgress(Math.round(((i + 1) / validRows.length) * 100))
    }

    await supabase.from('import_history').insert({
      entity: config.label,
      row_count: inserted,
      status: skipped === 0 ? 'success' : inserted === 0 ? 'failed' : 'partial',
      user_email: user?.email ?? null,
    })

    if (flaggedForReview.length) {
      await supabase.from('audit_log').insert({
        action: 'import_warning',
        entity: config.label,
        details: `${flaggedForReview.length} row(s) imported with fields left blank for manual review:\n${flaggedForReview.join('\n')}`,
        user_email: user?.email ?? null,
      })
    }

    setSummary({ inserted, skipped })
    setImporting(false)
    setPreview(null)
    setFileName(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    toast.success(`Imported ${inserted} ${config.label.toLowerCase()}${skipped ? `, skipped ${skipped}` : ''}`)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="outline"
          onClick={() =>
            downloadTemplate(
              `${config.key}_template.xlsx`,
              config.templateHeaders,
              config.templateExample,
            )
          }
        >
          <Download className="size-4" />
          Download template
        </Button>
        <Button onClick={() => fileInputRef.current?.click()} disabled={parsing || importing}>
          <Upload className="size-4" />
          Upload file
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          className="hidden"
          onChange={handleFileChange}
        />
        {fileName && <span className="text-sm text-muted-foreground">{fileName}</span>}
      </div>

      {parsing && <p className="text-sm text-muted-foreground">Parsing file…</p>}

      {summary && (
        <div className="rounded-md border border-border bg-card p-4 text-sm">
          <p className="font-medium text-foreground">Import complete</p>
          <p className="text-muted-foreground">
            {summary.inserted} row(s) imported, {summary.skipped} skipped.
          </p>
        </div>
      )}

      {preview && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="gap-1 text-emerald-600">
              <CheckCircle2 className="size-3.5" /> {validCount} valid
            </Badge>
            <Badge variant="outline" className="gap-1 text-destructive">
              <XCircle className="size-3.5" /> {invalidCount} invalid
            </Badge>
            <Button onClick={handleCommit} disabled={importing || validCount === 0}>
              {importing ? 'Importing…' : `Import ${validCount} row(s)`}
            </Button>
          </div>

          {importing && <Progress value={progress} />}

          <div className="max-h-[400px] overflow-y-auto rounded-md border border-border">
            <Table>
              <TableHeader className="sticky top-0 bg-card">
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead className="w-20">Status</TableHead>
                  {config.previewColumns.map((c) => (
                    <TableHead key={c.header}>{c.header}</TableHead>
                  ))}
                  <TableHead>Errors / Warnings</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.map((row, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                    <TableCell>
                      {row.errors.length === 0 ? (
                        <CheckCircle2 className="size-4 text-emerald-600" />
                      ) : (
                        <XCircle className="size-4 text-destructive" />
                      )}
                    </TableCell>
                    {config.previewColumns.map((c) => (
                      <TableCell key={c.header} dir="auto">
                        {c.get(row.raw)}
                      </TableCell>
                    ))}
                    <TableCell className="text-sm">
                      {row.errors.length > 0 && (
                        <span className="text-destructive">{row.errors.join('; ')}</span>
                      )}
                      {row.warnings.length > 0 && (
                        <span className="text-gold-foreground">{row.warnings.join('; ')}</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  )
}
