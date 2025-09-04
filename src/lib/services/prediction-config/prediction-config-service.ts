/**
 * Prediction Configuration Service
 * Handles customizable prediction parameters, filtering, and template management
 */

import { Pool } from 'pg'
import { 
  PredictionConfiguration, 
  PredictionTemplate, 
  PredictionConfigurationRequest,
  PredictionConfigurationResponse,
  ValidationResult,
  ConfigurationSearchFilters,
  ConfigurationSearchResult,
  ValidationError,
  ValidationWarning
} from '@/types/prediction-config'

export class PredictionConfigurationService {
  private db: Pool

  constructor(db: Pool) {
    this.db = db
  }

  /**
   * Create a new prediction configuration
   */
  async createConfiguration(
    request: PredictionConfigurationRequest,
    userId: string
  ): Promise<PredictionConfigurationResponse> {
    const validation = await this.validateConfiguration(request.config)
    
    if (!validation.isValid) {
      return {
        config: request.config,
        validation
      }
    }

    const client = await this.db.connect()
    try {
      await client.query('BEGIN')

      // Insert configuration
      const configQuery = `
        INSERT INTO prediction_configurations (
          name, description, filters, parameters, scenario_variables,
          created_by, is_template, tags
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, created_at, updated_at
      `
      
      const configResult = await client.query(configQuery, [
        request.config.name,
        request.config.description,
        JSON.stringify(request.config.filters),
        JSON.stringify(request.config.parameters),
        JSON.stringify(request.config.scenarioVariables),
        userId,
        request.saveAsTemplate || false,
        JSON.stringify(request.config.tags || [])
      ])

      const savedConfig: PredictionConfiguration = {
        ...request.config,
        id: configResult.rows[0].id,
        createdAt: configResult.rows[0].created_at,
        updatedAt: configResult.rows[0].updated_at,
        createdBy: userId
      }

      await client.query('COMMIT')

      return {
        config: savedConfig,
        validation
      }
    } catch (error) {
      await client.query('ROLLBACK')
      throw new Error(`Failed to create configuration: ${error}`)
    } finally {
      client.release()
    }
  }

  /**
   * Update an existing prediction configuration
   */
  async updateConfiguration(
    id: string,
    updates: Partial<PredictionConfiguration>,
    userId: string
  ): Promise<PredictionConfiguration> {
    const client = await this.db.connect()
    try {
      const updateQuery = `
        UPDATE prediction_configurations 
        SET 
          name = COALESCE($2, name),
          description = COALESCE($3, description),
          filters = COALESCE($4, filters),
          parameters = COALESCE($5, parameters),
          scenario_variables = COALESCE($6, scenario_variables),
          tags = COALESCE($7, tags),
          updated_at = NOW()
        WHERE id = $1 AND created_by = $8
        RETURNING *
      `

      const result = await client.query(updateQuery, [
        id,
        updates.name,
        updates.description,
        updates.filters ? JSON.stringify(updates.filters) : null,
        updates.parameters ? JSON.stringify(updates.parameters) : null,
        updates.scenarioVariables ? JSON.stringify(updates.scenarioVariables) : null,
        updates.tags ? JSON.stringify(updates.tags) : null,
        userId
      ])

      if (result.rows.length === 0) {
        throw new Error('Configuration not found or access denied')
      }

      return this.mapRowToConfiguration(result.rows[0])
    } finally {
      client.release()
    }
  }

  /**
   * Get configuration by ID
   */
  async getConfiguration(id: string, userId?: string): Promise<PredictionConfiguration | null> {
    const client = await this.db.connect()
    try {
      let query = 'SELECT * FROM prediction_configurations WHERE id = $1'
      const params = [id]

      if (userId) {
        query += ' AND (created_by = $2 OR is_template = true)'
        params.push(userId)
      }

      const result = await client.query(query, params)
      
      if (result.rows.length === 0) {
        return null
      }

      return this.mapRowToConfiguration(result.rows[0])
    } finally {
      client.release()
    }
  }

  /**
   * Search configurations with filters
   */
  async searchConfigurations(
    filters: ConfigurationSearchFilters,
    userId: string,
    page: number = 1,
    pageSize: number = 20
  ): Promise<ConfigurationSearchResult> {
    const client = await this.db.connect()
    try {
      let whereConditions = ['(created_by = $1 OR is_template = true)']
      let params: any[] = [userId]
      let paramIndex = 2

      if (filters.name) {
        whereConditions.push(`name ILIKE $${paramIndex}`)
        params.push(`%${filters.name}%`)
        paramIndex++
      }

      if (filters.isTemplate !== undefined) {
        whereConditions.push(`is_template = $${paramIndex}`)
        params.push(filters.isTemplate)
        paramIndex++
      }

      if (filters.tags && filters.tags.length > 0) {
        whereConditions.push(`tags ?| $${paramIndex}`)
        params.push(filters.tags)
        paramIndex++
      }

      if (filters.dateRange) {
        whereConditions.push(`created_at BETWEEN $${paramIndex} AND $${paramIndex + 1}`)
        params.push(filters.dateRange.startDate, filters.dateRange.endDate)
        paramIndex += 2
      }

      const whereClause = whereConditions.join(' AND ')
      const offset = (page - 1) * pageSize

      // Get total count
      const countQuery = `SELECT COUNT(*) FROM prediction_configurations WHERE ${whereClause}`
      const countResult = await client.query(countQuery, params)
      const total = parseInt(countResult.rows[0].count)

      // Get configurations
      const dataQuery = `
        SELECT * FROM prediction_configurations 
        WHERE ${whereClause}
        ORDER BY updated_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `
      params.push(pageSize, offset)

      const dataResult = await client.query(dataQuery, params)
      const configurations = dataResult.rows.map(row => this.mapRowToConfiguration(row))

      return {
        configurations,
        total,
        page,
        pageSize
      }
    } finally {
      client.release()
    }
  }

