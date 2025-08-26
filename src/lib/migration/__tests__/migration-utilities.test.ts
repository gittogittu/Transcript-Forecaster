import { MigrationUtilities } from '../migration-utilities';
import { GoogleSheetsService } from '@/lib/services/google-sheets';
import { DatabaseService } from '@/lib/services/database-service';
import { TranscriptData } from '@/types/transcript';
import fs from 'fs/promises';

// Mock the services
jest.mock('@/lib/services/google-sheets');
jest.mock('@/lib/services/database-service');
jest.mock('fs/promises');

describe('MigrationUtilities', () => {
  let migrationUtils: MigrationUtilities;
  let mockGoogleSheetsService: jest.Mocked<GoogleSheetsService>;
  let mockDatabaseService: jest.Mocked<DatabaseService>;
  let mockFs: jest.Mocked<typeof fs>;

  const mockTranscriptData: TranscriptData[] = [
    {
      clientName: 'Client A',
      month: '2024-01',
      transcriptCount: 10,
      notes: 'Test note 1'
    },
    {
      clientName: 'Client B',
      month: '2024-01',
      transcriptCount: 15,
      notes: 'Test note 2'
    }
  ];

  beforeEach(() => {
    mockGoogleSheetsService = new GoogleSheetsService() as jest.Mocked<GoogleSheetsService>;
    mockDatabaseService = new DatabaseService() as jest.Mocked<DatabaseService>;
    mockFs = fs as jest.Mocked<typeof fs>;

    migrationUtils = new MigrationUtilities();
    
    // Replace the services with mocks
    (migrationUtils as any).googleSheetsService = mockGoogleSheetsService;
    (migrationUtils as any).databaseService = mockDatabaseService;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('exportFromGoogleSheets', () => {
    it('should export data to JSON format successfully', async () => {
      mockGoogleSheetsService.fetchTranscripts.mockResolvedValue(mockTranscriptData);
      mockFs.writeFile.mockResolvedValue(undefined);

      const report = await migrationUtils.exportFromGoogleSheets({
        format: 'json',
        outputPath: '/test/output.json',
        includeMetadata: true
      });

      expect(report.totalRecords).toBe(2);
      expect(report.successfulRecords).toBe(2);
      expect(report.failedRecords).toBe(0);
      expect(report.errors).toHaveLength(0);
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        '/test/output.json',
        expect.stringContaining('"data"'),
        'utf-8'
      );
    });

    it('should export data to CSV format successfully', async () => {
      mockGoogleSheetsService.fetchTranscripts.mockResolvedValue(mockTranscriptData);
      mockFs.writeFile.mockResolvedValue(undefined);

      const report = await migrationUtils.exportFromGoogleSheets({
        format: 'csv',
        outputPath: '/test/output.csv'
      });

      expect(report.totalRecords).toBe(2);
      expect(report.successfulRecords).toBe(2);
      expect(report.failedRecords).toBe(0);
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        '/test/output.csv',
        expect.stringContaining('clientName,month,transcriptCount'),
        'utf-8'
      );
    });

    it('should handle export errors', async () => {
      mockGoogleSheetsService.fetchTranscripts.mockRejectedValue(new Error('Sheets API error'));

      const report = await migrationUtils.exportFromGoogleSheets({
        format: 'json',
        outputPath: '/test/output.json'
      });

      expect(report.totalRecords).toBe(0);
      expect(report.successfulRecords).toBe(0);
      expect(report.failedRecords).toBe(0);
      expect(report.errors).toContain('Export failed: Sheets API error');
    });
  });

  describe('importToDatabase', () => {
    it('should import JSON data successfully', async () => {
      const jsonData = JSON.stringify({ data: mockTranscriptData });
      mockFs.readFile.mockResolvedValue(jsonData);
      mockDatabaseService.addTranscript.mockResolvedValue(undefined);

      const report = await migrationUtils.importToDatabase({
        format: 'json',
        inputPath: '/test/input.json',
        validateData: true,
        skipDuplicates: false
      });

      expect(report.totalRecords).toBe(2);
      expect(report.successfulRecords).toBe(2);
      expect(report.failedRecords).toBe(0);
      expect(mockDatabaseService.addTranscript).toHaveBeenCalledTimes(2);
    });

    it('should import CSV data successfully', async () => {
      const csvData = 'clientName,month,transcriptCount,notes,createdAt,updatedAt\n"Client A",2024-01,10,"Test note 1",,\n"Client B",2024-01,15,"Test note 2",,';
      mockFs.readFile.mockResolvedValue(csvData);
      mockDatabaseService.addTranscript.mockResolvedValue(undefined);

      const report = await migrationUtils.importToDatabase({
        format: 'csv',
        inputPath: '/test/input.csv'
      });

      expect(report.totalRecords).toBe(2);
      expect(report.successfulRecords).toBe(2);
      expect(report.failedRecords).toBe(0);
    });

    it('should handle validation errors', async () => {
      const invalidData = [
        {
          clientName: '', // Invalid: empty client name
          month: '2024-01',
          transcriptCount: 10
        }
      ];
      const jsonData = JSON.stringify({ data: invalidData });
      mockFs.readFile.mockResolvedValue(jsonData);

      const report = await migrationUtils.importToDatabase({
        format: 'json',
        inputPath: '/test/input.json',
        validateData: true
      });

      expect(report.totalRecords).toBe(1);
      expect(report.successfulRecords).toBe(0);
      expect(report.failedRecords).toBe(1);
      expect(report.errors).toContain('Record 1: Client name is required');
    });

    it('should skip duplicates when requested', async () => {
      const jsonData = JSON.stringify({ data: mockTranscriptData });
      mockFs.readFile.mockResolvedValue(jsonData);
      mockDatabaseService.addTranscript
        .mockResolvedValueOnce(undefined) // First record succeeds
        .mockRejectedValueOnce(new Error('duplicate key value violates unique constraint')); // Second record is duplicate

      const report = await migrationUtils.importToDatabase({
        format: 'json',
        inputPath: '/test/input.json',
        skipDuplicates: true
      });

      expect(report.totalRecords).toBe(2);
      expect(report.successfulRecords).toBe(2); // Both counted as successful (duplicate skipped)
      expect(report.failedRecords).toBe(0);
    });

    it('should handle database errors', async () => {
      const jsonData = JSON.stringify({ data: mockTranscriptData });
      mockFs.readFile.mockResolvedValue(jsonData);
      mockDatabaseService.addTranscript.mockRejectedValue(new Error('Database connection failed'));

      const report = await migrationUtils.importToDatabase({
        format: 'json',
        inputPath: '/test/input.json'
      });

      expect(report.totalRecords).toBe(2);
      expect(report.successfulRecords).toBe(0);
      expect(report.failedRecords).toBe(2);
      expect(report.errors).toHaveLength(2);
    });
  });

  describe('migrateFromSheetsToDatabase', () => {
    it('should migrate data directly from sheets to database', async () => {
      mockGoogleSheetsService.fetchTranscripts.mockResolvedValue(mockTranscriptData);
      mockDatabaseService.addTranscript.mockResolvedValue(undefined);

      const report = await migrationUtils.migrateFromSheetsToDatabase({
        validateData: true,
        skipDuplicates: false
      });

      expect(report.totalRecords).toBe(2);
      expect(report.successfulRecords).toBe(2);
      expect(report.failedRecords).toBe(0);
      expect(mockGoogleSheetsService.fetchTranscripts).toHaveBeenCalled();
      expect(mockDatabaseService.addTranscript).toHaveBeenCalledTimes(2);
    });

    it('should handle migration errors', async () => {
      mockGoogleSheetsService.fetchTranscripts.mockRejectedValue(new Error('Sheets API error'));

      const report = await migrationUtils.migrateFromSheetsToDatabase();

      expect(report.totalRecords).toBe(0);
      expect(report.successfulRecords).toBe(0);
      expect(report.failedRecords).toBe(0);
      expect(report.errors).toContain('Migration failed: Sheets API error');
    });
  });

  describe('validateMigration', () => {
    it('should validate successful migration', async () => {
      mockGoogleSheetsService.fetchTranscripts.mockResolvedValue(mockTranscriptData);
      mockDatabaseService.fetchTranscripts.mockResolvedValue(mockTranscriptData);

      const result = await migrationUtils.validateMigration();

      expect(result.isValid).toBe(true);
      expect(result.sheetsCount).toBe(2);
      expect(result.databaseCount).toBe(2);
      expect(result.missingInDatabase).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing records in database', async () => {
      mockGoogleSheetsService.fetchTranscripts.mockResolvedValue(mockTranscriptData);
      mockDatabaseService.fetchTranscripts.mockResolvedValue([mockTranscriptData[0]]); // Only first record

      const result = await migrationUtils.validateMigration();

      expect(result.isValid).toBe(false);
      expect(result.sheetsCount).toBe(2);
      expect(result.databaseCount).toBe(1);
      expect(result.missingInDatabase).toHaveLength(1);
      expect(result.missingInDatabase[0]).toEqual(mockTranscriptData[1]);
    });

    it('should handle validation errors', async () => {
      mockGoogleSheetsService.fetchTranscripts.mockRejectedValue(new Error('Sheets API error'));

      const result = await migrationUtils.validateMigration();

      expect(result.isValid).toBe(false);
      expect(result.sheetsCount).toBe(0);
      expect(result.databaseCount).toBe(0);
      expect(result.errors).toContain('Sheets API error');
    });
  });

  describe('data validation', () => {
    it('should validate correct transcript data', async () => {
      const validData = mockTranscriptData;
      const errors = (migrationUtils as any).validateTranscriptData(validData);

      expect(errors).toHaveLength(0);
    });

    it('should detect invalid client names', async () => {
      const invalidData = [
        { clientName: '', month: '2024-01', transcriptCount: 10 },
        { clientName: '   ', month: '2024-01', transcriptCount: 10 }
      ];
      const errors = (migrationUtils as any).validateTranscriptData(invalidData);

      expect(errors).toContain('Record 1: Client name is required');
      expect(errors).toContain('Record 2: Client name is required');
    });

    it('should detect invalid month formats', async () => {
      const invalidData = [
        { clientName: 'Client A', month: '2024', transcriptCount: 10 },
        { clientName: 'Client B', month: '24-01', transcriptCount: 10 },
        { clientName: 'Client C', month: 'January 2024', transcriptCount: 10 }
      ];
      const errors = (migrationUtils as any).validateTranscriptData(invalidData);

      expect(errors).toContain('Record 1: Month must be in YYYY-MM format');
      expect(errors).toContain('Record 2: Month must be in YYYY-MM format');
      expect(errors).toContain('Record 3: Month must be in YYYY-MM format');
    });

    it('should detect invalid transcript counts', async () => {
      const invalidData = [
        { clientName: 'Client A', month: '2024-01', transcriptCount: -5 },
        { clientName: 'Client B', month: '2024-01', transcriptCount: 'invalid' as any }
      ];
      const errors = (migrationUtils as any).validateTranscriptData(invalidData);

      expect(errors).toContain('Record 1: Transcript count must be a non-negative number');
      expect(errors).toContain('Record 2: Transcript count must be a non-negative number');
    });
  });

  describe('format conversion', () => {
    it('should parse month from API format correctly', async () => {
      const date = (migrationUtils as any).parseMonthFromApi('2024-01');
      expect(date).toEqual(new Date(2024, 0, 1)); // January 1, 2024
    });

    it('should format month for API correctly', async () => {
      const formatted = (migrationUtils as any).formatMonthForApi(new Date(2024, 0, 1));
      expect(formatted).toBe('2024-01');
    });

    it('should handle month formatting edge cases', async () => {
      const formatted = (migrationUtils as any).formatMonthForApi(new Date(2024, 11, 1));
      expect(formatted).toBe('2024-12');
    });
  });
});