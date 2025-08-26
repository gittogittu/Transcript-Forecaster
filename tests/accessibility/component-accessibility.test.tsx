/**
 * Comprehensive accessibility tests for all components
 */
import { render } from '@/lib/testing/utils/test-utils'
import { 
  testAccessibility, 
  testFormAccessibility, 
  testInteractiveAccessibility 
} from '@/lib/testing/utils/accessibility-helpers'
import { axe } from 'jest-axe'

// Import components to test
import { LoginButton } from '@/components/auth/login-button'
import { UserProfile } from '@/components/auth/user-profile'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { DashboardLayout } from '@/components/dashboard/dashboard-layout'
import { MetricsCards } from '@/components/dashboard/metrics-cards'
import { TranscriptForm } from '@/components/data/transcript-form'
import { TrendChart } from '@/components/analytics/trend-chart'
import { PredictionChart } from '@/components/analytics/prediction-chart'
import { LoadingSpinner } from '@/components/animations/loading-spinner'
import { PageTransition } from '@/components/animations/page-transition'

describe('Component Accessibility Tests', () => {
  describe('Authentication Components', () => {
    it('LoginButton should be accessible', async () => {
      const renderResult = render(<LoginButton />)
      await testInteractiveAccessibility(renderResult)
    })

    it('UserProfile should be accessible', async () => {
      const renderResult = render(<UserProfile />)
      await testAccessibility(renderResult.container)
    })

    it('ProtectedRoute should be accessible in loading state', async () => {
      const renderResult = render(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>,
        { session: null }
      )
      await testAccessibility(renderResult.container)
    })

    it('ProtectedRoute should be accessible with content', async () => {
      const renderResult = render(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      )
      await testAccessibility(renderResult.container)
    })
  })

  describe('Dashboard Components', () => {
    it('DashboardLayout should be accessible', async () => {
      const renderResult = render(
        <DashboardLayout>
          <div>Dashboard Content</div>
        </DashboardLayout>
      )
      await testAccessibility(renderResult.container)
    })

    it('MetricsCards should be accessible', async () => {
      const mockMetrics = {
        totalTranscripts: 1500,
        totalClients: 25,
        thisMonth: 180,
        growthRate: 12.5,
      }
      
      const renderResult = render(<MetricsCards metrics={mockMetrics} />)
      await testAccessibility(renderResult.container)
    })

    it('MetricsCards should have proper ARIA labels', async () => {
      const mockMetrics = {
        totalTranscripts: 1500,
        totalClients: 25,
        thisMonth: 180,
        growthRate: 12.5,
      }
      
      const renderResult = render(<MetricsCards metrics={mockMetrics} />)
      
      // Check for proper labeling
      expect(renderResult.getByLabelText(/total transcripts/i)).toBeInTheDocument()
      expect(renderResult.getByLabelText(/total clients/i)).toBeInTheDocument()
      expect(renderResult.getByLabelText(/this month/i)).toBeInTheDocument()
      expect(renderResult.getByLabelText(/growth rate/i)).toBeInTheDocument()
      
      await testAccessibility(renderResult.container)
    })
  })

  describe('Form Components', () => {
    it('TranscriptForm should be accessible', async () => {
      const renderResult = render(<TranscriptForm />)
      await testFormAccessibility(renderResult)
    })

    it('TranscriptForm should have proper form labels and descriptions', async () => {
      const renderResult = render(<TranscriptForm />)
      
      // Check for proper form labeling
      expect(renderResult.getByLabelText(/client name/i)).toBeInTheDocument()
      expect(renderResult.getByLabelText(/month/i)).toBeInTheDocument()
      expect(renderResult.getByLabelText(/transcript count/i)).toBeInTheDocument()
      
      // Check for descriptions
      expect(renderResult.getByText(/the name of the client/i)).toBeInTheDocument()
      expect(renderResult.getByText(/select the month/i)).toBeInTheDocument()
      expect(renderResult.getByText(/number of transcripts/i)).toBeInTheDocument()
      
      await testFormAccessibility(renderResult)
    })

    it('TranscriptForm should handle validation errors accessibly', async () => {
      const renderResult = render(<TranscriptForm />)
      
      // Trigger validation by submitting empty form
      const submitButton = renderResult.getByRole('button', { name: /add transcript/i })
      submitButton.click()
      
      // Wait for validation errors
      await renderResult.findByText(/client name is required/i)
      
      // Check that errors are properly associated with fields
      const clientNameInput = renderResult.getByLabelText(/client name/i)
      expect(clientNameInput).toHaveAttribute('aria-invalid', 'true')
      expect(clientNameInput).toHaveAttribute('aria-describedby')
      
      await testFormAccessibility(renderResult)
    })
  })

  describe('Chart Components', () => {
    it('TrendChart should be accessible', async () => {
      const mockData = [
        { month: '2024-01', clientName: 'Client A', count: 100 },
        { month: '2024-02', clientName: 'Client A', count: 120 },
        { month: '2024-03', clientName: 'Client A', count: 110 },
      ]
      
      const renderResult = render(<TrendChart data={mockData} />)
      await testAccessibility(renderResult.container)
    })

    it('TrendChart should have proper ARIA labels and descriptions', async () => {
      const mockData = [
        { month: '2024-01', clientName: 'Client A', count: 100 },
        { month: '2024-02', clientName: 'Client A', count: 120 },
      ]
      
      const renderResult = render(<TrendChart data={mockData} />)
      
      // Check for chart accessibility
      const chart = renderResult.getByRole('img', { name: /trend chart/i })
      expect(chart).toBeInTheDocument()
      expect(chart).toHaveAttribute('aria-label')
      
      await testAccessibility(renderResult.container)
    })

    it('PredictionChart should be accessible', async () => {
      const mockPredictions = [
        {
          month: '2024-04',
          predictedCount: 130,
          confidenceInterval: { lower: 120, upper: 140 },
        },
        {
          month: '2024-05',
          predictedCount: 135,
          confidenceInterval: { lower: 125, upper: 145 },
        },
      ]
      
      const renderResult = render(<PredictionChart predictions={mockPredictions} />)
      await testAccessibility(renderResult.container)
    })

    it('Charts should provide alternative text descriptions', async () => {
      const mockData = [
        { month: '2024-01', clientName: 'Client A', count: 100 },
        { month: '2024-02', clientName: 'Client A', count: 120 },
      ]
      
      const renderResult = render(<TrendChart data={mockData} />)
      
      // Check for text alternative or data table
      const textAlternative = renderResult.queryByText(/data shows/i) || 
                             renderResult.queryByRole('table')
      
      expect(textAlternative).toBeInTheDocument()
      
      await testAccessibility(renderResult.container)
    })
  })

  describe('Animation Components', () => {
    it('LoadingSpinner should be accessible', async () => {
      const renderResult = render(<LoadingSpinner />)
      
      // Check for proper loading indicator
      const spinner = renderResult.getByRole('status')
      expect(spinner).toHaveAttribute('aria-label', 'Loading')
      
      await testAccessibility(renderResult.container)
    })

    it('LoadingSpinner should respect prefers-reduced-motion', async () => {
      // Mock reduced motion preference
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      })
      
      const renderResult = render(<LoadingSpinner />)
      await testAccessibility(renderResult.container)
    })

    it('PageTransition should be accessible', async () => {
      const renderResult = render(
        <PageTransition>
          <div>Page Content</div>
        </PageTransition>
      )
      await testAccessibility(renderResult.container)
    })

    it('PageTransition should not interfere with screen readers', async () => {
      const renderResult = render(
        <PageTransition>
          <h1>Page Title</h1>
          <p>Page content</p>
        </PageTransition>
      )
      
      // Content should still be accessible
      expect(renderResult.getByRole('heading', { name: /page title/i })).toBeInTheDocument()
      expect(renderResult.getByText(/page content/i)).toBeInTheDocument()
      
      await testAccessibility(renderResult.container)
    })
  })

  describe('Color Contrast and Visual Accessibility', () => {
    it('should meet WCAG color contrast requirements', async () => {
      const renderResult = render(
        <div>
          <button className="bg-primary text-primary-foreground">Primary Button</button>
          <button className="bg-secondary text-secondary-foreground">Secondary Button</button>
          <div className="text-muted-foreground">Muted text</div>
          <div className="text-destructive">Error text</div>
        </div>
      )
      
      const results = await axe(renderResult.container, {
        rules: {
          'color-contrast': { enabled: true },
        },
      })
      
      expect(results).toHaveNoViolations()
    })

    it('should not rely solely on color for information', async () => {
      const renderResult = render(
        <div>
          <div className="text-green-600">✓ Success message</div>
          <div className="text-red-600">✗ Error message</div>
          <div className="text-yellow-600">⚠ Warning message</div>
        </div>
      )
      
      // Check that icons or text provide additional context beyond color
      expect(renderResult.getByText(/✓/)).toBeInTheDocument()
      expect(renderResult.getByText(/✗/)).toBeInTheDocument()
      expect(renderResult.getByText(/⚠/)).toBeInTheDocument()
      
      await testAccessibility(renderResult.container)
    })
  })

  describe('Keyboard Navigation', () => {
    it('should support keyboard navigation for interactive elements', async () => {
      const renderResult = render(
        <div>
          <button>Button 1</button>
          <button>Button 2</button>
          <input type="text" placeholder="Text input" />
          <select>
            <option>Option 1</option>
            <option>Option 2</option>
          </select>
        </div>
      )
      
      const results = await axe(renderResult.container, {
        rules: {
          'keyboard': { enabled: true },
          'focus-order-semantics': { enabled: true },
        },
      })
      
      expect(results).toHaveNoViolations()
    })

    it('should have visible focus indicators', async () => {
      const renderResult = render(
        <div>
          <button className="focus:ring-2 focus:ring-primary">Focusable Button</button>
          <input className="focus:ring-2 focus:ring-primary" type="text" />
        </div>
      )
      
      const results = await axe(renderResult.container, {
        rules: {
          'focus-order-semantics': { enabled: true },
        },
      })
      
      expect(results).toHaveNoViolations()
    })
  })

  describe('Screen Reader Support', () => {
    it('should provide proper heading hierarchy', async () => {
      const renderResult = render(
        <div>
          <h1>Main Title</h1>
          <h2>Section Title</h2>
          <h3>Subsection Title</h3>
          <p>Content</p>
        </div>
      )
      
      const results = await axe(renderResult.container, {
        rules: {
          'heading-order': { enabled: true },
        },
      })
      
      expect(results).toHaveNoViolations()
    })

    it('should use semantic HTML elements', async () => {
      const renderResult = render(
        <div>
          <nav>
            <ul>
              <li><a href="/dashboard">Dashboard</a></li>
              <li><a href="/analytics">Analytics</a></li>
            </ul>
          </nav>
          <main>
            <article>
              <header>
                <h1>Article Title</h1>
              </header>
              <section>
                <h2>Section Title</h2>
                <p>Content</p>
              </section>
            </article>
          </main>
        </div>
      )
      
      // Check for semantic elements
      expect(renderResult.getByRole('navigation')).toBeInTheDocument()
      expect(renderResult.getByRole('main')).toBeInTheDocument()
      expect(renderResult.getByRole('article')).toBeInTheDocument()
      
      await testAccessibility(renderResult.container)
    })

    it('should provide proper ARIA landmarks', async () => {
      const renderResult = render(
        <div>
          <header role="banner">Site Header</header>
          <nav role="navigation">Navigation</nav>
          <main role="main">Main Content</main>
          <aside role="complementary">Sidebar</aside>
          <footer role="contentinfo">Footer</footer>
        </div>
      )
      
      const results = await axe(renderResult.container, {
        rules: {
          'landmark-one-main': { enabled: true },
          'landmark-complementary-is-top-level': { enabled: true },
        },
      })
      
      expect(results).toHaveNoViolations()
    })
  })
})