import { render, screen, fireEvent } from '@testing-library/react'
import { signIn } from 'next-auth/react'
import { LoginButton } from '../login-button'

// Mock next-auth
jest.mock('next-auth/react')
const mockSignIn = signIn as jest.MockedFunction<typeof signIn>

describe('LoginButton', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders with default provider (auth0)', () => {
    render(<LoginButton />)
    
    expect(screen.getByRole('button')).toBeInTheDocument()
    expect(screen.getByText('Sign in with Auth0')).toBeInTheDocument()
  })

  it('renders with custom provider', () => {
    render(<LoginButton provider="google" />)
    
    expect(screen.getByText('Sign in with Google')).toBeInTheDocument()
  })

  it('calls signIn when clicked', () => {
    render(<LoginButton provider="github" callbackUrl="/custom" />)
    
    const button = screen.getByRole('button')
    fireEvent.click(button)
    
    expect(mockSignIn).toHaveBeenCalledWith('github', { callbackUrl: '/custom' })
  })

  it('applies custom className', () => {
    render(<LoginButton className="custom-class" />)
    
    const button = screen.getByRole('button')
    expect(button).toHaveClass('custom-class')
  })

  it('displays correct provider names', () => {
    const { rerender } = render(<LoginButton provider="auth0" />)
    expect(screen.getByText('Sign in with Auth0')).toBeInTheDocument()

    rerender(<LoginButton provider="google" />)
    expect(screen.getByText('Sign in with Google')).toBeInTheDocument()

    rerender(<LoginButton provider="github" />)
    expect(screen.getByText('Sign in with GitHub')).toBeInTheDocument()

    rerender(<LoginButton provider="unknown" />)
    expect(screen.getByText('Sign in with OAuth')).toBeInTheDocument()
  })
})