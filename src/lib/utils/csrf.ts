/**
 * Utility functions for handling CSRF tokens on the client side
 */

/**
 * Get CSRF token from meta tag, cookie, or fetch from server
 */
export async function getCSRFToken(): Promise<string | null> {
  // First try to get from meta tag
  const metaTag = document.querySelector('meta[name="csrf-token"]')
  if (metaTag) {
    const token = metaTag.getAttribute('content')
    if (token) return token
  }

  // Try to get from cookie
  const cookies = document.cookie.split(';')
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=')
    if (name === 'csrf-token') {
      return decodeURIComponent(value)
    }
  }

  // Try to get from sessionStorage (if set by previous request)
  const sessionToken = sessionStorage.getItem('csrf-token')
  if (sessionToken) {
    return sessionToken
  }

  // If no token found, try to get it from a simple GET request
  try {
    const response = await fetch('/api/security/csrf', {
      method: 'GET',
      credentials: 'include'
    })
    
    if (response.ok) {
      // Try to get token from response header first
      const headerToken = response.headers.get('x-csrf-token')
      if (headerToken) {
        setCSRFToken(headerToken)
        return headerToken
      }
      
      // Fallback to JSON response
      try {
        const data = await response.json()
        if (data.csrfToken) {
          setCSRFToken(data.csrfToken)
          return data.csrfToken
        }
      } catch (jsonError) {
        console.warn('Failed to parse CSRF response as JSON:', jsonError)
      }
    } else {
      console.warn('CSRF endpoint returned non-OK status:', response.status, response.statusText)
    }
  } catch (error) {
    console.warn('Failed to fetch CSRF token:', error)
  }

  return null
}

/**
 * Set CSRF token in sessionStorage for future requests
 */
export function setCSRFToken(token: string): void {
  sessionStorage.setItem('csrf-token', token)
}

/**
 * Get headers with CSRF token included
 */
export async function getCSRFHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  
  try {
    const token = await getCSRFToken()
    if (token) {
      headers['x-csrf-token'] = token
    }
  } catch (error) {
    console.warn('Failed to get CSRF token for headers:', error)
    // Continue without CSRF token - let the server handle the validation
  }
  
  return headers
}