/**
 * Comprehensive test configuration and utilities
 */

// Test environment configuration
export const TEST_CONFIG = {
  // Performance thresholds
  performance: {
    dataLoading: {
      maxTime: 1000, // 1 second
      maxMemory: 50 * 1024 * 1024, // 50MB
    },
    predictionTraining: {
      small: { maxTime: 200, maxMemory: 20 * 1024 * 1024 },
      medium: { maxTime: 1000, maxMemory: 50 * 1024 * 1024 },
      large: { maxTime: 3000, maxMemory: 100 * 1024 * 1024 },
    },
    predictionGeneration: {
      maxTime: 100, // 100ms
      maxMemory: 10 * 1024 * 1024, // 10MB
    },
  },
  
  // Accessibility configuration
  accessibility: {
    rules: {
      // Core accessibility rules
      'color-contrast': { enabled: true },
      'keyboard': { enabled: true },
      'focus-order-semantics': { enabled: true },
      'heading-order': { enabled: true },
      'landmark-one-main': { enabled: true },
      'label': { enabled: true },
      'button-name': { enabled: true },
      'link-name': { enabled: true },
      'aria-roles': { enabled: true },
      
      // Form-specific rules
      'label-title-only': { enabled: true },
      'form-field-multiple-labels': { enabled: true },
      
      // Interactive element rules
      'interactive-supports-focus': { enabled: true },
      'click-events-have-key-events': { enabled: true },
    },
    
    // Custom rules for specific components
    formRules: {
      'label': { enabled: true },
      'color-contrast': { enabled: true },
      'keyboard-navigation': { enabled: true },
    },
    
    interactiveRules: {
      'button-name': { enabled: true },
      'link-name': { enabled: true },
      'aria-roles': { enabled: true },
      'keyboard-navigation': { enabled: true },
    },
  },
  
  // API mocking configuration
  api: {
    baseUrl: 'http://localhost:3000',
    timeout: 5000,
    retries: 3,
  },
  
  // Test data configuration
  testData: {
    defaultUser: {
      id: '1',
      name: 'Test User',
      email: 'test@example.com',
      image: null,
    },
    
    sampleTranscripts: [
      {
        id: '1',
        clientName: 'Client A',
        month: '2024-01',
        transcriptCount: 150,
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-01-15'),
      },
      {
        id: '2',
        clientName: 'Client B',
        month: '2024-01',
        transcriptCount: 200,
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-01-15'),
      },
    ],
    
    samplePredictions: [
      {
        clientName: 'Client A',
        month: '2024-02',
        predictedCount: 160,
        confidenceInterval: { lower: 140, upper: 180 },
      },
      {
        clientName: 'Client B',
        month: '2024-02',
        predictedCount: 210,
        confidenceInterval: { lower: 190, upper: 230 },
      },
    ],
  },
  
  // Browser configuration for E2E tests
  browsers: {
    chromium: {
      viewport: { width: 1280, height: 720 },
      userAgent: 'Test Chromium Browser',
    },
    firefox: {
      viewport: { width: 1280, height: 720 },
      userAgent: 'Test Firefox Browser',
    },
    webkit: {
      viewport: { width: 1280, height: 720 },
      userAgent: 'Test WebKit Browser',
    },
    mobile: {
      viewport: { width: 375, height: 667 },
      userAgent: 'Test Mobile Browser',
    },
  },
}

// Test utilities
export const TEST_UTILS = {
  // Wait utilities
  wait: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Random data generators
  randomString: (length: number = 10) => 
    Math.random().toString(36).substring(2, length + 2),
  
  randomNumber: (min: number = 0, max: number = 1000) => 
    Math.floor(Math.random() * (max - min + 1)) + min,
  
  randomDate: (start: Date = new Date(2020, 0, 1), end: Date = new Date()) => 
    new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime())),
  
  // Mock data generators
  generateMockTranscript: (overrides: any = {}) => ({
    id: TEST_UTILS.randomString(),
    clientName: `Client ${TEST_UTILS.randomString(5)}`,
    month: '2024-01',
    transcriptCount: TEST_UTILS.randomNumber(50, 500),
    createdAt: TEST_UTILS.randomDate(),
    updatedAt: TEST_UTILS.randomDate(),
    ...overrides,
  }),
  
  generateMockUser: (overrides: any = {}) => ({
    id: TEST_UTILS.randomString(),
    name: `Test User ${TEST_UTILS.randomString(5)}`,
    email: `test${TEST_UTILS.randomString(5)}@example.com`,
    image: null,
    ...overrides,
  }),
}

// Test assertions
export const TEST_ASSERTIONS = {
  // Performance assertions
  assertPerformance: (metrics: any, thresholds: any) => {
    expect(metrics.executionTime).toBeLessThanOrEqual(thresholds.maxTime)
    if (thresholds.maxMemory) {
      expect(metrics.memoryUsage).toBeLessThanOrEqual(thresholds.maxMemory)
    }
  },
  
  // Accessibility assertions
  assertAccessibility: async (container: HTMLElement, rules?: any) => {
    const { axe } = await import('jest-axe')
    const results = await axe(container, { rules })
    expect(results).toHaveNoViolations()
  },
  
  // API response assertions
  assertApiResponse: (response: any, expectedShape: any) => {
    expect(response).toMatchObject(expectedShape)
    expect(response.success).toBe(true)
    expect(response.data).toBeDefined()
  },
  
  // Form validation assertions
  assertFormValidation: (container: HTMLElement, fieldName: string, errorMessage: string) => {
    const field = container.querySelector(`[name="${fieldName}"]`)
    expect(field).toHaveAttribute('aria-invalid', 'true')
    expect(container).toHaveTextContent(errorMessage)
  },
}

// Test environment setup
export const setupTestEnvironment = () => {
  // Mock window.matchMedia for responsive tests
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  })

  // Mock IntersectionObserver
  global.IntersectionObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }))

  // Mock ResizeObserver
  global.ResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }))

  // Mock performance.now for consistent timing
  const mockPerformanceNow = jest.fn(() => Date.now())
  Object.defineProperty(global.performance, 'now', {
    writable: true,
    value: mockPerformanceNow,
  })
}

// Export everything
export default {
  TEST_CONFIG,
  TEST_UTILS,
  TEST_ASSERTIONS,
  setupTestEnvironment,
}