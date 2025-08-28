import { Pool } from 'pg'
import { getDatabasePool } from './connection'
import { UserRole } from '../auth'

export interface User {
  id: string
  email: string
  name: string
  image?: string
  role: UserRole
  createdAt: Date
  updatedAt: Date
  lastLogin?: Date
}

export interface CreateUserData {
  email: string
  name: string
  image?: string
  role?: UserRole
}

export interface UpdateUserData {
  name?: string
  image?: string
  role?: UserRole
}

/**
 * Get user by email
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  const pool = getDatabasePool()
  
  try {
    const result = await pool.query(
      'SELECT id, email, name, image, role, created_at, updated_at, last_login FROM users WHERE email = $1',
      [email]
    )
    
    if (result.rows.length === 0) {
      return null
    }
    
    const row = result.rows[0]
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      image: row.image,
      role: row.role as UserRole,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastLogin: row.last_login,
    }
  } catch (error) {
    console.error('Error fetching user by email:', error)
    throw new Error('Failed to fetch user')
  }
}

/**
 * Get user by ID
 */
export async function getUserById(id: string): Promise<User | null> {
  const pool = getDatabasePool()
  
  try {
    const result = await pool.query(
      'SELECT id, email, name, image, role, created_at, updated_at, last_login FROM users WHERE id = $1',
      [id]
    )
    
    if (result.rows.length === 0) {
      return null
    }
    
    const row = result.rows[0]
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      image: row.image,
      role: row.role as UserRole,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastLogin: row.last_login,
    }
  } catch (error) {
    console.error('Error fetching user by ID:', error)
    throw new Error('Failed to fetch user')
  }
}

/**
 * Create a new user
 */
export async function createUser(userData: CreateUserData): Promise<User> {
  const pool = getDatabasePool()
  
  try {
    const result = await pool.query(
      `INSERT INTO users (email, name, image, role) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, email, name, image, role, created_at, updated_at, last_login`,
      [userData.email, userData.name, userData.image, userData.role || 'viewer']
    )
    
    const row = result.rows[0]
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      image: row.image,
      role: row.role as UserRole,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastLogin: row.last_login,
    }
  } catch (error) {
    console.error('Error creating user:', error)
    throw new Error('Failed to create user')
  }
}

/**
 * Update user data
 */
export async function updateUser(id: string, userData: UpdateUserData): Promise<User | null> {
  const pool = getDatabasePool()
  
  try {
    const setParts: string[] = []
    const values: any[] = []
    let paramIndex = 1
    
    if (userData.name !== undefined) {
      setParts.push(`name = $${paramIndex}`)
      values.push(userData.name)
      paramIndex++
    }
    
    if (userData.image !== undefined) {
      setParts.push(`image = $${paramIndex}`)
      values.push(userData.image)
      paramIndex++
    }
    
    if (userData.role !== undefined) {
      setParts.push(`role = $${paramIndex}`)
      values.push(userData.role)
      paramIndex++
    }
    
    if (setParts.length === 0) {
      return getUserById(id)
    }
    
    values.push(id)
    
    const result = await pool.query(
      `UPDATE users SET ${setParts.join(', ')} 
       WHERE id = $${paramIndex} 
       RETURNING id, email, name, image, role, created_at, updated_at, last_login`,
      values
    )
    
    if (result.rows.length === 0) {
      return null
    }
    
    const row = result.rows[0]
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      image: row.image,
      role: row.role as UserRole,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastLogin: row.last_login,
    }
  } catch (error) {
    console.error('Error updating user:', error)
    throw new Error('Failed to update user')
  }
}

/**
 * Update user's last login timestamp
 */
export async function updateUserLastLogin(id: string): Promise<void> {
  const pool = getDatabasePool()
  
  try {
    await pool.query(
      'UPDATE users SET last_login = NOW() WHERE id = $1',
      [id]
    )
  } catch (error) {
    console.error('Error updating user last login:', error)
    // Don't throw error for last login update failures
  }
}

/**
 * Get all users (admin only)
 */
export async function getAllUsers(): Promise<User[]> {
  const pool = getDatabasePool()
  
  try {
    const result = await pool.query(
      'SELECT id, email, name, image, role, created_at, updated_at, last_login FROM users ORDER BY created_at DESC'
    )
    
    return result.rows.map(row => ({
      id: row.id,
      email: row.email,
      name: row.name,
      image: row.image,
      role: row.role as UserRole,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastLogin: row.last_login,
    }))
  } catch (error) {
    console.error('Error fetching all users:', error)
    throw new Error('Failed to fetch users')
  }
}

/**
 * Delete user (admin only)
 */
export async function deleteUser(id: string): Promise<boolean> {
  const pool = getDatabasePool()
  
  try {
    const result = await pool.query('DELETE FROM users WHERE id = $1', [id])
    return result.rowCount > 0
  } catch (error) {
    console.error('Error deleting user:', error)
    throw new Error('Failed to delete user')
  }
}

/**
 * Check if user has required role or higher
 */
export function hasRole(userRole: UserRole, requiredRole: UserRole): boolean {
  const roleHierarchy: Record<UserRole, number> = {
    viewer: 1,
    analyst: 2,
    admin: 3,
  }
  
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole]
}

/**
 * Check if user can access resource based on role
 */
export function canAccessResource(userRole: UserRole, resource: string): boolean {
  const permissions: Record<UserRole, string[]> = {
    viewer: ['read'],
    analyst: ['read', 'write', 'analyze'],
    admin: ['read', 'write', 'analyze', 'admin', 'delete'],
  }
  
  return permissions[userRole]?.includes(resource) || false
}