import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SessionProvider } from 'next-auth/react'
import { Session } from 'next-auth'

// Mock session for testing
const mockSession: Session = {
  user: {
    id: '1',
    name: 'Test User',
    email: 'test@example.com',
    image: null,
  },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
}

interface AllTheProvidersProps {
  children: React.ReactNode
  session?: Session | null
}

const AllTheProviders = ({ children, session = mockSession }: AllTheProvidersProps) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider session={session}>
        {children}
      </SessionProvider>
    </QueryClientProvider>
  )
}

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  session?: Session | null
}

const customRender = (
  ui: ReactElement,
  { session, ...options }: CustomRenderOptions = {}
) =>
  render(ui, {
    wrapper: (props) => <AllTheProviders {...props} session={session} />,
    ...options,
  })

export * from '@testing-library/react'
export { customRender as render }
export { mockSession }