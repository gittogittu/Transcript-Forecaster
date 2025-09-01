"use client"

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'

export function TestAPI() {
  const { data: session } = useSession()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const testTranscriptsAPI = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/transcripts', {
        method: 'GET',
        credentials: 'include',
      })
      
      const data = await response.json()
      setResult(data)
      
      if (response.ok) {
        toast({
          title: "API Test Successful",
          description: `Fetched ${data.data?.length || 0} transcripts`,
        })
      } else {
        toast({
          title: "API Test Failed",
          description: data.error || 'Unknown error',
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "API Test Error",
        description: error instanceof Error ? error.message : 'Network error',
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const testCreateTranscript = async () => {
    setLoading(true)
    try {
      const testData = {
        clientName: "Test Client",
        date: "2024-01-15",
        transcriptCount: 5,
        transcriptType: "call",
        notes: "Test transcript from API test"
      }

      const response = await fetch('/api/transcripts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(testData)
      })
      
      const data = await response.json()
      setResult(data)
      
      if (response.ok) {
        toast({
          title: "Create Test Successful",
          description: `Created transcript for ${data.data?.clientName}`,
        })
      } else {
        toast({
          title: "Create Test Failed",
          description: data.error || 'Unknown error',
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Create Test Error",
        description: error instanceof Error ? error.message : 'Network error',
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>API Test</CardTitle>
        <CardDescription>
          Test the transcripts API endpoints
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button 
            onClick={testTranscriptsAPI} 
            disabled={loading || !session}
            variant="outline"
          >
            {loading ? 'Testing...' : 'Test GET /api/transcripts'}
          </Button>
          <Button 
            onClick={testCreateTranscript} 
            disabled={loading || !session}
          >
            {loading ? 'Testing...' : 'Test POST /api/transcripts'}
          </Button>
        </div>
        
        {!session && (
          <p className="text-sm text-muted-foreground">
            Please sign in to test the API
          </p>
        )}
        
        {session && (
          <div className="text-sm">
            <p>Signed in as: {session.user?.email}</p>
            <p>Role: {session.user?.role || 'Unknown'}</p>
          </div>
        )}
        
        {result && (
          <div className="mt-4">
            <h4 className="font-medium mb-2">API Response:</h4>
            <pre className="bg-muted p-2 rounded text-xs overflow-auto max-h-40">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  )
}