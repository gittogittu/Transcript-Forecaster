"use client"

import { useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'

export function ExcelDebug() {
  const [debugInfo, setDebugInfo] = useState<any>(null)

  const processExcel = useCallback(async (file: File) => {
    try {
      // For Excel files, we'll need to use a library like xlsx
      // For now, let's try to read it as text and see what we get
      const arrayBuffer = await file.arrayBuffer()
      const uint8Array = new Uint8Array(arrayBuffer)
      
      // Try to find readable text in the binary data
      let textContent = ''
      for (let i = 0; i < Math.min(uint8Array.length, 10000); i++) {
        const char = uint8Array[i]
        if (char >= 32 && char <= 126) { // Printable ASCII characters
          textContent += String.fromCharCode(char)
        } else if (char === 10 || char === 13) { // Line breaks
          textContent += '\n'
        } else {
          textContent += '.'
        }
      }

      setDebugInfo({
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        lastModified: new Date(file.lastModified).toISOString(),
        textPreview: textContent.substring(0, 2000),
        binaryPreview: Array.from(uint8Array.slice(0, 100)).map(b => b.toString(16).padStart(2, '0')).join(' ')
      })
    } catch (error) {
      console.error('Error processing file:', error)
      setDebugInfo({ error: error instanceof Error ? error.message : 'Unknown error' })
    }
  }, [])

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    await processExcel(file)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Excel Debug Tool</CardTitle>
        <CardDescription>Upload an Excel file to see its structure</CardDescription>
      </CardHeader>
      <CardContent>
        <input
          type="file"
          accept=".xlsx,.xls"
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
                  <p>Size: {debugInfo.fileSize} bytes</p>
                  <p>Type: {debugInfo.fileType}</p>
                  <p>Last Modified: {debugInfo.lastModified}</p>
                </div>
                
                <div>
                  <h3 className="font-semibold">Text Preview (first 2000 chars):</h3>
                  <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto max-h-96 overflow-y-auto whitespace-pre-wrap">
                    {debugInfo.textPreview}
                  </pre>
                </div>
                
                <div>
                  <h3 className="font-semibold">Binary Preview (first 100 bytes):</h3>
                  <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto">
                    {debugInfo.binaryPreview}
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