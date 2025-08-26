/**
 * Custom error types for the Transcript Analytics Platform
 */

import { AppError } from '@/types/transcript'

export class AuthenticationError extends Error implements AppError {
  name = 'AuthenticationError' as const
  code = 'AUTH_ERROR' as const
  timestamp = new Date()
  context?: Record<string, unknown>

  constructor(message: string) {
    super(message)
  }
}

export class ValidationError extends Error implements AppError {
  name = 'ValidationError' as const
  code = 'VALIDATION_ERROR' as const
  timestamp = new Date()
  context?: Record<string, unknown>

  constructor(message: string, public field: string, public value: any) {
    super(message)
  }
}

export class APIError extends Error implements AppError {
  name = 'APIError' as const
  code = 'API_ERROR' as const
  timestamp = new Date()
  context?: Record<string, unknown>

  constructor(message: string, public status: number, public endpoint: string) {
    super(message)
  }
}

export class PredictionError extends Error implements AppError {
  name = 'PredictionError' as const
  code = 'PREDICTION_ERROR' as const
  timestamp = new Date()
  context?: Record<string, unknown>

  constructor(message: string, public modelType: string, public dataSize: number) {
    super(message)
  }
}

export class GoogleSheetsError extends Error implements AppError {
  name = 'GoogleSheetsError' as const
  code = 'SHEETS_ERROR' as const
  timestamp = new Date()
  context?: Record<string, unknown>

  constructor(message: string, public operation: string, public sheetId?: string) {
    super(message)
  }
}

export class NetworkError extends Error implements AppError {
  name = 'NetworkError' as const
  code = 'NETWORK_ERROR' as const
  timestamp = new Date()
  context?: Record<string, unknown>

  constructor(message: string, public url: string, public status?: number) {
    super(message)
  }
}

export type AppErrorType = 
  | AuthenticationError 
  | ValidationError 
  | APIError 
  | PredictionError 
  | GoogleSheetsError 
  | NetworkError
  | Error

export interface ErrorInfo {
  componentStack: string
  errorBoundary?: string
}

export interface ErrorLogEntry {
  id: string
  timestamp: Date
  error: AppErrorType
  errorInfo?: ErrorInfo
  userId?: string
  userAgent: string
  url: string
  additionalContext?: Record<string, any>
}