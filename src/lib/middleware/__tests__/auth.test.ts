import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { 
  withAuth, 
  protectRoute, 
  adminOnly, 
  analystOrAdmin, 
  authenticated,
  getCurrentUser,
  hasPermission
} from '../auth'

// Mock next-auth/jwt
jest.mock('next-auth/jwt', () => ({
  getToken: jest.fn()
}))

// Mock database functions
jest.mock('../../database/users', () => ({
  hasRole: jest.fn((userRole, requiredRole) => {
    const roleHierarchy = { viewer: 1, analyst: 2, admin: 3 }
    return roleHierarchy[userRole] >= roleHierarchy[requiredRole]
  })
}))

const mockGetToken = getToken as jest.Mock

describe('Auth Middleware', () => {
  let mockRequest: NextRequest

  beforeEach(() => {
    jest.clearAllMocks()
    mockRequest = new NextRequest('http://localhost:3000/api/test')
  })

  describe('withAuth', () => {
    it('should return 401 when no token and auth required', async () => {
      mockGetToken.mockResolvedValue(null)

      const result = await withAuth(mockRequest, { requireAuth: true })

      expect(result).toBeTruthy()
      expect(result?.status).toBe(401)
    })

    it('should return null when no token and auth not required', async () => {
      mockGetToken.mockResolvedValue(null)

      const result = await withAuth(mockRequest, { requireAuth: false })

      expect(result).toBeNull()
    })

    it('should return 403 when user lacks required role', async () => {
      mockGetToken.mockResolvedValue({
        role: 'viewer',
        userId: '123'
      })

      const result = await withAuth(mockRequest, { requiredRole: 'admin' })

      expect(result).toBeTruthy()
      expect(result?.status).toBe(403)
    })

    it('should return null when user has required role', async () => {
      mockGetToken.mockResolvedValue({
        role: 'admin',
        userId: '123'
      })

      const result = await withAuth(mockRequest, { requiredRole: 'admin' })

      expect(result).toBeNull()
    })

    it('should return 403 when user role not in allowed roles', async () => {
      mockGetToken.mockResolvedValue({
        role: 'viewer',
        userId: '123'
      })

      const result = await withAuth(mockRequest, { allowedRoles: ['analyst', 'admin'] })

      expect(result).toBeTruthy()
      expect(result?.status).toBe(403)
    })

    it('should return null when user role is in allowed roles', async () => {
      mockGetToken.mockResolvedValue({
        role: 'analyst',
        userId: '123'
      })

      const result = await withAuth(mockRequest, { allowedRoles: ['analyst', 'admin'] })

      expect(result).toBeNull()
    })

    it('should return 500 on authentication error', async () => {
      mockGetToken.mockRejectedValue(new Error('Token error'))

      const result = await withAuth(mockRequest)

      expect(result).toBeTruthy()
      expect(result?.status).toBe(500)
    })
  })

  describe('protectRoute', () => {
    const mockHandler = jest.fn().mockResolvedValue({
      json: () => Promise.resolve({ success: true }),
      status: 200
    })

    beforeEach(() => {
      mockHandler.mockClear()
    })

    it('should call handler when auth passes', async () => {
      mockGetToken.mockResolvedValue({
        role: 'admin',
        userId: '123'
      })

      const protectedHandler = protectRoute(mockHandler, { requiredRole: 'admin' })
      const result = await protectedHandler(mockRequest)

      expect(mockHandler).toHaveBeenCalledWith(mockRequest, undefined)
      expect(result).toEqual(expect.objectContaining({ status: 200 }))
    })

    it('should not call handler when auth fails', async () => {
      mockGetToken.mockResolvedValue({
        role: 'viewer',
        userId: '123'
      })

      const protectedHandler = protectRoute(mockHandler, { requiredRole: 'admin' })
      const result = await protectedHandler(mockRequest)

      expect(mockHandler).not.toHaveBeenCalled()
      expect(result?.status).toBe(403)
    })
  })

  describe('adminOnly', () => {
    const mockHandler = jest.fn().mockResolvedValue(
      NextResponse.json({ success: true })
    )

    it('should allow admin access', async () => {
      mockGetToken.mockResolvedValue({
        role: 'admin',
        userId: '123'
      })

      const adminHandler = adminOnly(mockHandler)
      await adminHandler(mockRequest)

      expect(mockHandler).toHaveBeenCalled()
    })

    it('should deny non-admin access', async () => {
      mockGetToken.mockResolvedValue({
        role: 'analyst',
        userId: '123'
      })

      const adminHandler = adminOnly(mockHandler)
      const result = await adminHandler(mockRequest)

      expect(mockHandler).not.toHaveBeenCalled()
      expect(result?.status).toBe(403)
    })
  })

  describe('analystOrAdmin', () => {
    const mockHandler = jest.fn().mockResolvedValue(
      NextResponse.json({ success: true })
    )

    it('should allow analyst access', async () => {
      mockGetToken.mockResolvedValue({
        role: 'analyst',
        userId: '123'
      })

      const analystHandler = analystOrAdmin(mockHandler)
      await analystHandler(mockRequest)

      expect(mockHandler).toHaveBeenCalled()
    })

    it('should allow admin access', async () => {
      mockGetToken.mockResolvedValue({
        role: 'admin',
        userId: '123'
      })

      const analystHandler = analystOrAdmin(mockHandler)
      await analystHandler(mockRequest)

      expect(mockHandler).toHaveBeenCalled()
    })

    it('should deny viewer access', async () => {
      mockGetToken.mockResolvedValue({
        role: 'viewer',
        userId: '123'
      })

      const analystHandler = analystOrAdmin(mockHandler)
      const result = await analystHandler(mockRequest)

      expect(mockHandler).not.toHaveBeenCalled()
      expect(result?.status).toBe(403)
    })
  })

  describe('getCurrentUser', () => {
    it('should return user token', async () => {
      const mockToken = {
        role: 'admin',
        userId: '123',
        email: 'admin@example.com'
      }
      mockGetToken.mockResolvedValue(mockToken)

      const result = await getCurrentUser(mockRequest)

      expect(result).toEqual(mockToken)
    })

    it('should return null on error', async () => {
      mockGetToken.mockRejectedValue(new Error('Token error'))

      const result = await getCurrentUser(mockRequest)

      expect(result).toBeNull()
    })
  })

  describe('hasPermission', () => {
    it('should return true when user has required role', async () => {
      mockGetToken.mockResolvedValue({
        role: 'admin',
        userId: '123'
      })

      const result = await hasPermission(mockRequest, 'analyst')

      expect(result).toBe(true)
    })

    it('should return false when user lacks required role', async () => {
      mockGetToken.mockResolvedValue({
        role: 'viewer',
        userId: '123'
      })

      const result = await hasPermission(mockRequest, 'admin')

      expect(result).toBe(false)
    })

    it('should return false when no user', async () => {
      mockGetToken.mockResolvedValue(null)

      const result = await hasPermission(mockRequest, 'viewer')

      expect(result).toBe(false)
    })
  })
})