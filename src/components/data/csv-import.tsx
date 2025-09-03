"use client"

import { CSVUpload } from './csv-upload-fixed'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Database } from 'lucide-react'

interface CSVImportProps {
  onImportComplete?: (result: any) => void
  className?: string
}

export function CSVImport({ onImportComplete, className }: CSVImportProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Import CSV Data
        </CardTitle>
        <CardDescription>
          Upload CSV files and automatically import transcript data to the database
        </CardDescription>
      </CardHeader>
      <CardContent>
        <CSVUpload
          autoImport={true}
          onImportComplete={onImportComplete}
          acceptedFileTypes={['.csv', '.xlsx', '.xls']}
          maxFileSize={10 * 1024 * 1024} // 10MB
        />
      </CardContent>
    </Card>
  )
}