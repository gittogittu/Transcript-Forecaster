/**
 * Complete User Workflow E2E Test
 * Tests the entire user journey from authentication to analytics
 */

import { test, expect, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

class WorkflowTestHelper {
  constructor(private page: Page) {}

  async login() {
    // Navigate to the application
    await this.page.goto('/');
    
    // Check if we're redirected to login
    await this.page.waitForURL(/\/auth\/signin/);
    
    // Mock authentication for testing
    await this.page.evaluate(() => {
      // Mock NextAuth session
      window.localStorage.setItem('next-auth.session-token', 'mock-session-token');
      window.localStorage.setItem('next-auth.csrf-token', 'mock-csrf-token');
    });
    
    // Click login button (this would normally redirect to OAuth provider)
    await this.page.click('[data-testid="login-button"]');
    
    // Wait for redirect to dashboard
    await this.page.waitForURL('/dashboard');
    
    // Verify we're logged in
    await expect(this.page.locator('[data-testid="user-profile"]')).toBeVisible();
  }

  async navigateToDashboard() {
    await this.page.goto('/dashboard');
    await this.page.waitForLoadState('networkidle');
    
    // Verify dashboard elements are loaded
    await expect(this.page.locator('[data-testid="metrics-cards"]')).toBeVisible();
    await expect(this.page.locator('[data-testid="data-table"]')).toBeVisible();
  }

  async addTranscriptData(clientName: string, transcriptCount: number) {
    // Click add data button
    await this.page.click('[data-testid="add-data-button"]');
    
    // Fill in the form
    await this.page.fill('[data-testid="client-name-input"]', clientName);
    await this.page.fill('[data-testid="transcript-count-input"]', transcriptCount.toString());
    
    // Submit the form
    await this.page.click('[data-testid="submit-button"]');
    
    // Wait for success message
    await expect(this.page.locator('[data-testid="success-message"]')).toBeVisible();
    
    // Verify data appears in table
    await expect(this.page.locator(`[data-testid="client-row-${clientName}"]`)).toBeVisible();
  }

  async viewAnalytics() {
    // Navigate to analytics page
    await this.page.click('[data-testid="analytics-nav-link"]');
    await this.page.waitForURL('/analytics');
    await this.page.waitForLoadState('networkidle');
    
    // Verify charts are loaded
    await expect(this.page.locator('[data-testid="trend-chart"]')).toBeVisible();
    await expect(this.page.locator('[data-testid="prediction-chart"]')).toBeVisible();
  }

  async generatePredictions() {
    // Click generate predictions button
    await this.page.click('[data-testid="generate-predictions-button"]');
    
    // Wait for predictions to load
    await this.page.waitForSelector('[data-testid="prediction-results"]', { timeout: 30000 });
    
    // Verify predictions are displayed
    await expect(this.page.locator('[data-testid="prediction-results"]')).toBeVisible();
    await expect(this.page.locator('[data-testid="confidence-interval"]')).toBeVisible();
  }

  async testResponsiveness() {
    // Test mobile viewport
    await this.page.setViewportSize({ width: 375, height: 667 });
    await this.page.waitForTimeout(1000);
    
    // Verify mobile navigation works
    await this.page.click('[data-testid="mobile-menu-button"]');
    await expect(this.page.locator('[data-testid="mobile-menu"]')).toBeVisible();
    
    // Test tablet viewport
    await this.page.setViewportSize({ width: 768, height: 1024 });
    await this.page.waitForTimeout(1000);
    
    // Test desktop viewport
    await this.page.setViewportSize({ width: 1920, height: 1080 });
    await this.page.waitForTimeout(1000);
  }

  async testAccessibility() {
    await injectAxe(this.page);
    await checkA11y(this.page, null, {
      detailedReport: true,
      detailedReportOptions: { html: true }
    });
  }

  async testPerformance() {
    // Start performance monitoring
    await this.page.evaluate(() => {
      (window as any).performanceMarks = [];
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          (window as any).performanceMarks.push({
            name: entry.name,
            duration: entry.duration,
            startTime: entry.startTime
          });
        });
      });
      observer.observe({ entryTypes: ['measure', 'navigation'] });
    });
    
    // Navigate and measure
    await this.page.goto('/dashboard');
    await this.page.waitForLoadState('networkidle');
    
    // Get performance metrics
    const performanceMarks = await this.page.evaluate(() => {
      return (window as any).performanceMarks || [];
    });
    
    // Verify performance thresholds
    const navigationEntry = performanceMarks.find((mark: any) => mark.name === 'navigation');
    if (navigationEntry && navigationEntry.duration > 3000) {
      throw new Error(`Page load time too slow: ${navigationEntry.duration}ms`);
    }
  }

  async logout() {
    // Click user profile menu
    await this.page.click('[data-testid="user-profile"]');
    
    // Click logout button
    await this.page.click('[data-testid="logout-button"]');
    
    // Verify redirect to login page
    await this.page.waitForURL(/\/auth\/signin/);
    
    // Verify we're logged out
    await expect(this.page.locator('[data-testid="login-button"]')).toBeVisible();
  }
}

