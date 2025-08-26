import { MigrationRunner, Migration } from '../migration-runner';
import { Pool } from 'pg';
import fs from 'fs/promises';
import path from 'path';

// Mock pg Pool
jest.mock('pg');
jest.mock('fs/promises');
jest.mock('path');

describe('MigrationRunner', () => {
  let migrationRunner: MigrationRunner;
  let mockPool: jest.Mocked<Pool>;
  let mockClient: any;
  let mockFs: jest.Mocked<typeof fs>;
  let mockPath: jest.Mocked<typeof path>;

  beforeEach(() => {
    mockClient = {
      query: jest.fn(),
      release: jest.fn()
    };

    mockPool = {
      connect: jest.fn().mockResolvedValue(mockClient),
      query: jest.fn(),
      end: jest.fn()
    } as any;

    mockFs = fs as jest.Mocked<typeof fs>;
    mockPath = path as jest.Mocked<typeof path>;

    migrationRunner = new MigrationRunner(mockPool, '/test/migrations');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAvailableMigrations', () => {
    it('should read and parse migration files correctly', async () => {
      const mockFiles = ['001_initial_schema.sql', '002_add_indexes.sql'];
      const mockContent1 = '-- Description: Initial schema\nCREATE TABLE test;';
      const mockContent2 = '-- Description: Add indexes\nCREATE INDEX test_idx;';

      mockFs.readdir.mockResolvedValue(mockFiles as any);
      mockPath.join
        .mockReturnValueOnce('/test/migrations/001_initial_schema.sql')
        .mockReturnValueOnce('/test/migrations/002_add_indexes.sql');
      mockFs.readFile
        .mockResolvedValueOnce(mockContent1)
        .mockResolvedValueOnce(mockContent2);

      const migrations = await migrationRunner.getAvailableMigrations();

      expect(migrations).toHaveLength(2);
      expect(migrations[0]).toEqual({
        version: '001_initial_schema',
        description: 'Initial schema',
        sql: mockContent1
      });
      expect(migrations[1]).toEqual({
        version: '002_add_indexes',
        description: 'Add indexes',
        sql: mockContent2
      });
    });

    it('should handle files without description comments', async () => {
      const mockFiles = ['001_test.sql'];
      const mockContent = 'CREATE TABLE test;';

      mockFs.readdir.mockResolvedValue(mockFiles as any);
      mockPath.join.mockReturnValue('/test/migrations/001_test.sql');
      mockFs.readFile.mockResolvedValue(mockContent);

      const migrations = await migrationRunner.getAvailableMigrations();

      expect(migrations[0].description).toBe('Migration 001_test');
    });

    it('should filter out non-SQL files', async () => {
      const mockFiles = ['001_test.sql', 'readme.txt', '002_test.sql'];
      const mockContent = 'CREATE TABLE test;';

      mockFs.readdir.mockResolvedValue(mockFiles as any);
      mockPath.join
        .mockReturnValueOnce('/test/migrations/001_test.sql')
        .mockReturnValueOnce('/test/migrations/002_test.sql');
      mockFs.readFile.mockResolvedValue(mockContent);

      const migrations = await migrationRunner.getAvailableMigrations();

      expect(migrations).toHaveLength(2);
      expect(migrations.every(m => m.version.endsWith('_test'))).toBe(true);
    });

    it('should handle directory read errors', async () => {
      mockFs.readdir.mockRejectedValue(new Error('Directory not found'));

      await expect(migrationRunner.getAvailableMigrations()).rejects.toThrow(
        'Failed to read migrations directory: Error: Directory not found'
      );
    });
  });

  describe('getExecutedMigrations', () => {
    it('should return executed migration versions', async () => {
      const mockRows = [
        { version: '001_initial_schema' },
        { version: '002_add_indexes' }
      ];

      mockPool.query.mockResolvedValue({ rows: mockRows });

      const executed = await migrationRunner.getExecutedMigrations();

      expect(executed).toEqual(['001_initial_schema', '002_add_indexes']);
      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT version FROM migrations ORDER BY executed_at'
      );
    });

    it('should return empty array if migrations table does not exist', async () => {
      const error = new Error('relation "migrations" does not exist');
      mockPool.query.mockRejectedValue(error);

      const executed = await migrationRunner.getExecutedMigrations();

      expect(executed).toEqual([]);
    });

    it('should throw other database errors', async () => {
      const error = new Error('Connection failed');
      mockPool.query.mockRejectedValue(error);

      await expect(migrationRunner.getExecutedMigrations()).rejects.toThrow('Connection failed');
    });
  });

  describe('getPendingMigrations', () => {
    it('should return migrations that have not been executed', async () => {
      const availableMigrations: Migration[] = [
        { version: '001_initial', description: 'Initial', sql: 'CREATE TABLE test1;' },
        { version: '002_update', description: 'Update', sql: 'CREATE TABLE test2;' },
        { version: '003_new', description: 'New', sql: 'CREATE TABLE test3;' }
      ];

      const executedVersions = ['001_initial', '002_update'];

      jest.spyOn(migrationRunner, 'getAvailableMigrations').mockResolvedValue(availableMigrations);
      jest.spyOn(migrationRunner, 'getExecutedMigrations').mockResolvedValue(executedVersions);

      const pending = await migrationRunner.getPendingMigrations();

      expect(pending).toHaveLength(1);
      expect(pending[0].version).toBe('003_new');
    });

    it('should return empty array if all migrations are executed', async () => {
      const availableMigrations: Migration[] = [
        { version: '001_initial', description: 'Initial', sql: 'CREATE TABLE test1;' }
      ];

      const executedVersions = ['001_initial'];

      jest.spyOn(migrationRunner, 'getAvailableMigrations').mockResolvedValue(availableMigrations);
      jest.spyOn(migrationRunner, 'getExecutedMigrations').mockResolvedValue(executedVersions);

      const pending = await migrationRunner.getPendingMigrations();

      expect(pending).toHaveLength(0);
    });
  });

  describe('executeMigration', () => {
    const mockMigration: Migration = {
      version: '001_test',
      description: 'Test migration',
      sql: 'CREATE TABLE test;'
    };

    it('should execute migration successfully', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce(undefined) // Migration SQL
        .mockResolvedValueOnce(undefined) // Insert into migrations table
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await migrationRunner.executeMigration(mockMigration);

      expect(result.success).toBe(true);
      expect(result.version).toBe('001_test');
      expect(result.error).toBeUndefined();
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith(mockMigration.sql);
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle migration execution errors', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockRejectedValueOnce(new Error('SQL error')); // Migration SQL fails

      const result = await migrationRunner.executeMigration(mockMigration);

      expect(result.success).toBe(false);
      expect(result.version).toBe('001_test');
      expect(result.error).toBe('SQL error');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle migrations table not existing yet', async () => {
      const migrationsTableError = new Error('relation "migrations" does not exist');
      
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce(undefined) // Migration SQL
        .mockRejectedValueOnce(migrationsTableError) // Insert into migrations table fails
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await migrationRunner.executeMigration(mockMigration);

      expect(result.success).toBe(true);
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });
  });

  describe('runMigrations', () => {
    it('should run all pending migrations successfully', async () => {
      const pendingMigrations: Migration[] = [
        { version: '001_test1', description: 'Test 1', sql: 'CREATE TABLE test1;' },
        { version: '002_test2', description: 'Test 2', sql: 'CREATE TABLE test2;' }
      ];

      jest.spyOn(migrationRunner, 'getPendingMigrations').mockResolvedValue(pendingMigrations);
      jest.spyOn(migrationRunner, 'executeMigration')
        .mockResolvedValueOnce({ version: '001_test1', success: true, executedAt: new Date() })
        .mockResolvedValueOnce({ version: '002_test2', success: true, executedAt: new Date() });

      const results = await migrationRunner.runMigrations();

      expect(results).toHaveLength(2);
      expect(results.every(r => r.success)).toBe(true);
    });

    it('should stop on first migration failure', async () => {
      const pendingMigrations: Migration[] = [
        { version: '001_test1', description: 'Test 1', sql: 'CREATE TABLE test1;' },
        { version: '002_test2', description: 'Test 2', sql: 'CREATE TABLE test2;' }
      ];

      jest.spyOn(migrationRunner, 'getPendingMigrations').mockResolvedValue(pendingMigrations);
      jest.spyOn(migrationRunner, 'executeMigration')
        .mockResolvedValueOnce({ version: '001_test1', success: false, error: 'SQL error', executedAt: new Date() });

      const results = await migrationRunner.runMigrations();

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].error).toBe('SQL error');
    });
  });

  describe('isUpToDate', () => {
    it('should return true when no pending migrations', async () => {
      jest.spyOn(migrationRunner, 'getPendingMigrations').mockResolvedValue([]);

      const isUpToDate = await migrationRunner.isUpToDate();

      expect(isUpToDate).toBe(true);
    });

    it('should return false when there are pending migrations', async () => {
      const pendingMigrations: Migration[] = [
        { version: '001_test', description: 'Test', sql: 'CREATE TABLE test;' }
      ];

      jest.spyOn(migrationRunner, 'getPendingMigrations').mockResolvedValue(pendingMigrations);

      const isUpToDate = await migrationRunner.isUpToDate();

      expect(isUpToDate).toBe(false);
    });
  });

  describe('getStatus', () => {
    it('should return comprehensive migration status', async () => {
      const availableMigrations: Migration[] = [
        { version: '001_test1', description: 'Test 1', sql: 'CREATE TABLE test1;' },
        { version: '002_test2', description: 'Test 2', sql: 'CREATE TABLE test2;' },
        { version: '003_test3', description: 'Test 3', sql: 'CREATE TABLE test3;' }
      ];

      const executedVersions = ['001_test1', '002_test2'];
      const pendingMigrations = [availableMigrations[2]];

      jest.spyOn(migrationRunner, 'getAvailableMigrations').mockResolvedValue(availableMigrations);
      jest.spyOn(migrationRunner, 'getExecutedMigrations').mockResolvedValue(executedVersions);
      jest.spyOn(migrationRunner, 'getPendingMigrations').mockResolvedValue(pendingMigrations);

      const status = await migrationRunner.getStatus();

      expect(status).toEqual({
        isUpToDate: false,
        executedCount: 2,
        pendingCount: 1,
        availableCount: 3
      });
    });
  });
});