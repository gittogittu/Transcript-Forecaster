"use client"

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { getCSRFToken, getCSRFHeaders } from '@/lib/utils/csrf'

export function CSRFDebug() {
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)

  const testCSRFToken = async () => {
    setIsLoading(true)
    try {
      // Test getting CSRF token
      const token = await getCSRFToken()
      const headers = await getCSRFHeaders()
      
      // Test making a simple API call
      const response = await fetch('/api/transcripts', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify([{
          clientName: 'Test Client',
          date: '2024-01-01',
          transcriptCount: 1,
          transcriptType: 'call',
          notes: 'CSRF test'
        }])
      })
      
      const result = await response.json()
      
      setDebugInfo({
        token,
        headers,
        response: {
          status: response.status,
          statusText: response.statusText,
          result
        },
        cookies: document.cookie,
        sessionStorage: sessionStorage.getItem('csrf-token')
      })
    } catch (error) {
      setDebugInfo({
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const testCSRFEndpoint = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/security/csrf', {
        method: 'GET',
        credentials: 'include'
      })
      
      const result = await response.json()
      
      setDebugInfo({
        csrfEndpoint: {
          status: response.status,
          headers: Object.fromEntries(response.headers.entries()),
          result
        }
      })
    } catch (error) {
      setDebugInfo({
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>CSRF Debug Tool</CardTitle>
        <CardDescription>Test CSRF token functionality</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button onClick={testCSRFEndpoint} disabled={isLoading}>
            Test CSRF Endpoint
          </Button>
          <Button onClick={testCSRFToken} disabled={isLoading}>
            Test Full CSRF Flow
          </Button>
        </div>
        
        {debugInfo && (
          <div className="space-y-4">
            {debugInfo.error ? (
              <Alert>
                <AlertDescription>Error: {debugInfo.error}</AlertDescription>
              </Alert>
            ) : (
              <div>
                <h3 className="font-semibold">Debug Info:</h3>
                <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto max-h-96 overflow-y-auto">
                  {JSON.stringify(debugInfo, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}