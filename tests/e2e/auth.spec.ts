import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test.describe('Authentication E2E', () => {
  test.beforeEach(async ({ page }) => {
    await injectAxe(page)
  })

  test('should redirect unauthenticated users to signin page', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Should redirect to signin
    await expect(page).toHaveURL('/auth/signin')
    
    // Check accessibility
    await checkA11y(page)
  })

  test('should display signin page correctly', async ({ page }) => {
    await page.goto('/auth/signin')
    
    // Check page elements
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible()
    await expect(page.getByText(/sign in to your account/i)).toBeVisible()
    
    // Check for OAuth providers (these would be configured in real app)
    // await expect(page.getByRole('button', { name: /sign in with/i })).toBeVisible()
    
    // Check accessibility
    await checkA11y(page)
  })

  test('should handle authentication error page', async ({ page }) => {
    await page.goto('/auth/error?error=Configuration')
    
    // Check error message
    await expect(page.getByText(/authentication error/i)).toBeVisible()
    await expect(page.getByText(/configuration/i)).toBeVisible()
    
    // Check back to signin link
    await expect(page.getByRole('link', { name: /back to sign in/i })).toBeVisible()
    
    // Check accessibility
    await checkA11y(page)
  })

  test('should display unauthorized page for insufficient permissions', async ({ page }) => {
    await page.goto('/unauthorized')
    
    // Check unauthorized message
    await expect(page.getByRole('heading', { name: /unauthorized/i })).toBeVisible()
    await expect(page.getByText(/don't have permission/i)).toBeVisible()
    
    // Check back to dashboard link
    await expect(page.getByRole('link', { name: /back to dashboard/i })).toBeVisible()
    
    // Check accessibility
    await checkA11y(page)
  })

  test('should navigate properly after authentication', async ({ page }) => {
    // Mock authentication by setting session cookie
    await page.context().addCookies([
      {
        name: 'next-auth.session-token',
        value: 'mock-session-token',
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        secure: false,
      },
    ])

    await page.goto('/dashboard')
    
    // Should stay on dashboard (not redirect)
    await expect(page).toHaveURL('/dashboard')
    
    // Check that protected content is visible
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible()
    
    // Check accessibility
    await checkA11y(page)
  })

  test('should handle session expiry gracefully', async ({ page }) => {
    // Start with valid session
    await page.context().addCookies([
      {
        name: 'next-auth.session-token',
        value: 'expired-session-token',
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        secure: false,
      },
    ])

    await page.goto('/dashboard')
    
    // Simulate session expiry by clearing cookies
    await page.context().clearCookies()
    
    // Navigate to another protected route
    await page.goto('/analytics')
    
    // Should redirect to signin
    await expect(page).toHaveURL('/auth/signin')
  })
})