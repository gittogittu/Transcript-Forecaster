import { TranscriptData } from '@/types/transcript';
import { GoogleSheetsService } from './google-sheets';
import { DatabaseService } from './database-service';
import { getDataSourceConfig, validateDataSourceConfig } from '@/lib/config/data-source';

export interface DataService {
  fetchTranscripts(): Promise<TranscriptData[]>;
  addTranscript(data: TranscriptData): Promise<void>;
  updateTranscript(clientName: string, month: string, data: Partial<TranscriptData>): Promise<void>;
  deleteTranscript(clientName: string, month: string): Promise<void>;
  syncWithSheets(): Promise<void>;
  healthCheck(): Promise<boolean>;
}

export class DataServiceFactory {
  private static instance: DataService | null = null;

  /**
   * Get the configured data service instance
   */
  static getInstance(): DataService {
    if (!this.instance) {
      this.instance = this.createDataService();
    }
    return this.instance;
  }

  /**
   * Create a new data service instance based on configuration
   */
  static createDataService(): DataService {
    const config = getDataSourceConfig();
    const errors = validateDataSourceConfig(config);

    if (errors.length > 0) {
      throw new Error(`Invalid data source configuration: ${errors.join(', ')}`);
    }

    switch (config.type) {
      case 'google-sheets':
        return new GoogleSheetsService();
      
      case 'database':
        return new DatabaseService();
      
      default:
        throw new Error(`Unsupported data source type: ${config.type}`);
    }
  }

  /**
   * Reset the singleton instance (useful for testing)
   */
  static resetInstance(): void {
    this.instance = null;
  }

  /**
   * Get the current data source type
   */
  static getDataSourceType(): string {
    return getDataSourceConfig().type;
  }

  /**
   * Check if the current data source is available
   */
  static async isDataSourceAvailable(): Promise<boolean> {
    try {
      const service = this.getInstance();
      return await service.healthCheck();
    } catch (error) {
      console.error('Data source availability check failed:', error);
      return false;
    }
  }
}

// Adapter class to ensure Google Sheets service implements the DataService interface
class GoogleSheetsServiceAdapter implements DataService {
  private googleSheetsService: GoogleSheetsService;

  constructor() {
    this.googleSheetsService = new GoogleSheetsService();
  }

  async fetchTranscripts(): Promise<TranscriptData[]> {
    return this.googleSheetsService.fetchTranscripts();
  }

  async addTranscript(data: TranscriptData): Promise<void> {
    return this.googleSheetsService.addTranscript(data);
  }

  async updateTranscript(clientName: string, month: string, data: Partial<TranscriptData>): Promise<void> {
    // Google Sheets service might not have this exact signature, so we adapt it
    const fullData = { ...data, clientName, month } as TranscriptData;
    return this.googleSheetsService.addTranscript(fullData); // This will update if exists
  }

  async deleteTranscript(clientName: string, month: string): Promise<void> {
    // Google Sheets service might not support deletion, so we implement a workaround
    throw new Error('Delete operation not supported for Google Sheets data source');
  }

  async syncWithSheets(): Promise<void> {
    // This is a no-op for Google Sheets since it's already the source
    return Promise.resolve();
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.googleSheetsService.fetchTranscripts();
      return true;
    } catch (error) {
      return false;
    }
  }
}

// Update the factory to use the adapter
export class DataServiceFactoryWithAdapter {
  private static instance: DataService | null = null;

  static getInstance(): DataService {
    if (!this.instance) {
      this.instance = this.createDataService();
    }
    return this.instance;
  }

  static createDataService(): DataService {
    const config = getDataSourceConfig();
    const errors = validateDataSourceConfig(config);

    if (errors.length > 0) {
      throw new Error(`Invalid data source configuration: ${errors.join(', ')}`);
    }

    switch (config.type) {
      case 'google-sheets':
        return new GoogleSheetsServiceAdapter();
      
      case 'database':
        return new DatabaseService();
      
      default:
        throw new Error(`Unsupported data source type: ${config.type}`);
    }
  }

  static resetInstance(): void {
    this.instance = null;
  }

  static getDataSourceType(): string {
    return getDataSourceConfig().type;
  }

  static async isDataSourceAvailable(): Promise<boolean> {
    try {
      const service = this.getInstance();
      return await service.healthCheck();
    } catch (error) {
      console.error('Data source availability check failed:', error);
      return false;
    }
  }
}