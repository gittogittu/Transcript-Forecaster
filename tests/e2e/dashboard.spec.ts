import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test.describe('Dashboard E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
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

    await injectAxe(page)
  })

  test('should display dashboard with all components', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Check main heading
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible()
    
    // Check navigation
    await expect(page.getByRole('navigation')).toBeVisible()
    await expect(page.getByRole('link', { name: /dashboard/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /analytics/i })).toBeVisible()
    
    // Check metrics cards
    await expect(page.getByText(/total transcripts/i)).toBeVisible()
    await expect(page.getByText(/total clients/i)).toBeVisible()
    await expect(page.getByText(/this month/i)).toBeVisible()
    
    // Check data table
    await expect(page.getByRole('table')).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /client/i })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /month/i })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /count/i })).toBeVisible()
    
    // Check add transcript button
    await expect(page.getByRole('button', { name: /add transcript/i })).toBeVisible()
    
    // Check accessibility
    await checkA11y(page)
  })

  test('should open and close transcript form modal', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Click add transcript button
    await page.getByRole('button', { name: /add transcript/i }).click()
    
    // Check modal is open
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByRole('heading', { name: /add transcript data/i })).toBeVisible()
    
    // Check form fields
    await expect(page.getByLabel(/client name/i)).toBeVisible()
    await expect(page.getByLabel(/month/i)).toBeVisible()
    await expect(page.getByLabel(/transcript count/i)).toBeVisible()
    
    // Close modal by clicking outside or escape
    await page.keyboard.press('Escape')
    
    // Modal should be closed
    await expect(page.getByRole('dialog')).not.toBeVisible()
    
    // Check accessibility
    await checkA11y(page)
  })

  test('should submit transcript form successfully', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Open form
    await page.getByRole('button', { name: /add transcript/i }).click()
    
    // Fill form
    await page.getByLabel(/client name/i).fill('Test Client E2E')
    await page.getByLabel(/month/i).fill('2024-03')
    await page.getByLabel(/transcript count/i).fill('150')
    await page.getByLabel(/notes/i).fill('E2E test transcript')
    
    // Submit form
    await page.getByRole('button', { name: /add transcript/i }).click()
    
    // Wait for success message or modal to close
    await expect(page.getByRole('dialog')).not.toBeVisible()
    
    // Check that new data appears in table (if real API integration)
    // await expect(page.getByText('Test Client E2E')).toBeVisible()
    
    // Check accessibility
    await checkA11y(page)
  })

  test('should handle form validation errors', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Open form
    await page.getByRole('button', { name: /add transcript/i }).click()
    
    // Submit empty form
    await page.getByRole('button', { name: /add transcript/i }).click()
    
    // Check validation errors
    await expect(page.getByText(/client name is required/i)).toBeVisible()
    await expect(page.getByText(/month is required/i)).toBeVisible()
    
    // Check accessibility with errors
    await checkA11y(page)
  })

  test('should filter and sort data table', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Check if table has data
    const table = page.getByRole('table')
    await expect(table).toBeVisible()
    
    // Test sorting by clicking column headers
    await page.getByRole('columnheader', { name: /client/i }).click()
    
    // Test filtering (if implemented)
    const searchInput = page.getByPlaceholder(/search/i)
    if (await searchInput.isVisible()) {
      await searchInput.fill('Client A')
      // Check filtered results
      await expect(page.getByText('Client A')).toBeVisible()
    }
    
    // Check accessibility
    await checkA11y(page)
  })

  test('should be responsive on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    
    await page.goto('/dashboard')
    
    // Check mobile navigation (hamburger menu)
    const mobileMenu = page.getByRole('button', { name: /menu/i })
    if (await mobileMenu.isVisible()) {
      await mobileMenu.click()
      await expect(page.getByRole('navigation')).toBeVisible()
    }
    
    // Check that content is still accessible
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible()
    
    // Check that table is responsive (might be cards on mobile)
    const content = page.getByText(/total transcripts/i)
    await expect(content).toBeVisible()
    
    // Check accessibility on mobile
    await checkA11y(page)
  })

  test('should handle loading states', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Check for loading indicators
    const loadingSpinner = page.getByTestId('loading-spinner')
    const skeletonLoader = page.getByTestId('skeleton-loader')
    
    // These might be visible briefly during initial load
    // We can't easily test this without network throttling
    
    // Ensure content eventually loads
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible()
    
    // Check accessibility
    await checkA11y(page)
  })

  test('should handle error states gracefully', async ({ page }) => {
    // Mock API error by intercepting requests
    await page.route('/api/transcripts', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Server error' }),
      })
    })

    await page.goto('/dashboard')
    
    // Check for error message
    await expect(page.getByText(/error/i)).toBeVisible()
    
    // Check for retry button if implemented
    const retryButton = page.getByRole('button', { name: /retry/i })
    if (await retryButton.isVisible()) {
      await retryButton.click()
    }
    
    // Check accessibility with error state
    await checkA11y(page)
  })
})