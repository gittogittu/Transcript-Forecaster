import { TranscriptData } from '@/types/transcript';
import { GoogleSheetsService } from '@/lib/services/google-sheets';
import { DatabaseService } from '@/lib/services/database-service';
import fs from 'fs/promises';
import path from 'path';

export interface MigrationReport {
  totalRecords: number;
  successfulRecords: number;
  failedRecords: number;
  errors: string[];
  startTime: Date;
  endTime: Date;
  duration: number;
}

export interface ExportOptions {
  format: 'json' | 'csv';
  outputPath?: string;
  includeMetadata?: boolean;
}

export interface ImportOptions {
  format: 'json' | 'csv';
  inputPath: string;
  validateData?: boolean;
  skipDuplicates?: boolean;
}

export class MigrationUtilities {
  private googleSheetsService: GoogleSheetsService;
  private databaseService: DatabaseService;

  constructor() {
    this.googleSheetsService = new GoogleSheetsService();
    this.databaseService = new DatabaseService();
  }

  /**
   * Export data from Google Sheets to file
   */
  async exportFromGoogleSheets(options: ExportOptions): Promise<MigrationReport> {
    const startTime = new Date();
    const report: MigrationReport = {
      totalRecords: 0,
      successfulRecords: 0,
      failedRecords: 0,
      errors: [],
      startTime,
      endTime: new Date(),
      duration: 0
    };

    try {
      // Fetch data from Google Sheets
      const data = await this.googleSheetsService.fetchTranscripts();
      report.totalRecords = data.length;

      // Prepare output path
      const outputPath = options.outputPath || this.getDefaultExportPath(options.format);
      
      // Export based on format
      if (options.format === 'json') {
        await this.exportToJson(data, outputPath, options.includeMetadata);
      } else if (options.format === 'csv') {
        await this.exportToCsv(data, outputPath);
      }

      report.successfulRecords = data.length;
    } catch (error) {
      report.errors.push(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      report.failedRecords = report.totalRecords;
    }

    report.endTime = new Date();
    report.duration = report.endTime.getTime() - report.startTime.getTime();

    return report;
  }

  /**
   * Import data from file to database
   */
  async importToDatabase(options: ImportOptions): Promise<MigrationReport> {
    const startTime = new Date();
    const report: MigrationReport = {
      totalRecords: 0,
      successfulRecords: 0,
      failedRecords: 0,
      errors: [],
      startTime,
      endTime: new Date(),
      duration: 0
    };

    try {
      // Load data from file
      let data: TranscriptData[];
      
      if (options.format === 'json') {
        data = await this.loadFromJson(options.inputPath);
      } else if (options.format === 'csv') {
        data = await this.loadFromCsv(options.inputPath);
      } else {
        throw new Error(`Unsupported format: ${options.format}`);
      }

      report.totalRecords = data.length;

      // Validate data if requested
      if (options.validateData) {
        const validationErrors = this.validateTranscriptData(data);
        if (validationErrors.length > 0) {
          report.errors.push(...validationErrors);
          report.failedRecords = data.length;
          report.endTime = new Date();
          report.duration = report.endTime.getTime() - report.startTime.getTime();
          return report;
        }
      }

      // Import data to database
      for (const record of data) {
        try {
          await this.databaseService.addTranscript(record);
          report.successfulRecords++;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          
          if (options.skipDuplicates && errorMessage.includes('duplicate')) {
            // Skip duplicates silently
            report.successfulRecords++;
          } else {
            report.errors.push(`Failed to import record for ${record.clientName} ${record.month}: ${errorMessage}`);
            report.failedRecords++;
          }
        }
      }
    } catch (error) {
      report.errors.push(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      report.failedRecords = report.totalRecords;
    }

    report.endTime = new Date();
    report.duration = report.endTime.getTime() - report.startTime.getTime();

    return report;
  }

  /**
   * Migrate data directly from Google Sheets to Database
   */
  async migrateFromSheetsToDatabase(options?: {
    validateData?: boolean;
    skipDuplicates?: boolean;
  }): Promise<MigrationReport> {
    const startTime = new Date();
    const report: MigrationReport = {
      totalRecords: 0,
      successfulRecords: 0,
      failedRecords: 0,
      errors: [],
      startTime,
      endTime: new Date(),
      duration: 0
    };

    try {
      // Fetch data from Google Sheets
      const data = await this.googleSheetsService.fetchTranscripts();
      report.totalRecords = data.length;

      // Validate data if requested
      if (options?.validateData) {
        const validationErrors = this.validateTranscriptData(data);
        if (validationErrors.length > 0) {
          report.errors.push(...validationErrors);
          report.failedRecords = data.length;
          report.endTime = new Date();
          report.duration = report.endTime.getTime() - report.startTime.getTime();
          return report;
        }
      }

      // Import data to database
      for (const record of data) {
        try {
          await this.databaseService.addTranscript(record);
          report.successfulRecords++;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          
          if (options?.skipDuplicates && errorMessage.includes('duplicate')) {
            // Skip duplicates silently
            report.successfulRecords++;
          } else {
            report.errors.push(`Failed to migrate record for ${record.clientName} ${record.month}: ${errorMessage}`);
            report.failedRecords++;
          }
        }
      }
    } catch (error) {
      report.errors.push(`Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      report.failedRecords = report.totalRecords;
    }

    report.endTime = new Date();
    report.duration = report.endTime.getTime() - report.startTime.getTime();

    return report;
  }

  /**
   * Validate migration by comparing data between sources
   */
  async validateMigration(): Promise<{
    isValid: boolean;
    sheetsCount: number;
    databaseCount: number;
    missingInDatabase: TranscriptData[];
    errors: string[];
  }> {
    try {
      const sheetsData = await this.googleSheetsService.fetchTranscripts();
      const databaseData = await this.databaseService.fetchTranscripts();

      const sheetsMap = new Map<string, TranscriptData>();
      sheetsData.forEach(record => {
        const key = `${record.clientName}-${record.month}`;
        sheetsMap.set(key, record);
      });

      const databaseMap = new Map<string, TranscriptData>();
      databaseData.forEach(record => {
        const key = `${record.clientName}-${record.month}`;
        databaseMap.set(key, record);
      });

      const missingInDatabase: TranscriptData[] = [];
      for (const [key, record] of sheetsMap) {
        if (!databaseMap.has(key)) {
          missingInDatabase.push(record);
        }
      }

      return {
        isValid: missingInDatabase.length === 0,
        sheetsCount: sheetsData.length,
        databaseCount: databaseData.length,
        missingInDatabase,
        errors: []
      };
    } catch (error) {
      return {
        isValid: false,
        sheetsCount: 0,
        databaseCount: 0,
        missingInDatabase: [],
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Export data to JSON format
   */
  private async exportToJson(data: TranscriptData[], outputPath: string, includeMetadata?: boolean): Promise<void> {
    const exportData = {
      metadata: includeMetadata ? {
        exportDate: new Date().toISOString(),
        recordCount: data.length,
        source: 'google-sheets'
      } : undefined,
      data
    };

    await fs.writeFile(outputPath, JSON.stringify(exportData, null, 2), 'utf-8');
  }

  /**
   * Export data to CSV format
   */
  private async exportToCsv(data: TranscriptData[], outputPath: string): Promise<void> {
    const headers = ['clientName', 'month', 'transcriptCount', 'notes', 'createdAt', 'updatedAt'];
    const csvContent = [
      headers.join(','),
      ...data.map(record => [
        `"${record.clientName}"`,
        record.month,
        record.transcriptCount,
        `"${record.notes || ''}"`,
        record.createdAt ? new Date(record.createdAt).toISOString() : '',
        record.updatedAt ? new Date(record.updatedAt).toISOString() : ''
      ].join(','))
    ].join('\n');

    await fs.writeFile(outputPath, csvContent, 'utf-8');
  }

  /**
   * Load data from JSON file
   */
  private async loadFromJson(inputPath: string): Promise<TranscriptData[]> {
    const content = await fs.readFile(inputPath, 'utf-8');
    const parsed = JSON.parse(content);
    
    // Handle both direct array and object with data property
    return Array.isArray(parsed) ? parsed : parsed.data || [];
  }

  /**
   * Load data from CSV file
   */
  private async loadFromCsv(inputPath: string): Promise<TranscriptData[]> {
    const content = await fs.readFile(inputPath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      throw new Error('CSV file must have at least a header and one data row');
    }

    const headers = lines[0].split(',').map(h => h.replace(/"/g, ''));
    const data: TranscriptData[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.replace(/"/g, ''));
      const record: any = {};

      headers.forEach((header, index) => {
        const value = values[index] || '';
        
        switch (header) {
          case 'transcriptCount':
            record[header] = parseInt(value) || 0;
            break;
          case 'createdAt':
          case 'updatedAt':
            record[header] = value ? new Date(value) : undefined;
            break;
          default:
            record[header] = value;
        }
      });

      data.push(record as TranscriptData);
    }

    return data;
  }

  /**
   * Validate transcript data
   */
  private validateTranscriptData(data: TranscriptData[]): string[] {
    const errors: string[] = [];

    data.forEach((record, index) => {
      if (!record.clientName || record.clientName.trim() === '') {
        errors.push(`Record ${index + 1}: Client name is required`);
      }

      if (!record.month || !/^\d{4}-\d{2}$/.test(record.month)) {
        errors.push(`Record ${index + 1}: Month must be in YYYY-MM format`);
      }

      if (typeof record.transcriptCount !== 'number' || record.transcriptCount < 0) {
        errors.push(`Record ${index + 1}: Transcript count must be a non-negative number`);
      }
    });

    return errors;
  }

  /**
   * Get default export path
   */
  private getDefaultExportPath(format: 'json' | 'csv'): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `transcript-export-${timestamp}.${format}`;
    return path.join(process.cwd(), 'exports', filename);
  }
}