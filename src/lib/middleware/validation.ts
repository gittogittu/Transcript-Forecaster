import { NextRequest, NextResponse } from 'next/server'
import { z, ZodSchema } from 'zod'

/**
 * Validation middleware for request body
 */
export function validateRequestBody<T>(schema: ZodSchema<T>) {
  return async (request: NextRequest): Promise<{ data: T; error: NextResponse | null }> => {
    try {
      const body = await request.json()
      const validationResult = schema.safeParse(body)
      
      if (!validationResult.success) {
        return {
          data: null as any,
          error: NextResponse.json(
            {
              error: 'Request validation failed',
              details: validationResult.error.errors.map(err => ({
                field: err.path.join('.'),
                message: err.message,
                code: err.code,
              })),
            },
            { status: 400 }
          )
        }
      }
      
      return {
        data: validationResult.data,
        error: null,
      }
    } catch (error) {
      return {
        data: null as any,
        error: NextResponse.json(
          { error: 'Invalid JSON in request body' },
          { status: 400 }
        )
      }
    }
  }
}

/**
 * Validation middleware for query parameters
 */
export function validateQueryParams<T>(schema: ZodSchema<T>) {
  return (request: NextRequest): { data: T; error: NextResponse | null } => {
    try {
      const { searchParams } = new URL(request.url)
      const params: Record<string, any> = {}
      
      // Convert URLSearchParams to object
      for (const [key, value] of searchParams.entries()) {
        // Try to parse numbers and booleans
        if (value === 'true') {
          params[key] = true
        } else if (value === 'false') {
          params[key] = false
        } else if (!isNaN(Number(value)) && value !== '') {
          params[key] = Number(value)
        } else {
          params[key] = value
        }
      }
      
      const validationResult = schema.safeParse(params)
      
      if (!validationResult.success) {
        return {
          data: null as any,
          error: NextResponse.json(
            {
              error: 'Query parameter validation failed',
              details: validationResult.error.errors.map(err => ({
                field: err.path.join('.'),
                message: err.message,
                code: err.code,
              })),
            },
            { status: 400 }
          )
        }
      }
      
      return {
        data: validationResult.data,
        error: null,
      }
    } catch (error) {
      return {
        data: null as any,
        error: NextResponse.json(
          { error: 'Invalid query parameters' },
          { status: 400 }
        )
      }
    }
  }
}

/**
 * Validation middleware for path parameters
 */
export function validatePathParams<T>(schema: ZodSchema<T>) {
  return (params: Record<string, string>): { data: T; error: NextResponse | null } => {
    try {
      const validationResult = schema.safeParse(params)
      
      if (!validationResult.success) {
        return {
          data: null as any,
          error: NextResponse.json(
            {
              error: 'Path parameter validation failed',
              details: validationResult.error.errors.map(err => ({
                field: err.path.join('.'),
                message: err.message,
                code: err.code,
              })),
            },
            { status: 400 }
          )
        }
      }
      
      return {
        data: validationResult.data,
        error: null,
      }
    } catch (error) {
      return {
        data: null as any,
        error: NextResponse.json(
          { error: 'Invalid path parameters' },
          { status: 400 }
        )
      }
    }
  }
}

/**
 * Common validation schemas
 */
export const commonSchemas = {
  // ID parameter validation
  id: z.object({
    id: z.string().min(1, 'ID is required'),
  }),
  
  // Pagination parameters
  pagination: z.object({
    page: z.number().int().min(1).default(1),
    limit: z.number().int().min(1).max(100).default(20),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  }),
  
  // Date range parameters
  dateRange: z.object({
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be in YYYY-MM-DD format').optional(),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be in YYYY-MM-DD format').optional(),
  }).refine(data => {
    if (data.startDate && data.endDate) {
      return new Date(data.startDate) <= new Date(data.endDate)
    }
    return true
  }, {
    message: 'Start date must be before or equal to end date',
  }),
  
  // Month range parameters
  monthRange: z.object({
    startMonth: z.string().regex(/^\d{4}-\d{2}$/, 'Start month must be in YYYY-MM format').optional(),
    endMonth: z.string().regex(/^\d{4}-\d{2}$/, 'End month must be in YYYY-MM format').optional(),
  }).refine(data => {
    if (data.startMonth && data.endMonth) {
      return data.startMonth <= data.endMonth
    }
    return true
  }, {
    message: 'Start month must be before or equal to end month',
  }),
  
  // Client filter parameters
  clientFilter: z.object({
    clientName: z.string().min(1).optional(),
    clientNames: z.array(z.string().min(1)).optional(),
  }),
}

/**
 * Combine multiple validation middlewares
 */
export function combineValidations<TBody, TQuery, TParams>(
  bodySchema?: ZodSchema<TBody>,
  querySchema?: ZodSchema<TQuery>,
  paramsSchema?: ZodSchema<TParams>
) {
  return async (
    request: NextRequest,
    params?: Record<string, string>
  ): Promise<{
    body: TBody | null
    query: TQuery | null
    params: TParams | null
    error: NextResponse | null
  }> => {
    let bodyData: TBody | null = null
    let queryData: TQuery | null = null
    let paramsData: TParams | null = null
    
    // Validate request body if schema provided
    if (bodySchema) {
      const bodyValidation = await validateRequestBody(bodySchema)(request)
      if (bodyValidation.error) {
        return {
          body: null,
          query: null,
          params: null,
          error: bodyValidation.error,
        }
      }
      bodyData = bodyValidation.data
    }
    
    // Validate query parameters if schema provided
    if (querySchema) {
      const queryValidation = validateQueryParams(querySchema)(request)
      if (queryValidation.error) {
        return {
          body: bodyData,
          query: null,
          params: null,
          error: queryValidation.error,
        }
      }
      queryData = queryValidation.data
    }
    
    // Validate path parameters if schema provided
    if (paramsSchema && params) {
      const paramsValidation = validatePathParams(paramsSchema)(params)
      if (paramsValidation.error) {
        return {
          body: bodyData,
          query: queryData,
          params: null,
          error: paramsValidation.error,
        }
      }
      paramsData = paramsValidation.data
    }
    
    return {
      body: bodyData,
      query: queryData,
      params: paramsData,
      error: null,
    }
  }
}

/**
 * Apply validation to an API route handler
 */
export function withValidation<TBody, TQuery, TParams, TArgs extends any[]>(
  bodySchema?: ZodSchema<TBody>,
  querySchema?: ZodSchema<TQuery>,
  paramsSchema?: ZodSchema<TParams>
) {
  return function (
    handler: (
      request: NextRequest,
      context: {
        body: TBody | null
        query: TQuery | null
        params: TParams | null
      },
      ...args: TArgs
    ) => Promise<NextResponse>
  ) {
    return async (request: NextRequest, routeParams?: { params: Record<string, string> }, ...args: TArgs): Promise<NextResponse> => {
      const validation = await combineValidations(bodySchema, querySchema, paramsSchema)(
        request,
        routeParams?.params
      )
      
      if (validation.error) {
        return validation.error
      }
      
      return handler(
        request,
        {
          body: validation.body,
          query: validation.query,
          params: validation.params,
        },
        ...args
      )
    }
  }
}