test.describe('Complete User Workflow', () => {
  let helper: WorkflowTestHelper;

  test.beforeEach(async ({ page }) => {
    helper = new WorkflowTestHelper(page);
    
    // Set up test data and mocks
    await page.route('**/api/transcripts', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: '1',
              clientName: 'Test Client',
              month: '2024-01',
              transcriptCount: 150,
              createdAt: new Date().toISOString()
            }
          ])
        });
      } else if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ success: true })
        });
      }
    });

    await page.route('**/api/analytics/trends', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          trends: [
            { month: '2024-01', count: 150 },
            { month: '2024-02', count: 175 },
            { month: '2024-03', count: 200 }
          ]
        })
      });
    });

    await page.route('**/api/analytics/predictions', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          predictions: [
            { month: '2024-04', predictedCount: 225, confidenceInterval: { lower: 200, upper: 250 } },
            { month: '2024-05', predictedCount: 250, confidenceInterval: { lower: 225, upper: 275 } }
          ],
          accuracy: 0.85
        })
      });
    });
  });

  test('Complete user workflow - Happy path', async () => {
    // 1. Authentication
    await test.step('User logs in', async () => {
      await helper.login();
    });

    // 2. Dashboard navigation
    await test.step('User navigates to dashboard', async () => {
      await helper.navigateToDashboard();
    });

    // 3. Data input
    await test.step('User adds transcript data', async () => {
      await helper.addTranscriptData('New Test Client', 100);
    });

    // 4. Analytics viewing
    await test.step('User views analytics', async () => {
      await helper.viewAnalytics();
    });

    // 5. Prediction generation
    await test.step('User generates predictions', async () => {
      await helper.generatePredictions();
    });

    // 6. Logout
    await test.step('User logs out', async () => {
      await helper.logout();
    });
  });

  test('Responsive design workflow', async () => {
    await helper.login();
    
    await test.step('Test responsive behavior', async () => {
      await helper.testResponsiveness();
    });
  });

  test('Accessibility compliance', async () => {
    await helper.login();
    await helper.navigateToDashboard();
    
    await test.step('Test accessibility on dashboard', async () => {
      await helper.testAccessibility();
    });

    await helper.viewAnalytics();
    
    await test.step('Test accessibility on analytics page', async () => {
      await helper.testAccessibility();
    });
  });

  test('Performance validation', async () => {
    await helper.login();
    
    await test.step('Test performance metrics', async () => {
      await helper.testPerformance();
    });
  });

  test('Error handling workflow', async ({ page }) => {
    // Test error scenarios
    await page.route('**/api/transcripts', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' })
      });
    });

    await helper.login();
    await helper.navigateToDashboard();

    // Verify error boundary catches API errors
    await expect(page.locator('[data-testid="error-boundary"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Something went wrong');
  });

  test('Offline functionality', async ({ page, context }) => {
    await helper.login();
    await helper.navigateToDashboard();

    // Simulate offline mode
    await context.setOffline(true);

    // Navigate to offline page
    await page.goto('/offline');
    
    // Verify offline page is displayed
    await expect(page.locator('[data-testid="offline-message"]')).toBeVisible();
    
    // Restore online mode
    await context.setOffline(false);
    
    // Verify reconnection
    await page.reload();
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();
  });

  test('Data synchronization workflow', async ({ page }) => {
    await helper.login();
    await helper.navigateToDashboard();

    // Add data
    await helper.addTranscriptData('Sync Test Client', 75);

    // Verify data appears in real-time
    await expect(page.locator('[data-testid="client-row-Sync Test Client"]')).toBeVisible();

    // Navigate away and back
    await helper.viewAnalytics();
    await helper.navigateToDashboard();

    // Verify data persistence
    await expect(page.locator('[data-testid="client-row-Sync Test Client"]')).toBeVisible();
  });

  test('Form validation workflow', async ({ page }) => {
    await helper.login();
    await helper.navigateToDashboard();

    // Click add data button
    await page.click('[data-testid="add-data-button"]');

    // Submit empty form
    await page.click('[data-testid="submit-button"]');

    // Verify validation errors
    await expect(page.locator('[data-testid="client-name-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="transcript-count-error"]')).toBeVisible();

    // Fill invalid data
    await page.fill('[data-testid="client-name-input"]', '');
    await page.fill('[data-testid="transcript-count-input"]', '-1');
    await page.click('[data-testid="submit-button"]');

    // Verify specific validation messages
    await expect(page.locator('[data-testid="client-name-error"]')).toContainText('Client name is required');
    await expect(page.locator('[data-testid="transcript-count-error"]')).toContainText('Count must be non-negative');
  });

  test('Animation and interaction workflow', async ({ page }) => {
    await helper.login();
    await helper.navigateToDashboard();

    // Test page transitions
    await page.click('[data-testid="analytics-nav-link"]');
    
    // Verify smooth transition animation
    await expect(page.locator('[data-testid="page-transition"]')).toBeVisible();
    await page.waitForTimeout(500); // Wait for animation
    
    // Test loading states
    await page.click('[data-testid="generate-predictions-button"]');
    await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible();
    
    // Test hover effects
    await page.hover('[data-testid="trend-chart"]');
    await expect(page.locator('[data-testid="chart-tooltip"]')).toBeVisible();
  });
});

