/**
 * Vector Database Utilities for Advanced Predictive Analytics
 * 
 * This module provides utilities for working with pgvector:
 * - Vector embedding operations
 * - Similarity search functions
 * - Vector index management
 * - Performance optimization
 */

import { Pool } from 'pg'
import { getDatabasePool } from './connection'

export interface VectorSearchOptions {
  table: string
  vectorColumn: string
  embedding: number[]
  limit?: number
  threshold?: number
  filters?: Record<string, any>
  includeDistance?: boolean
}

export interface VectorSearchResult {
  id: string
  distance: number
  similarity: number
  data: Record<string, any>
}

export interface VectorIndexOptions {
  table: string
  column: string
  indexName?: string
  lists?: number
  probes?: number
  method?: 'ivfflat' | 'hnsw'
  distanceFunction?: 'vector_l2_ops' | 'vector_ip_ops' | 'vector_cosine_ops'
}

export class VectorDatabaseUtils {
  private pool: Pool | null = null

  private async getPool(): Promise<Pool> {
    if (!this.pool) {
      this.pool = await getDatabasePool()
    }
    return this.pool
  }

  /**
   * Convert array of numbers to pgvector format
   */
  public static arrayToVector(array: number[]): string {
    return `[${array.join(',')}]`
  }

  /**
   * Convert pgvector string to array of numbers
   */
  public static vectorToArray(vectorString: string): number[] {
    const cleaned = vectorString.replace(/[\[\]]/g, '').trim()
    if (cleaned === '') {
      return []
    }
    return cleaned
      .split(',')
      .map(num => parseFloat(num.trim()))
  }

