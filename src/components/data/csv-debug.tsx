"use client"

import { useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

import { Alert, AlertDescription } from '@/components/ui/alert'

export function CSVDebug() {
  const [debugInfo, setDebugInfo] = useState<any>(null)

  const processFile = useCallback(async (file: File) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = (e) => {
        try {
          const text = e.target?.result as string
          const allLines = text.split('\n')
          
          // Find headers
          let headerLineIndex = -1
          let headers: string[] = []
          
          for (let i = 0; i < allLines.length; i++) {
            const line = allLines[i].trim()
            if (!line) continue
            
            const potentialHeaders = line.split(',').map(h => h.trim().replace(/"/g, ''))
            
            const hasValidHeaders = potentialHeaders.some(h => 
              h && (
                h.toLowerCase().includes('client') ||
                h.toLowerCase().includes('total') ||
                h.toLowerCase().includes('count') ||
                h.toLowerCase().includes('aht') ||
                ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].includes(h)
              )
            )
            
            if (hasValidHeaders && potentialHeaders.filter(h => h.trim()).length > 1) {
              headerLineIndex = i
              headers = potentialHeaders
              break
            }
          }
          
          // Parse data
          const data = allLines.slice(headerLineIndex + 1)
            .filter(line => line.trim())
            .map(line => {
              const values = line.split(',').map(v => v.trim().replace(/"/g, ''))
              const row: any = {}
              headers.forEach((header, headerIndex) => {
                row[header] = values[headerIndex] || ''
              })
              return row
            })
            .filter(row => {
              const hasData = Object.values(row).some(value => 
                value && value.toString().trim() && value.toString().trim() !== ','
              )
              return hasData
            })

          resolve({
            fileName: file.name,
            totalLines: allLines.length,
            headerLineIndex,
            headers,
            dataRows: data.length,
            firstFewRows: data.slice(0, 5),
            allData: data
          })
        } catch (error) {
          reject(error)
        }
      }

      reader.readAsText(file)
    })
  }, [])

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const result = await processFile(file)
      setDebugInfo(result)
    } catch (error) {
      console.error('Error processing file:', error)
      setDebugInfo({ error: error instanceof Error ? error.message : 'Unknown error' })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>File Debug Tool</CardTitle>
        <CardDescription>Upload a CSV or Excel file to see how it's being parsed</CardDescription>
      </CardHeader>
      <CardContent>
        <input
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={handleFileSelect}
          className="mb-4"
        />
        
        {debugInfo && (
          <div className="space-y-4">
            {debugInfo.error ? (
              <Alert>
                <AlertDescription>Error: {debugInfo.error}</AlertDescription>
              </Alert>
            ) : (
              <>
                <div>
                  <h3 className="font-semibold">File Info:</h3>
                  <p>File: {debugInfo.fileName}</p>
                  <p>Total Lines: {debugInfo.totalLines}</p>
                  <p>Header Line Index: {debugInfo.headerLineIndex}</p>
                  <p>Data Rows: {debugInfo.dataRows}</p>
                </div>
                
                <div>
                  <h3 className="font-semibold">Headers:</h3>
                  <pre className="bg-gray-100 p-2 rounded text-sm overflow-x-auto">
                    {JSON.stringify(debugInfo.headers, null, 2)}
                  </pre>
                </div>
                
                <div>
                  <h3 className="font-semibold">First 5 Data Rows:</h3>
                  <pre className="bg-gray-100 p-2 rounded text-sm overflow-x-auto max-h-96 overflow-y-auto">
                    {JSON.stringify(debugInfo.firstFewRows, null, 2)}
                  </pre>
                </div>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}