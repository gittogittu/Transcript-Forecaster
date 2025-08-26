import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TranscriptForm } from '../transcript-form'

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

// Mock fetch
const mockFetch = jest.fn()
global.fetch = mockFetch

// Mock console.error to avoid noise in tests
const originalConsoleError = console.error
beforeAll(() => {
  console.error = jest.fn()
})

afterAll(() => {
  console.error = originalConsoleError
})

// Helper function to create a test wrapper with QueryClient
const createTestWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

describe('TranscriptForm', () => {
  let user: ReturnType<typeof userEvent.setup>

  beforeEach(() => {
    user = userEvent.setup()
    mockFetch.mockClear()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Form Rendering', () => {
    it('renders all form fields correctly', () => {
      const Wrapper = createTestWrapper()
      render(
        <Wrapper>
          <TranscriptForm />
        </Wrapper>
      )

      expect(screen.getByLabelText(/client name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/month/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/transcript count/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/notes/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /add transcript/i })).toBeInTheDocument()
    })

    it('displays form title and description', () => {
      const Wrapper = createTestWrapper()
      render(
        <Wrapper>
          <TranscriptForm />
        </Wrapper>
      )

      expect(screen.getByText('Add Transcript Data')).toBeInTheDocument()
      expect(screen.getByText(/enter new transcript data for a client/i)).toBeInTheDocument()
    })

    it('shows field descriptions', () => {
      const Wrapper = createTestWrapper()
      render(
        <Wrapper>
          <TranscriptForm />
        </Wrapper>
      )

      expect(screen.getByText(/the name of the client for this transcript data/i)).toBeInTheDocument()
      expect(screen.getByText(/select the month for this transcript data/i)).toBeInTheDocument()
      expect(screen.getByText(/number of transcripts for this client and month/i)).toBeInTheDocument()
      expect(screen.getByText(/optional notes or additional information/i)).toBeInTheDocument()
    })
  })

  describe('Form Validation', () => {
    it('shows validation errors for empty required fields', async () => {
      const Wrapper = createTestWrapper()
      render(
        <Wrapper>
          <TranscriptForm />
        </Wrapper>
      )

      const submitButton = screen.getByRole('button', { name: /add transcript/i })
      
      // Try to submit empty form
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/client name is required/i)).toBeInTheDocument()
        expect(screen.getByText(/month must be in yyyy-mm format/i)).toBeInTheDocument()
      })
    })

    it('validates client name length', async () => {
      const Wrapper = createTestWrapper()
      render(
        <Wrapper>
          <TranscriptForm />
        </Wrapper>
      )

      const clientNameInput = screen.getByLabelText(/client name/i)
      
      // Test maximum length validation
      const longName = 'a'.repeat(101)
      await user.type(clientNameInput, longName)
      
      await waitFor(() => {
        expect(screen.getByText(/client name must be less than 100 characters/i)).toBeInTheDocument()
      })
    })

    it('validates month format', async () => {
      const Wrapper = createTestWrapper()
      render(
        <Wrapper>
          <TranscriptForm />
        </Wrapper>
      )

      const monthInput = screen.getByLabelText(/month/i)
      
      // Test invalid month format
      await user.type(monthInput, '2024-13')
      
      await waitFor(() => {
        expect(screen.getByText(/month must be a valid date/i)).toBeInTheDocument()
      })
    })

    it('validates transcript count range', async () => {
      const Wrapper = createTestWrapper()
      render(
        <Wrapper>
          <TranscriptForm />
        </Wrapper>
      )

      const countInput = screen.getByLabelText(/transcript count/i)
      
      // Test negative number
      await user.clear(countInput)
      await user.type(countInput, '-1')
      
      await waitFor(() => {
        expect(screen.getByText(/count must be non-negative/i)).toBeInTheDocument()
      })

      // Test very high number
      await user.clear(countInput)
      await user.type(countInput, '10001')
      
      await waitFor(() => {
        expect(screen.getByText(/count seems unusually high/i)).toBeInTheDocument()
      })
    })

    it('validates notes length', async () => {
      const Wrapper = createTestWrapper()
      render(
        <Wrapper>
          <TranscriptForm />
        </Wrapper>
      )

      const notesInput = screen.getByLabelText(/notes/i)
      
      // Test maximum length validation
      const longNotes = 'a'.repeat(501)
      await user.type(notesInput, longNotes)
      
      await waitFor(() => {
        expect(screen.getByText(/notes must be less than 500 characters/i)).toBeInTheDocument()
      })
    })

    it('enables submit button only when form is valid', async () => {
      const Wrapper = createTestWrapper()
      render(
        <Wrapper>
          <TranscriptForm />
        </Wrapper>
      )

      const submitButton = screen.getByRole('button', { name: /add transcript/i })
      const clientNameInput = screen.getByLabelText(/client name/i)
      const monthInput = screen.getByLabelText(/month/i)
      const countInput = screen.getByLabelText(/transcript count/i)

      // Initially disabled
      expect(submitButton).toBeDisabled()

      // Fill in valid data
      await user.type(clientNameInput, 'Test Client')
      await user.type(monthInput, '2024-01')
      await user.clear(countInput)
      await user.type(countInput, '100')

      await waitFor(() => {
        expect(submitButton).toBeEnabled()
      })
    })
  })

  describe('Form Submission', () => {
    it('submits form with valid data', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      const onSuccess = jest.fn()
      const Wrapper = createTestWrapper()
      
      render(
        <Wrapper>
          <TranscriptForm onSuccess={onSuccess} />
        </Wrapper>
      )

      // Fill in form
      await user.type(screen.getByLabelText(/client name/i), 'Test Client')
      await user.type(screen.getByLabelText(/month/i), '2024-01')
      await user.clear(screen.getByLabelText(/transcript count/i))
      await user.type(screen.getByLabelText(/transcript count/i), '100')
      await user.type(screen.getByLabelText(/notes/i), 'Test notes')

      // Submit form
      await user.click(screen.getByRole('button', { name: /add transcript/i }))

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/transcripts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            clientName: 'Test Client',
            month: '2024-01',
            transcriptCount: 100,
            notes: 'Test notes',
          }),
        })
      })

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledWith({
          clientName: 'Test Client',
          month: '2024-01',
          transcriptCount: 100,
          notes: 'Test notes',
        })
      })
    })

    it('shows loading state during submission', async () => {
      // Mock a delayed response
      mockFetch.mockImplementationOnce(
        () => new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => ({ success: true }),
        }), 100))
      )

      const Wrapper = createTestWrapper()
      render(
        <Wrapper>
          <TranscriptForm />
        </Wrapper>
      )

      // Fill in form
      await user.type(screen.getByLabelText(/client name/i), 'Test Client')
      await user.type(screen.getByLabelText(/month/i), '2024-01')
      await user.clear(screen.getByLabelText(/transcript count/i))
      await user.type(screen.getByLabelText(/transcript count/i), '100')

      // Submit form
      await user.click(screen.getByRole('button', { name: /add transcript/i }))

      // Check loading state
      expect(screen.getByText(/submitting/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /submitting/i })).toBeDisabled()

      // Wait for completion
      await waitFor(() => {
        expect(screen.queryByText(/submitting/i)).not.toBeInTheDocument()
      }, { timeout: 2000 })
    })

    it('shows success state after successful submission', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      const Wrapper = createTestWrapper()
      render(
        <Wrapper>
          <TranscriptForm />
        </Wrapper>
      )

      // Fill in form
      await user.type(screen.getByLabelText(/client name/i), 'Test Client')
      await user.type(screen.getByLabelText(/month/i), '2024-01')
      await user.clear(screen.getByLabelText(/transcript count/i))
      await user.type(screen.getByLabelText(/transcript count/i), '100')

      // Submit form
      await user.click(screen.getByRole('button', { name: /add transcript/i }))

      await waitFor(() => {
        expect(screen.getByText(/success/i)).toBeInTheDocument()
      })
    })

    it('resets form after successful submission', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      const Wrapper = createTestWrapper()
      render(
        <Wrapper>
          <TranscriptForm />
        </Wrapper>
      )

      const clientNameInput = screen.getByLabelText(/client name/i) as HTMLInputElement
      const monthInput = screen.getByLabelText(/month/i) as HTMLInputElement
      const countInput = screen.getByLabelText(/transcript count/i) as HTMLInputElement
      const notesInput = screen.getByLabelText(/notes/i) as HTMLTextAreaElement

      // Fill in form
      await user.type(clientNameInput, 'Test Client')
      await user.type(monthInput, '2024-01')
      await user.clear(countInput)
      await user.type(countInput, '100')
      await user.type(notesInput, 'Test notes')

      // Submit form
      await user.click(screen.getByRole('button', { name: /add transcript/i }))

      await waitFor(() => {
        expect(clientNameInput.value).toBe('')
        expect(monthInput.value).toBe('')
        expect(countInput.value).toBe('0')
        expect(notesInput.value).toBe('')
      })
    })

    it('handles submission errors', async () => {
      const errorMessage = 'Failed to save data'
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: errorMessage }),
      })

      const onError = jest.fn()
      const Wrapper = createTestWrapper()
      
      render(
        <Wrapper>
          <TranscriptForm onError={onError} />
        </Wrapper>
      )

      // Fill in form
      await user.type(screen.getByLabelText(/client name/i), 'Test Client')
      await user.type(screen.getByLabelText(/month/i), '2024-01')
      await user.clear(screen.getByLabelText(/transcript count/i))
      await user.type(screen.getByLabelText(/transcript count/i), '100')

      // Submit form
      await user.click(screen.getByRole('button', { name: /add transcript/i }))

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument()
        expect(onError).toHaveBeenCalledWith(expect.any(Error))
      })
    })

    it('handles network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const onError = jest.fn()
      const Wrapper = createTestWrapper()
      
      render(
        <Wrapper>
          <TranscriptForm onError={onError} />
        </Wrapper>
      )

      // Fill in form
      await user.type(screen.getByLabelText(/client name/i), 'Test Client')
      await user.type(screen.getByLabelText(/month/i), '2024-01')
      await user.clear(screen.getByLabelText(/transcript count/i))
      await user.type(screen.getByLabelText(/transcript count/i), '100')

      // Submit form
      await user.click(screen.getByRole('button', { name: /add transcript/i }))

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(expect.any(Error))
      })
    })
  })

  describe('Real-time Validation', () => {
    it('shows validation errors as user types', async () => {
      const Wrapper = createTestWrapper()
      render(
        <Wrapper>
          <TranscriptForm />
        </Wrapper>
      )

      const clientNameInput = screen.getByLabelText(/client name/i)
      
      // Type and clear to trigger validation
      await user.type(clientNameInput, 'a')
      await user.clear(clientNameInput)
      
      await waitFor(() => {
        expect(screen.getByText(/client name is required/i)).toBeInTheDocument()
      })
    })

    it('clears validation errors when field becomes valid', async () => {
      const Wrapper = createTestWrapper()
      render(
        <Wrapper>
          <TranscriptForm />
        </Wrapper>
      )

      const clientNameInput = screen.getByLabelText(/client name/i)
      
      // Trigger error
      await user.type(clientNameInput, 'a')
      await user.clear(clientNameInput)
      
      await waitFor(() => {
        expect(screen.getByText(/client name is required/i)).toBeInTheDocument()
      })

      // Fix error
      await user.type(clientNameInput, 'Valid Client Name')
      
      await waitFor(() => {
        expect(screen.queryByText(/client name is required/i)).not.toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    it('has proper form labels and descriptions', () => {
      const Wrapper = createTestWrapper()
      render(
        <Wrapper>
          <TranscriptForm />
        </Wrapper>
      )

      const clientNameInput = screen.getByLabelText(/client name/i)
      const monthInput = screen.getByLabelText(/month/i)
      const countInput = screen.getByLabelText(/transcript count/i)
      const notesInput = screen.getByLabelText(/notes/i)

      expect(clientNameInput).toHaveAttribute('aria-describedby')
      expect(monthInput).toHaveAttribute('aria-describedby')
      expect(countInput).toHaveAttribute('aria-describedby')
      expect(notesInput).toHaveAttribute('aria-describedby')
    })

    it('marks invalid fields with aria-invalid', async () => {
      const Wrapper = createTestWrapper()
      render(
        <Wrapper>
          <TranscriptForm />
        </Wrapper>
      )

      const clientNameInput = screen.getByLabelText(/client name/i)
      
      // Trigger validation error
      await user.type(clientNameInput, 'a')
      await user.clear(clientNameInput)
      
      await waitFor(() => {
        expect(clientNameInput).toHaveAttribute('aria-invalid', 'true')
      })
    })
  })

  describe('Edge Cases', () => {
    it('handles zero transcript count', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      const Wrapper = createTestWrapper()
      render(
        <Wrapper>
          <TranscriptForm />
        </Wrapper>
      )

      // Fill in form with zero count
      await user.type(screen.getByLabelText(/client name/i), 'Test Client')
      await user.type(screen.getByLabelText(/month/i), '2024-01')
      // Count defaults to 0, so no need to change it

      // Submit form
      await user.click(screen.getByRole('button', { name: /add transcript/i }))

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/transcripts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            clientName: 'Test Client',
            month: '2024-01',
            transcriptCount: 0,
            notes: '',
          }),
        })
      })
    })

    it('trims whitespace from text inputs', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      const Wrapper = createTestWrapper()
      render(
        <Wrapper>
          <TranscriptForm />
        </Wrapper>
      )

      // Fill in form with whitespace
      await user.type(screen.getByLabelText(/client name/i), '  Test Client  ')
      await user.type(screen.getByLabelText(/month/i), '2024-01')
      await user.clear(screen.getByLabelText(/transcript count/i))
      await user.type(screen.getByLabelText(/transcript count/i), '100')
      await user.type(screen.getByLabelText(/notes/i), '  Test notes  ')

      // Submit form
      await user.click(screen.getByRole('button', { name: /add transcript/i }))

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/transcripts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            clientName: 'Test Client',
            month: '2024-01',
            transcriptCount: 100,
            notes: 'Test notes',
          }),
        })
      })
    })
  })
})