test.describe('Cross-browser compatibility', () => {
  ['chromium', 'firefox', 'webkit'].forEach(browserName => {
    test(`Complete workflow in ${browserName}`, async ({ page }) => {
      const helper = new WorkflowTestHelper(page);
      
      await helper.login();
      await helper.navigateToDashboard();
      await helper.addTranscriptData('Cross Browser Test', 50);
      await helper.viewAnalytics();
      await helper.generatePredictions();
      await helper.logout();
    });
  });
});

test.describe('Performance benchmarks', () => {
  test('Page load performance', async ({ page }) => {
    const helper = new WorkflowTestHelper(page);
    
    // Measure login page load
    const loginStart = Date.now();
    await page.goto('/auth/signin');
    await page.waitForLoadState('networkidle');
    const loginTime = Date.now() - loginStart;
    
    expect(loginTime).toBeLessThan(3000); // Should load in under 3 seconds
    
    // Measure dashboard load after login
    await helper.login();
    const dashboardStart = Date.now();
    await helper.navigateToDashboard();
    const dashboardTime = Date.now() - dashboardStart;
    
    expect(dashboardTime).toBeLessThan(2000); // Should load in under 2 seconds
  });

  test('Chart rendering performance', async ({ page }) => {
    const helper = new WorkflowTestHelper(page);
    await helper.login();
    
    const chartStart = Date.now();
    await helper.viewAnalytics();
    await page.waitForSelector('[data-testid="trend-chart"] svg');
    const chartTime = Date.now() - chartStart;
    
    expect(chartTime).toBeLessThan(1500); // Charts should render in under 1.5 seconds
  });
});