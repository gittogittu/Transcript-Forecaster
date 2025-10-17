import '@testing-library/jest-dom'
import 'jest-axe/extend-expect'
import { server } from './src/lib/testing/mocks/server'

// Polyfills for Node.js environment
const { TextEncoder, TextDecoder } = require('util')
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// Establish API mocking before all tests
beforeAll(() => server.listen())

// Reset any request handlers that we may add during the tests,
// so they don't affect other tests
afterEach(() => server.resetHandlers())

// Clean up after the tests are finished
afterAll(() => server.close())

// Mock next-auth
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
  signIn: jest.fn(),
  signOut: jest.fn(),
  SessionProvider: ({ children }) => children,
}))

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
  useSearchParams: jest.fn(),
}))

// Mock Next.js server components
jest.mock('next/server', () => ({
  NextRequest: jest.fn().mockImplementation((url) => ({
    url,
    nextUrl: new URL(url),
    method: 'GET',
    headers: new Map(),
  })),
  NextResponse: {
    json: jest.fn().mockImplementation((data, init) => {
      const headers = new Map()
      return {
        json: () => Promise.resolve(data),
        status: init?.status || 200,
        headers: {
          set: (key, value) => headers.set(key, value),
          get: (key) => headers.get(key),
          has: (key) => headers.has(key),
        },
        ...init,
      }
    }),
    redirect: jest.fn().mockImplementation((url) => ({
      url,
      status: 302,
      headers: {
        set: () => {},
        get: () => undefined,
        has: () => false,
      }
    })),
    next: jest.fn().mockReturnValue({
      status: 200,
      headers: {
        set: () => {},
        get: () => undefined,
        has: () => false,
      }
    }),
  },
}))

// Mock next-auth/jwt
jest.mock('next-auth/jwt', () => ({
  getToken: jest.fn(),
}))

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...props} />
  },
}))

// Mock Google Generative AI for tests
jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: jest.fn().mockResolvedValue({
        response: {
          text: jest.fn().mockReturnValue('[]')
        }
      })
    })
  }))
}));

// Provide minimal env for tests that import Vertex AI config
process.env.GOOGLE_CLOUD_PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT_ID || 'test-project'
process.env.GOOGLE_CLOUD_LOCATION = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1'

const React = require('react')

// Mock Framer Motion
jest.mock('framer-motion', () => {
  const stripMotionProps = (props = {}) => {
    const {
      drag,
      dragMomentum,
      dragElastic,
      whileHover,
      initial,
      animate,
      exit,
      transition,
      layout,
      ...rest
    } = props
    return rest
  }
  const MotionProxy = React.forwardRef((props, ref) => React.createElement('div', { ...stripMotionProps(props), ref, 'data-motion': true }))
  MotionProxy.displayName = 'motion.div'
  return {
    motion: {
      div: MotionProxy,
      button: MotionProxy,
      form: MotionProxy,
      span: MotionProxy,
    },
    AnimatePresence: ({ children }) => children,
  }
})

// Mock Recharts
jest.mock('recharts', () => ({
  LineChart: 'div',
  Line: 'div',
  XAxis: 'div',
  YAxis: 'div',
  CartesianGrid: 'div',
  Tooltip: 'div',
  Legend: 'div',
  ResponsiveContainer: ({ children }) => children,
}))

// Mock @google-cloud/vertexai to avoid module resolution during tests
jest.mock('@google-cloud/vertexai', () => ({
  VertexAI: jest.fn(),
}), { virtual: true })

// Mock sonner
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
  },
  Toaster: () => null,
}))