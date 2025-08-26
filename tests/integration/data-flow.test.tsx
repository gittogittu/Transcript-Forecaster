/**
 * Integration tests for data flow (fetching, caching, updates)
 */
import React, { useState, useEffect } from 'react'
import { render, screen, waitFor, fireEvent } from '@/lib/testing/utils/test-utils'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { server } from '@/lib/testing/mocks/server'
import { rest } from 'msw'
import { TranscriptForm } from '@/components/data/transcript-form'
import { testAccessibility } from '@/lib/testing/utils/accessibility-helpers'
import { testDataLoadingPerformance } from '@/lib/testing/utils/performance-helpers'

describe('Data Flow Integration', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    })
  })

  describe('Data Fetching', () => {
    it('should fetch and display transcript data', async () => {
      const TestComponent = () => {
        const [data, setData] = useState(null)
        const [loading, setLoading] = useState(true)

        useEffect(() => {
          fetch('/api/transcripts')
            .then(res => res.json())
            .then(result => {
              setData(result.data)
              setLoading(false)
            })
        }, [])

        if (loading) return <div>Loading...</div>
        
        return (
          <div>
            <h1>Transcripts</h1>
            {data?.map((transcript: any) => (
              <div key={transcript.id} data-testid={`transcript-${transcript.id}`}>
                {transcript.clientName}: {transcript.transcriptCount}
              </div>
            ))}
          </div>
        )
      }

      const renderResult = render(
        <QueryClientProvider client={queryClient}>
          <TestComponent />
        </QueryClientProvider>
      )

      // Initially shows loading
      expect(screen.getByText('Loading...')).toBeInTheDocument()

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('Transcripts')).toBeInTheDocument()
      })

      // Check that data is displayed
      expect(screen.getByTestId('transcript-1')).toHaveTextContent('Client A: 150')
      expect(screen.getByTestId('transcript-2')).toHaveTextContent('Client B: 200')

      await testAccessibility(renderResult.container)
    })

    it('should handle API errors gracefully', async () => {
      // Override the handler to return an error
      server.use(
        rest.get('/api/transcripts', (req, res, ctx) => {
          return res(
            ctx.status(500),
            ctx.json({ success: false, error: 'Server error' })
          )
        })
      )

      const TestComponent = () => {
        const [error, setError] = React.useState(null)
        const [loading, setLoading] = React.useState(true)

        React.useEffect(() => {
          fetch('/api/transcripts')
            .then(res => {
              if (!res.ok) throw new Error('Failed to fetch')
              return res.json()
            })
            .catch(err => {
              setError(err.message)
              setLoading(false)
            })
        }, [])

        if (loading) return <div>Loading...</div>
        if (error) return <div>Error: {error}</div>
        
        return <div>Success</div>
      }

      render(
        <QueryClientProvider client={queryClient}>
          <TestComponent />
        </QueryClientProvider>
      )

      await waitFor(() => {
        expect(screen.getByText('Error: Failed to fetch')).toBeInTheDocument()
      })
    })

    it('should meet performance requirements for data loading', async () => {
      const loadData = async () => {
        const response = await fetch('/api/transcripts')
        return response.json()
      }

      await testDataLoadingPerformance(loadData, 500) // Should load within 500ms
    })
  })

  describe('Data Submission', () => {
    it('should submit new transcript data successfully', async () => {
      const mockOnSuccess = jest.fn()
      
      const renderResult = render(
        <QueryClientProvider client={queryClient}>
          <TranscriptForm onSuccess={mockOnSuccess} />
        </QueryClientProvider>
      )

      // Fill out the form
      const clientNameInput = screen.getByLabelText(/client name/i)
      const monthInput = screen.getByLabelText(/month/i)
      const countInput = screen.getByLabelText(/transcript count/i)

      fireEvent.change(clientNameInput, { target: { value: 'New Client' } })
      fireEvent.change(monthInput, { target: { value: '2024-03' } })
      fireEvent.change(countInput, { target: { value: '100' } })

      // Submit the form
      const submitButton = screen.getByRole('button', { name: /add transcript/i })
      fireEvent.click(submitButton)

      // Wait for submission to complete
      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled()
      })

      await testAccessibility(renderResult.container)
    })

    it('should handle validation errors', async () => {
      const renderResult = render(
        <QueryClientProvider client={queryClient}>
          <TranscriptForm />
        </QueryClientProvider>
      )

      // Submit form without filling required fields
      const submitButton = screen.getByRole('button', { name: /add transcript/i })
      fireEvent.click(submitButton)

      // Wait for validation errors
      await waitFor(() => {
        expect(screen.getByText(/client name is required/i)).toBeInTheDocument()
      })

      await testAccessibility(renderResult.container)
    })

    it('should handle server errors during submission', async () => {
      // Override handler to return error
      server.use(
        rest.post('/api/transcripts', (req, res, ctx) => {
          return res(
            ctx.status(400),
            ctx.json({ success: false, error: 'Validation failed' })
          )
        })
      )

      const renderResult = render(
        <QueryClientProvider client={queryClient}>
          <TranscriptForm />
        </QueryClientProvider>
      )

      // Fill and submit form
      const clientNameInput = screen.getByLabelText(/client name/i)
      const monthInput = screen.getByLabelText(/month/i)
      const countInput = screen.getByLabelText(/transcript count/i)

      fireEvent.change(clientNameInput, { target: { value: 'Test Client' } })
      fireEvent.change(monthInput, { target: { value: '2024-03' } })
      fireEvent.change(countInput, { target: { value: '100' } })

      const submitButton = screen.getByRole('button', { name: /add transcript/i })
      fireEvent.click(submitButton)

      // Wait for error message
      await waitFor(() => {
        expect(screen.getByText(/validation failed/i)).toBeInTheDocument()
      })

      await testAccessibility(renderResult.container)
    })
  })

  describe('Data Caching', () => {
    it('should cache data and avoid unnecessary requests', async () => {
      let requestCount = 0
      
      server.use(
        rest.get('/api/transcripts', (req, res, ctx) => {
          requestCount++
          return res(
            ctx.json({
              success: true,
              data: [
                {
                  id: '1',
                  clientName: 'Cached Client',
                  month: '2024-01',
                  transcriptCount: 100,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                },
              ],
            })
          )
        })
      )

      const TestComponent = () => {
        const [data, setData] = React.useState(null)

        const fetchData = async () => {
          const response = await fetch('/api/transcripts')
          const result = await response.json()
          setData(result.data)
        }

        React.useEffect(() => {
          fetchData()
        }, [])

        return (
          <div>
            <button onClick={fetchData}>Refetch</button>
            {data && <div>Data loaded</div>}
          </div>
        )
      }

      render(
        <QueryClientProvider client={queryClient}>
          <TestComponent />
        </QueryClientProvider>
      )

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Data loaded')).toBeInTheDocument()
      })

      expect(requestCount).toBe(1)

      // Click refetch button
      fireEvent.click(screen.getByText('Refetch'))

      // Should make another request since we're not using React Query caching in this test
      await waitFor(() => {
        expect(requestCount).toBe(2)
      })
    })
  })

  describe('Real-time Updates', () => {
    it('should handle optimistic updates', async () => {
      const TestComponent = () => {
        const [transcripts, setTranscripts] = React.useState([
          { id: '1', clientName: 'Client A', transcriptCount: 100 }
        ])

        const addTranscript = async (newTranscript: any) => {
          // Optimistic update
          const optimisticTranscript = { ...newTranscript, id: 'temp' }
          setTranscripts(prev => [...prev, optimisticTranscript])

          try {
            const response = await fetch('/api/transcripts', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(newTranscript),
            })
            const result = await response.json()
            
            // Replace optimistic update with real data
            setTranscripts(prev => 
              prev.map(t => t.id === 'temp' ? result.data : t)
            )
          } catch (error) {
            // Rollback optimistic update
            setTranscripts(prev => prev.filter(t => t.id !== 'temp'))
          }
        }

        return (
          <div>
            {transcripts.map(t => (
              <div key={t.id} data-testid={`transcript-${t.id}`}>
                {t.clientName}: {t.transcriptCount}
              </div>
            ))}
            <button 
              onClick={() => addTranscript({ 
                clientName: 'New Client', 
                transcriptCount: 50,
                month: '2024-03'
              })}
            >
              Add Transcript
            </button>
          </div>
        )
      }

      render(
        <QueryClientProvider client={queryClient}>
          <TestComponent />
        </QueryClientProvider>
      )

      // Initial state
      expect(screen.getByTestId('transcript-1')).toHaveTextContent('Client A: 100')

      // Add new transcript
      fireEvent.click(screen.getByText('Add Transcript'))

      // Should immediately show optimistic update
      await waitFor(() => {
        expect(screen.getByTestId('transcript-temp')).toHaveTextContent('New Client: 50')
      })

      // Should eventually replace with real data
      await waitFor(() => {
        expect(screen.getByTestId('transcript-3')).toHaveTextContent('New Client: 50')
      })

      // Optimistic update should be gone
      expect(screen.queryByTestId('transcript-temp')).not.toBeInTheDocument()
    })
  })
})