  /**
   * Delete configuration
   */
  async deleteConfiguration(id: string, userId: string): Promise<boolean> {
    const client = await this.db.connect()
    try {
      const result = await client.query(
        'DELETE FROM prediction_configurations WHERE id = $1 AND created_by = $2',
        [id, userId]
      )
      return result.rowCount > 0
    } finally {
      client.release()
    }
  }

  /**
   * Clone configuration as new template
   */
  async cloneAsTemplate(
    id: string,
    newName: string,
    userId: string
  ): Promise<PredictionTemplate> {
    const original = await this.getConfiguration(id, userId)
    if (!original) {
      throw new Error('Configuration not found')
    }

    const templateConfig: PredictionConfiguration = {
      ...original,
      id: undefined,
      name: newName,
      isTemplate: true,
      createdAt: undefined,
      updatedAt: undefined,
      createdBy: userId
    }

    const response = await this.createConfiguration(
      { config: templateConfig, saveAsTemplate: true },
      userId
    )

    return response.config as PredictionTemplate
  }

  /**
   * Get popular templates
   */
  async getPopularTemplates(limit: number = 10): Promise<PredictionTemplate[]> {
    const client = await this.db.connect()
    try {
      const query = `
        SELECT pc.*, COUNT(pu.id) as usage_count
        FROM prediction_configurations pc
        LEFT JOIN prediction_usage pu ON pc.id = pu.template_id
        WHERE pc.is_template = true
        GROUP BY pc.id
        ORDER BY usage_count DESC, pc.created_at DESC
        LIMIT $1
      `

      const result = await client.query(query, [limit])
      return result.rows.map(row => ({
        ...this.mapRowToConfiguration(row),
        usageCount: parseInt(row.usage_count)
      })) as PredictionTemplate[]
    } finally {
      client.release()
    }
  }

  /**
   * Validate prediction configuration
   */
  private async validateConfiguration(config: PredictionConfiguration): Promise<ValidationResult> {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []

    // Required fields validation
    if (!config.name || config.name.trim().length === 0) {
      errors.push({
        field: 'name',
        message: 'Configuration name is required',
        code: 'REQUIRED_FIELD'
      })
    }

    // Parameters validation
    if (config.parameters.confidenceLevel < 0.5 || config.parameters.confidenceLevel > 0.99) {
      errors.push({
        field: 'parameters.confidenceLevel',
        message: 'Confidence level must be between 0.5 and 0.99',
        code: 'INVALID_RANGE'
      })
    }

    if (config.parameters.forecastHorizon < 1 || config.parameters.forecastHorizon > 365) {
      errors.push({
        field: 'parameters.forecastHorizon',
        message: 'Forecast horizon must be between 1 and 365 periods',
        code: 'INVALID_RANGE'
      })
    }

    // Date range validation
    if (config.filters.dateRange) {
      const startDate = new Date(config.filters.dateRange.startDate)
      const endDate = new Date(config.filters.dateRange.endDate)
      
      if (startDate >= endDate) {
        errors.push({
          field: 'filters.dateRange',
          message: 'Start date must be before end date',
          code: 'INVALID_DATE_RANGE'
        })
      }

      const daysDiff = Math.abs(endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      if (daysDiff < 30) {
        warnings.push({
          field: 'filters.dateRange',
          message: 'Date range is less than 30 days, which may affect prediction accuracy',
          suggestion: 'Consider using at least 30 days of historical data for better predictions'
        })
      }
    }

    // Scenario variables validation
    if (config.scenarioVariables?.growthRate !== undefined) {
      if (config.scenarioVariables.growthRate < -100 || config.scenarioVariables.growthRate > 1000) {
        warnings.push({
          field: 'scenarioVariables.growthRate',
          message: 'Growth rate seems extreme',
          suggestion: 'Consider using growth rates between -50% and 200% for realistic scenarios'
        })
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Map database row to configuration object
   */
  private mapRowToConfiguration(row: any): PredictionConfiguration {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      filters: JSON.parse(row.filters),
      parameters: JSON.parse(row.parameters),
      scenarioVariables: row.scenario_variables ? JSON.parse(row.scenario_variables) : undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by,
      isTemplate: row.is_template,
      tags: row.tags ? JSON.parse(row.tags) : []
    }
  }
}