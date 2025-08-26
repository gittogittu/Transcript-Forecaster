import '@testing-library/jest-dom'
import 'jest-axe/extend-expect'
import { server } from './src/lib/testing/mocks/server'

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

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...props} />
  },
}))

// Mock TensorFlow.js (now dynamically imported)
jest.mock('@tensorflow/tfjs', () => ({
  setBackend: jest.fn().mockResolvedValue(undefined),
  ready: jest.fn().mockResolvedValue(undefined),
  getBackend: jest.fn().mockReturnValue('cpu'),
  sequential: jest.fn().mockReturnValue({
    add: jest.fn(),
    compile: jest.fn(),
    fit: jest.fn().mockResolvedValue({ history: {} }),
    predict: jest.fn().mockReturnValue({
      data: jest.fn().mockResolvedValue([0.5]),
      dispose: jest.fn(),
    }),
    dispose: jest.fn(),
  }),
  layers: {
    dense: jest.fn().mockReturnValue({}),
    dropout: jest.fn().mockReturnValue({}),
  },
  train: {
    adam: jest.fn().mockReturnValue({}),
  },
  regularizers: {
    l2: jest.fn().mockReturnValue({}),
  },
  tensor2d: jest.fn().mockReturnValue({
    data: jest.fn().mockResolvedValue([]),
    dispose: jest.fn(),
    shape: [0, 0],
  }),
  tensor1d: jest.fn().mockReturnValue({
    data: jest.fn().mockResolvedValue([]),
    dispose: jest.fn(),
  }),
}))

// Mock Framer Motion
jest.mock('framer-motion', () => ({
  motion: {
    div: 'div',
    button: 'button',
    form: 'form',
    span: 'span',
  },
  AnimatePresence: ({ children }) => children,
}))

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