import { render, screen, fireEvent } from '@testing-library/react'
import { signOut } from 'next-auth/react'
import { LogoutButton } from '../logout-button'

// Mock next-auth
jest.mock('next-auth/react')
const mockSignOut = signOut as jest.MockedFunction<typeof signOut>

describe('LogoutButton', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders with default text', () => {
    render(<LogoutButton />)
    
    expect(screen.getByRole('button')).toBeInTheDocument()
    expect(screen.getByText('Sign out')).toBeInTheDocument()
  })

  it('calls signOut when clicked', () => {
    render(<LogoutButton callbackUrl="/custom" />)
    
    const button = screen.getByRole('button')
    fireEvent.click(button)
    
    expect(mockSignOut).toHaveBeenCalledWith({ callbackUrl: '/custom' })
  })

  it('uses default callback URL', () => {
    render(<LogoutButton />)
    
    const button = screen.getByRole('button')
    fireEvent.click(button)
    
    expect(mockSignOut).toHaveBeenCalledWith({ callbackUrl: '/' })
  })

  it('applies custom className and variant', () => {
    render(<LogoutButton className="custom-class" variant="ghost" />)
    
    const button = screen.getByRole('button')
    expect(button).toHaveClass('custom-class')
  })
})