  /**
   * Normalize vector to unit length
   */
  public static normalizeVector(vector: number[]): number[] {
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0))
    if (magnitude === 0) return vector
    return vector.map(val => val / magnitude)
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  public static cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same length')
    }

    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0)
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0))
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0))

    if (magnitudeA === 0 || magnitudeB === 0) return 0
    return dotProduct / (magnitudeA * magnitudeB)
  }

  /**
   * Perform vector similarity search
   */
  public async vectorSearch(options: VectorSearchOptions): Promise<VectorSearchResult[]> {
    const pool = await this.getPool()
    const {
      table,
      vectorColumn,
      embedding,
      limit = 10,
      threshold = 0,
      filters = {},
      includeDistance = true
    } = options

    const vectorString = VectorDatabaseUtils.arrayToVector(embedding)
    
    // Build WHERE clause for filters
    const filterConditions: string[] = [`${vectorColumn} IS NOT NULL`]
    const filterValues: any[] = [vectorString, limit]
    let paramIndex = 3

    for (const [key, value] of Object.entries(filters)) {
      filterConditions.push(`${key} = $${paramIndex}`)
      filterValues.push(value)
      paramIndex++
    }

    // Add similarity threshold if specified
    if (threshold > 0) {
      filterConditions.push(`(1 - (${vectorColumn} <=> $1::vector)) >= $${paramIndex}`)
      filterValues.push(threshold)
      paramIndex++
    }

    const whereClause = filterConditions.join(' AND ')
    
    const query = `
      SELECT 
        *,
        ${includeDistance ? `(${vectorColumn} <=> $1::vector) as distance,` : ''}
        (1 - (${vectorColumn} <=> $1::vector)) as similarity
      FROM ${table}
      WHERE ${whereClause}
      ORDER BY ${vectorColumn} <=> $1::vector
      LIMIT $2
    `

    try {
      const result = await pool.query(query, filterValues)
      
      return result.rows.map(row => ({
        id: row.id,
        distance: row.distance || 0,
        similarity: row.similarity || 0,
        data: { ...row }
      }))
    } catch (error) {
      console.error('Vector search failed:', error)
      throw new Error(`Vector search failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Insert vector embedding
   */
  public async insertEmbedding(
    table: string,
    data: Record<string, any>,
    vectorColumn: string,
    embedding: number[]
  ): Promise<string> {
    const pool = await this.getPool()
    
    const vectorString = VectorDatabaseUtils.arrayToVector(embedding)
    const columns = Object.keys(data)
    const values = Object.values(data)
    
    // Add vector column and value
    columns.push(vectorColumn)
    values.push(vectorString)
    
    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ')
    const columnList = columns.join(', ')
    
    const query = `
      INSERT INTO ${table} (${columnList})
      VALUES (${placeholders})
      RETURNING id
    `
    
    try {
      const result = await pool.query(query, values)
      return result.rows[0].id
    } catch (error) {
      console.error('Insert embedding failed:', error)
      throw new Error(`Insert embedding failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Update vector embedding
   */
  public async updateEmbedding(
    table: string,
    id: string,
    vectorColumn: string,
    embedding: number[],
    additionalData?: Record<string, any>
  ): Promise<void> {
    const pool = await this.getPool()
    
    const vectorString = VectorDatabaseUtils.arrayToVector(embedding)
    const updates = [`${vectorColumn} = $2`]
    const values = [id, vectorString]
    let paramIndex = 3

    if (additionalData) {
      for (const [key, value] of Object.entries(additionalData)) {
        updates.push(`${key} = $${paramIndex}`)
        values.push(value)
        paramIndex++
      }
    }

    const query = `
      UPDATE ${table}
      SET ${updates.join(', ')}, updated_at = NOW()
      WHERE id = $1
    `
    
    try {
      await pool.query(query, values)
    } catch (error) {
      console.error('Update embedding failed:', error)
      throw new Error(`Update embedding failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Create vector index for better performance
   */
  public async createVectorIndex(options: VectorIndexOptions): Promise<void> {
    const pool = await this.getPool()
    const {
      table,
      column,
      indexName = `idx_${table}_${column}_vector`,
      lists = 100,
      method = 'ivfflat',
      distanceFunction = 'vector_cosine_ops'
    } = options

    const query = `
      CREATE INDEX CONCURRENTLY IF NOT EXISTS ${indexName}
      ON ${table} USING ${method} (${column} ${distanceFunction})
      WITH (lists = ${lists})
    `
    
    try {
      await pool.query(query)
      console.log(`✅ Vector index created: ${indexName}`)
    } catch (error) {
      console.error('Create vector index failed:', error)
      throw new Error(`Create vector index failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Get vector index statistics
   */
  public async getIndexStats(indexName: string): Promise<any> {
    const pool = await this.getPool()
    
    const query = `
      SELECT 
        schemaname,
        tablename,
        indexname,
        num_rows,
        table_size,
        index_size,
        unique_rows,
        null_frac
      FROM pg_stats_user_indexes 
      WHERE indexname = $1
    `
    
    try {
      const result = await pool.query(query, [indexName])
      return result.rows[0] || null
    } catch (error) {
      console.error('Get index stats failed:', error)
      return null
    }
  }

  /**
   * Optimize vector search performance
   */
  public async optimizeVectorSearch(table: string, vectorColumn: string): Promise<void> {
    const pool = await this.getPool()
    
    try {
      // Update table statistics
      await pool.query(`ANALYZE ${table}`)
      
      // Set optimal work_mem for vector operations
      await pool.query('SET work_mem = \'256MB\'')
      
      // Set optimal effective_cache_size
      await pool.query('SET effective_cache_size = \'4GB\'')
      
      // Ensure ivfflat index exists with recommended lists if using cosine ops
      await pool.query(`DO $$
      DECLARE
        idx_count INTEGER;
      BEGIN
        SELECT COUNT(1) INTO idx_count
        FROM pg_indexes 
        WHERE schemaname = ANY(current_schemas(false))
          AND tablename = $1
          AND indexname LIKE ('idx_' || $1 || '_' || $2 || '_vector%');
        IF idx_count = 0 THEN
          EXECUTE format('CREATE INDEX CONCURRENTLY IF NOT EXISTS %I ON %I USING ivfflat (%I vector_cosine_ops) WITH (lists = 100)',
                         'idx_' || $1 || '_' || $2 || '_vector', $1, $2);
        END IF;
      END $$ LANGUAGE plpgsql;`, [table, vectorColumn])

      console.log(`✅ Vector search optimized for ${table}.${vectorColumn}`)
    } catch (error) {
      console.error('Optimize vector search failed:', error)
      throw new Error(`Optimize vector search failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Batch insert embeddings for better performance
   */
  public async batchInsertEmbeddings(
    table: string,
    records: Array<{
      data: Record<string, any>
      embedding: number[]
    }>,
    vectorColumn: string,
    batchSize: number = 100
  ): Promise<string[]> {
    const pool = await this.getPool()
    const insertedIds: string[] = []
    
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize)
      
      const client = await pool.connect()
      try {
        await client.query('BEGIN')
        
        for (const record of batch) {
          const vectorString = VectorDatabaseUtils.arrayToVector(record.embedding)
          const columns = Object.keys(record.data)
          const values = Object.values(record.data)
          
          columns.push(vectorColumn)
          values.push(vectorString)
          
          const placeholders = values.map((_, idx) => `$${idx + 1}`).join(', ')
          const columnList = columns.join(', ')
          
          const query = `
            INSERT INTO ${table} (${columnList})
            VALUES (${placeholders})
            RETURNING id
          `
          
          const result = await client.query(query, values)
          insertedIds.push(result.rows[0].id)
        }
        
        await client.query('COMMIT')
      } catch (error) {
        await client.query('ROLLBACK')
        throw error
      } finally {
        client.release()
      }
    }
    
    return insertedIds
  }

  /**
   * Find similar patterns using vector embeddings
   */
  public async findSimilarPatterns(
    embedding: number[],
    patternType?: string,
    threshold: number = 0.7,
    limit: number = 10
  ): Promise<VectorSearchResult[]> {
    const pool = await this.getPool()
    
    const vectorString = VectorDatabaseUtils.arrayToVector(embedding)
    const params = [vectorString, threshold, limit]
    
    let query = `
      SELECT 
        source_client_id as id,
        similarity_score,
        pattern_type,
        time_period,
        (1 - (similarity_embedding <=> $1::vector)) as similarity,
        (similarity_embedding <=> $1::vector) as distance
      FROM pattern_similarities
      WHERE (1 - (similarity_embedding <=> $1::vector)) >= $2
    `
    
    if (patternType) {
      query += ` AND pattern_type = $4`
      params.push(patternType)
    }
    
    query += `
      ORDER BY similarity_embedding <=> $1::vector
      LIMIT $3
    `
    
    try {
      const result = await pool.query(query, params)
      
      return result.rows.map(row => ({
        id: row.id,
        distance: row.distance,
        similarity: row.similarity,
        data: {
          similarity_score: row.similarity_score,
          pattern_type: row.pattern_type,
          time_period: row.time_period
        }
      }))
    } catch (error) {
      console.error('Find similar patterns failed:', error)
      throw new Error(`Find similar patterns failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
}

// Export singleton instance
export const vectorUtils = new VectorDatabaseUtils()

// Export utility functions
export {
  VectorDatabaseUtils as VectorUtils
}