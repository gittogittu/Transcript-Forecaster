"use client"

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'

export function BasicTest() {
  const { data: session } = useSession()
  const [result, setResult] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)

  const testAPI = async () => {
    setIsLoading(true)
    setResult('')
    
    try {
      console.log('Testing basic API connectivity...')
      
      // Test 1: Simple GET request
      const getResponse = await fetch('/api/transcripts', {
        method: 'GET',
        credentials: 'include'
      })
      
      console.log('GET Response:', getResponse.status, getResponse.statusText)
      
      if (getResponse.ok) {
        const getData = await getResponse.json()
        console.log('GET Data:', getData)
        setResult(`GET Success: ${JSON.stringify(getData, null, 2)}`)
      } else {
        const errorText = await getResponse.text()
        console.log('GET Error:', errorText)
        setResult(`GET Failed: ${getResponse.status} - ${errorText}`)
      }
      
    } catch (error) {
      console.error('Test error:', error)
      setResult(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsLoading(false)
    }
  }

  const testPOST = async () => {
    setIsLoading(true)
    setResult('')
    
    try {
      console.log('Testing POST request...')
      
      if (!session?.user?.id) {
        setResult('Error: No user session found')
        return
      }
      
      // Generate a proper UUID for clientId
      const testClientId = crypto.randomUUID()
      
      const testData = [{
        clientId: testClientId,
        clientName: 'Test Client',
        date: '2024-01-01T00:00:00.000Z',
        transcriptCount: 1,
        transcriptType: 'call',
        notes: 'Basic test',
        createdBy: session.user.id
      }]
      
      console.log('Sending POST data:', testData)
      console.log('Session user:', session.user)
      console.log('JSON stringified data:', JSON.stringify(testData))
      
      const response = await fetch('/api/test-upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(testData)
      })
      
      console.log('POST Response:', response.status, response.statusText)
      
      if (response.ok) {
        const data = await response.json()
        console.log('POST Success:', data)
        setResult(`POST Success: ${JSON.stringify(data, null, 2)}`)
      } else {
        const errorText = await response.text()
        console.log('POST Error:', errorText)
        setResult(`POST Failed: ${response.status} - ${errorText}`)
      }
      
    } catch (error) {
      console.error('POST test error:', error)
      setResult(`POST Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Basic API Test</CardTitle>
        <CardDescription>
          Test basic API connectivity without file upload complexity
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button onClick={testAPI} disabled={isLoading}>
            Test GET
          </Button>
          <Button onClick={testPOST} disabled={isLoading}>
            Test POST
          </Button>
        </div>
        
        {result && (
          <Alert>
            <AlertDescription>
              <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-64">
                {result}
              </pre>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}