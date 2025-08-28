import { 
  getUserByEmail, 
  getUserById, 
  createUser, 
  updateUser, 
  getAllUsers, 
  deleteUser,
  hasRole,
  canAccessResource
} from '../users'
import { getPool } from '../connection'

// Mock the database connection
jest.mock('../connection', () => ({
  getPool: jest.fn()
}))

const mockPool = {
  query: jest.fn()
}

beforeEach(() => {
  jest.clearAllMocks()
  ;(getPool as jest.Mock).mockReturnValue(mockPool)
})

describe('User Database Functions', () => {
  describe('getUserByEmail', () => {
    it('should return user when found', async () => {
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        name: 'Test User',
        image: null,
        role: 'viewer',
        created_at: new Date(),
        updated_at: new Date(),
        last_login: null
      }

      mockPool.query.mockResolvedValue({ rows: [mockUser] })

      const result = await getUserByEmail('test@example.com')

      expect(result).toEqual({
        id: '123',
        email: 'test@example.com',
        name: 'Test User',
        image: null,
        role: 'viewer',
        createdAt: mockUser.created_at,
        updatedAt: mockUser.updated_at,
        lastLogin: null
      })
      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT id, email, name, image, role, created_at, updated_at, last_login FROM users WHERE email = $1',
        ['test@example.com']
      )
    })

    it('should return null when user not found', async () => {
      mockPool.query.mockResolvedValue({ rows: [] })

      const result = await getUserByEmail('nonexistent@example.com')

      expect(result).toBeNull()
    })

    it('should throw error on database failure', async () => {
      mockPool.query.mockRejectedValue(new Error('Database error'))

      await expect(getUserByEmail('test@example.com')).rejects.toThrow('Failed to fetch user')
    })
  })

  describe('createUser', () => {
    it('should create user with default viewer role', async () => {
      const mockUser = {
        id: '123',
        email: 'new@example.com',
        name: 'New User',
        image: null,
        role: 'viewer',
        created_at: new Date(),
        updated_at: new Date(),
        last_login: null
      }

      mockPool.query.mockResolvedValue({ rows: [mockUser] })

      const userData = {
        email: 'new@example.com',
        name: 'New User'
      }

      const result = await createUser(userData)

      expect(result.role).toBe('viewer')
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        ['new@example.com', 'New User', undefined, 'viewer']
      )
    })

    it('should create user with specified role', async () => {
      const mockUser = {
        id: '123',
        email: 'admin@example.com',
        name: 'Admin User',
        image: null,
        role: 'admin',
        created_at: new Date(),
        updated_at: new Date(),
        last_login: null
      }

      mockPool.query.mockResolvedValue({ rows: [mockUser] })

      const userData = {
        email: 'admin@example.com',
        name: 'Admin User',
        role: 'admin' as const
      }

      const result = await createUser(userData)

      expect(result.role).toBe('admin')
    })
  })

  describe('updateUser', () => {
    it('should update user role', async () => {
      const mockUser = {
        id: '123',
        email: 'user@example.com',
        name: 'User',
        image: null,
        role: 'analyst',
        created_at: new Date(),
        updated_at: new Date(),
        last_login: null
      }

      mockPool.query.mockResolvedValue({ rows: [mockUser] })

      const result = await updateUser('123', { role: 'analyst' })

      expect(result?.role).toBe('analyst')
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users SET role = $1'),
        ['analyst', '123']
      )
    })

    it('should return null when user not found', async () => {
      mockPool.query.mockResolvedValue({ rows: [] })

      const result = await updateUser('nonexistent', { role: 'admin' })

      expect(result).toBeNull()
    })
  })
})

describe('Role Validation Functions', () => {
  describe('hasRole', () => {
    it('should return true for exact role match', () => {
      expect(hasRole('admin', 'admin')).toBe(true)
      expect(hasRole('analyst', 'analyst')).toBe(true)
      expect(hasRole('viewer', 'viewer')).toBe(true)
    })

    it('should return true for higher role', () => {
      expect(hasRole('admin', 'analyst')).toBe(true)
      expect(hasRole('admin', 'viewer')).toBe(true)
      expect(hasRole('analyst', 'viewer')).toBe(true)
    })

    it('should return false for lower role', () => {
      expect(hasRole('viewer', 'analyst')).toBe(false)
      expect(hasRole('viewer', 'admin')).toBe(false)
      expect(hasRole('analyst', 'admin')).toBe(false)
    })
  })

  describe('canAccessResource', () => {
    it('should allow viewer to read', () => {
      expect(canAccessResource('viewer', 'read')).toBe(true)
    })

    it('should not allow viewer to write', () => {
      expect(canAccessResource('viewer', 'write')).toBe(false)
    })

    it('should allow analyst to read and write', () => {
      expect(canAccessResource('analyst', 'read')).toBe(true)
      expect(canAccessResource('analyst', 'write')).toBe(true)
      expect(canAccessResource('analyst', 'analyze')).toBe(true)
    })

    it('should not allow analyst admin access', () => {
      expect(canAccessResource('analyst', 'admin')).toBe(false)
    })

    it('should allow admin all access', () => {
      expect(canAccessResource('admin', 'read')).toBe(true)
      expect(canAccessResource('admin', 'write')).toBe(true)
      expect(canAccessResource('admin', 'analyze')).toBe(true)
      expect(canAccessResource('admin', 'admin')).toBe(true)
      expect(canAccessResource('admin', 'delete')).toBe(true)
    })
  })
})