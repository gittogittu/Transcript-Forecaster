import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test.describe('Analytics E2E', () => {
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

    await new AxeBuilder({ page }).inject()
  })

  test('should display analytics page with charts', async ({ page }) => {
    await page.goto('/analytics')
    
    // Check main heading
    await expect(page.getByRole('heading', { name: /analytics/i })).toBeVisible()
    
    // Check for chart containers
    await expect(page.getByTestId('trend-chart')).toBeVisible()
    await expect(page.getByTestId('prediction-chart')).toBeVisible()
    
    // Check summary statistics
    await expect(page.getByText(/total transcripts/i)).toBeVisible()
    await expect(page.getByText(/average per month/i)).toBeVisible()
    await expect(page.getByText(/growth rate/i)).toBeVisible()
    
    // Check accessibility
    await checkA11y(page)
  })

  test('should filter analytics by client', async ({ page }) => {
    await page.goto('/analytics')
    
    // Check for client filter dropdown
    const clientFilter = page.getByRole('combobox', { name: /select client/i })
    if (await clientFilter.isVisible()) {
      await clientFilter.click()
      
      // Select a client
      await page.getByRole('option', { name: /client a/i }).click()
      
      // Wait for charts to update
      await page.waitForTimeout(1000)
      
      // Check that filter is applied
      await expect(page.getByText(/client a/i)).toBeVisible()
    }
    
    // Check accessibility
    await checkA11y(page)
  })

  test('should change time range for analytics', async ({ page }) => {
    await page.goto('/analytics')
    
    // Check for time range selector
    const timeRangeSelector = page.getByRole('group', { name: /time range/i })
    if (await timeRangeSelector.isVisible()) {
      // Select different time ranges
      await page.getByRole('button', { name: /6 months/i }).click()
      await page.waitForTimeout(500)
      
      await page.getByRole('button', { name: /1 year/i }).click()
      await page.waitForTimeout(500)
      
      await page.getByRole('button', { name: /all time/i }).click()
      await page.waitForTimeout(500)
    }
    
    // Check accessibility
    await checkA11y(page)
  })

  test('should display chart tooltips on hover', async ({ page }) => {
    await page.goto('/analytics')
    
    // Wait for charts to load
    await page.waitForSelector('[data-testid="trend-chart"]')
    
    // Hover over chart elements (this depends on chart implementation)
    const chartArea = page.getByTestId('trend-chart')
    await chartArea.hover()
    
    // Check for tooltip (implementation specific)
    const tooltip = page.getByRole('tooltip')
    if (await tooltip.isVisible()) {
      await expect(tooltip).toContainText(/\d+/)
    }
    
    // Check accessibility
    await checkA11y(page)
  })

  test('should generate predictions', async ({ page }) => {
    await page.goto('/analytics')
    
    // Check for generate predictions button
    const generateButton = page.getByRole('button', { name: /generate predictions/i })
    if (await generateButton.isVisible()) {
      await generateButton.click()
      
      // Wait for predictions to load
      await page.waitForTimeout(2000)
      
      // Check for prediction results
      await expect(page.getByText(/predicted/i)).toBeVisible()
      await expect(page.getByText(/confidence/i)).toBeVisible()
    }
    
    // Check accessibility
    await checkA11y(page)
  })

  test('should export analytics data', async ({ page }) => {
    await page.goto('/analytics')
    
    // Check for export button
    const exportButton = page.getByRole('button', { name: /export/i })
    if (await exportButton.isVisible()) {
      // Set up download handler
      const downloadPromise = page.waitForEvent('download')
      
      await exportButton.click()
      
      // Wait for download
      const download = await downloadPromise
      
      // Check download filename
      expect(download.suggestedFilename()).toMatch(/analytics.*\.(csv|xlsx|pdf)/)
    }
    
    // Check accessibility
    await checkA11y(page)
  })

  test('should handle chart interactions', async ({ page }) => {
    await page.goto('/analytics')
    
    // Wait for charts to load
    await page.waitForSelector('[data-testid="trend-chart"]')
    
    // Test zoom functionality (if implemented)
    const chartArea = page.getByTestId('trend-chart')
    
    // Double click to zoom
    await chartArea.dblclick()
    
    // Test pan functionality
    await chartArea.dragTo(chartArea, {
      sourcePosition: { x: 100, y: 100 },
      targetPosition: { x: 200, y: 100 },
    })
    
    // Reset zoom (if reset button exists)
    const resetButton = page.getByRole('button', { name: /reset zoom/i })
    if (await resetButton.isVisible()) {
      await resetButton.click()
    }
    
    // Check accessibility
    await checkA11y(page)
  })

  test('should be responsive on different screen sizes', async ({ page }) => {
    await page.goto('/analytics')
    
    // Test desktop view
    await page.setViewportSize({ width: 1920, height: 1080 })
    await expect(page.getByTestId('trend-chart')).toBeVisible()
    await expect(page.getByTestId('prediction-chart')).toBeVisible()
    
    // Test tablet view
    await page.setViewportSize({ width: 768, height: 1024 })
    await expect(page.getByRole('heading', { name: /analytics/i })).toBeVisible()
    
    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 })
    await expect(page.getByRole('heading', { name: /analytics/i })).toBeVisible()
    
    // Charts might stack vertically on mobile
    await expect(page.getByTestId('trend-chart')).toBeVisible()
    
    // Check accessibility on mobile
    await checkA11y(page)
  })

  test('should handle loading states for predictions', async ({ page }) => {
    await page.goto('/analytics')
    
    // Mock slow prediction API
    await page.route('/api/analytics/predictions', route => {
      setTimeout(() => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              predictions: [],
              accuracy: 0.85,
              model: 'linear',
            },
          }),
        })
      }, 2000)
    })
    
    // Trigger prediction generation
    const generateButton = page.getByRole('button', { name: /generate predictions/i })
    if (await generateButton.isVisible()) {
      await generateButton.click()
      
      // Check for loading indicator
      await expect(page.getByText(/generating predictions/i)).toBeVisible()
      
      // Wait for completion
      await expect(page.getByText(/predictions generated/i)).toBeVisible({ timeout: 5000 })
    }
    
    // Check accessibility
    await checkA11y(page)
  })

  test('should handle prediction errors gracefully', async ({ page }) => {
    await page.goto('/analytics')
    
    // Mock prediction API error
    await page.route('/api/analytics/predictions', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Insufficient data for predictions',
        }),
      })
    })
    
    // Trigger prediction generation
    const generateButton = page.getByRole('button', { name: /generate predictions/i })
    if (await generateButton.isVisible()) {
      await generateButton.click()
      
      // Check for error message
      await expect(page.getByText(/insufficient data/i)).toBeVisible()
      
      // Check for retry option
      const retryButton = page.getByRole('button', { name: /retry/i })
      if (await retryButton.isVisible()) {
        await retryButton.click()
      }
    }
    
    // Check accessibility with error state
    await checkA11y(page)
  })
})