"use client"

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Upload, CheckCircle, AlertCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export function SimpleUpload() {
  const { toast } = useToast()
  const { data: session } = useSession()
  const [isUploading, setIsUploading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!session?.user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to upload files",
        variant: "destructive"
      })
      return
    }

    setIsUploading(true)
    setResult(null)

    try {
      console.log('Processing file:', file.name)
      
      // Simple test data - just create a basic transcript entry
      const testTranscripts = [{
        clientName: 'Test Client from ' + file.name,
        date: new Date().toISOString().split('T')[0],
        transcriptCount: 1,
        transcriptType: 'call',
        notes: `Uploaded from ${file.name} at ${new Date().toLocaleString()}`
      }]

      console.log('Sending test data:', testTranscripts)

      // Simple fetch without CSRF complications
      const response = await fetch('/api/transcripts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(testTranscripts)
      })

      console.log('Response status:', response.status)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Error response:', errorText)
        throw new Error(`Upload failed: ${response.status} - ${errorText}`)
      }

      const apiResult = await response.json()
      console.log('Success response:', apiResult)

      setResult({
        success: true,
        message: `Successfully uploaded test data from ${file.name}`,
        data: apiResult
      })

      toast({
        title: "Upload Successful",
        description: `Test data from ${file.name} uploaded successfully`,
      })

    } catch (error) {
      console.error('Upload error:', error)
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      setResult({
        success: false,
        message: errorMessage,
        error: error
      })

      toast({
        title: "Upload Failed",
        description: errorMessage,
        variant: "destructive"
      })
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Simple File Upload Test
        </CardTitle>
        <CardDescription>
          Basic upload test to verify API connectivity
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileUpload}
            disabled={isUploading}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>

        {isUploading && (
          <Alert>
            <Upload className="h-4 w-4 animate-spin" />
            <AlertDescription>Uploading file...</AlertDescription>
          </Alert>
        )}

        {result && (
          <Alert>
            {result.success ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600" />
            )}
            <AlertDescription>
              <div className="font-medium mb-2">
                {result.success ? 'Success' : 'Error'}
              </div>
              <div className="text-sm">{result.message}</div>
              {result.data && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs">View Details</summary>
                  <pre className="mt-1 text-xs bg-gray-100 p-2 rounded overflow-auto">
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                </details>
              )}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}