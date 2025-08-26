import { DataServiceFactory, DataServiceFactoryWithAdapter } from '../data-service-factory';
import { GoogleSheetsService } from '../google-sheets';
import { DatabaseService } from '../database-service';
import * as dataSourceConfig from '@/lib/config/data-source';

// Mock the services
jest.mock('../google-sheets');
jest.mock('../database-service');
jest.mock('@/lib/config/data-source');

describe('DataServiceFactory', () => {
  let mockGetDataSourceConfig: jest.SpyInstance;
  let mockValidateDataSourceConfig: jest.SpyInstance;

  beforeEach(() => {
    mockGetDataSourceConfig = jest.spyOn(dataSourceConfig, 'getDataSourceConfig');
    mockValidateDataSourceConfig = jest.spyOn(dataSourceConfig, 'validateDataSourceConfig');
    
    // Reset singleton instance before each test
    DataServiceFactory.resetInstance();
    DataServiceFactoryWithAdapter.resetInstance();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createDataService', () => {
    it('should create GoogleSheetsService when configured for google-sheets', () => {
      mockGetDataSourceConfig.mockReturnValue({
        type: 'google-sheets',
        googleSheets: {
          spreadsheetId: 'test-id',
          sheetName: 'Test Sheet'
        }
      });
      mockValidateDataSourceConfig.mockReturnValue([]);

      const service = DataServiceFactory.createDataService();

      expect(service).toBeInstanceOf(GoogleSheetsService);
    });

    it('should create DatabaseService when configured for database', () => {
      mockGetDataSourceConfig.mockReturnValue({
        type: 'database',
        database: {
          host: 'localhost',
          port: 5432,
          database: 'test_db',
          user: 'test_user',
          password: 'test_pass'
        }
      });
      mockValidateDataSourceConfig.mockReturnValue([]);

      const service = DataServiceFactory.createDataService();

      expect(service).toBeInstanceOf(DatabaseService);
    });

    it('should throw error for invalid configuration', () => {
      mockGetDataSourceConfig.mockReturnValue({
        type: 'google-sheets',
        googleSheets: {
          spreadsheetId: '', // Invalid: empty spreadsheet ID
          sheetName: 'Test Sheet'
        }
      });
      mockValidateDataSourceConfig.mockReturnValue(['Google Sheets spreadsheet ID is required']);

      expect(() => DataServiceFactory.createDataService()).toThrow(
        'Invalid data source configuration: Google Sheets spreadsheet ID is required'
      );
    });

    it('should throw error for unsupported data source type', () => {
      mockGetDataSourceConfig.mockReturnValue({
        type: 'unsupported' as any
      });
      mockValidateDataSourceConfig.mockReturnValue([]);

      expect(() => DataServiceFactory.createDataService()).toThrow(
        'Unsupported data source type: unsupported'
      );
    });
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      mockGetDataSourceConfig.mockReturnValue({
        type: 'google-sheets',
        googleSheets: {
          spreadsheetId: 'test-id',
          sheetName: 'Test Sheet'
        }
      });
      mockValidateDataSourceConfig.mockReturnValue([]);

      const instance1 = DataServiceFactory.getInstance();
      const instance2 = DataServiceFactory.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('should create new instance after reset', () => {
      mockGetDataSourceConfig.mockReturnValue({
        type: 'google-sheets',
        googleSheets: {
          spreadsheetId: 'test-id',
          sheetName: 'Test Sheet'
        }
      });
      mockValidateDataSourceConfig.mockReturnValue([]);

      const instance1 = DataServiceFactory.getInstance();
      DataServiceFactory.resetInstance();
      const instance2 = DataServiceFactory.getInstance();

      expect(instance1).not.toBe(instance2);
    });
  });

  describe('getDataSourceType', () => {
    it('should return current data source type', () => {
      mockGetDataSourceConfig.mockReturnValue({
        type: 'database',
        database: {
          host: 'localhost',
          port: 5432,
          database: 'test_db',
          user: 'test_user',
          password: 'test_pass'
        }
      });

      const type = DataServiceFactory.getDataSourceType();

      expect(type).toBe('database');
    });
  });

  describe('isDataSourceAvailable', () => {
    it('should return true when data source is available', async () => {
      mockGetDataSourceConfig.mockReturnValue({
        type: 'google-sheets',
        googleSheets: {
          spreadsheetId: 'test-id',
          sheetName: 'Test Sheet'
        }
      });
      mockValidateDataSourceConfig.mockReturnValue([]);

      const mockService = {
        healthCheck: jest.fn().mockResolvedValue(true)
      };
      jest.spyOn(DataServiceFactory, 'getInstance').mockReturnValue(mockService as any);

      const isAvailable = await DataServiceFactory.isDataSourceAvailable();

      expect(isAvailable).toBe(true);
      expect(mockService.healthCheck).toHaveBeenCalled();
    });

    it('should return false when data source is not available', async () => {
      mockGetDataSourceConfig.mockReturnValue({
        type: 'google-sheets',
        googleSheets: {
          spreadsheetId: 'test-id',
          sheetName: 'Test Sheet'
        }
      });
      mockValidateDataSourceConfig.mockReturnValue([]);

      const mockService = {
        healthCheck: jest.fn().mockResolvedValue(false)
      };
      jest.spyOn(DataServiceFactory, 'getInstance').mockReturnValue(mockService as any);

      const isAvailable = await DataServiceFactory.isDataSourceAvailable();

      expect(isAvailable).toBe(false);
    });

    it('should return false when health check throws error', async () => {
      mockGetDataSourceConfig.mockReturnValue({
        type: 'google-sheets',
        googleSheets: {
          spreadsheetId: 'test-id',
          sheetName: 'Test Sheet'
        }
      });
      mockValidateDataSourceConfig.mockReturnValue([]);

      const mockService = {
        healthCheck: jest.fn().mockRejectedValue(new Error('Connection failed'))
      };
      jest.spyOn(DataServiceFactory, 'getInstance').mockReturnValue(mockService as any);

      const isAvailable = await DataServiceFactory.isDataSourceAvailable();

      expect(isAvailable).toBe(false);
    });

    it('should return false when getInstance throws error', async () => {
      mockGetDataSourceConfig.mockReturnValue({
        type: 'invalid' as any
      });
      mockValidateDataSourceConfig.mockReturnValue([]);

      jest.spyOn(DataServiceFactory, 'getInstance').mockImplementation(() => {
        throw new Error('Invalid configuration');
      });

      const isAvailable = await DataServiceFactory.isDataSourceAvailable();

      expect(isAvailable).toBe(false);
    });
  });
});

describe('DataServiceFactoryWithAdapter', () => {
  let mockGetDataSourceConfig: jest.SpyInstance;
  let mockValidateDataSourceConfig: jest.SpyInstance;

  beforeEach(() => {
    mockGetDataSourceConfig = jest.spyOn(dataSourceConfig, 'getDataSourceConfig');
    mockValidateDataSourceConfig = jest.spyOn(dataSourceConfig, 'validateDataSourceConfig');
    
    DataServiceFactoryWithAdapter.resetInstance();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GoogleSheetsServiceAdapter', () => {
    it('should create adapter for Google Sheets service', () => {
      mockGetDataSourceConfig.mockReturnValue({
        type: 'google-sheets',
        googleSheets: {
          spreadsheetId: 'test-id',
          sheetName: 'Test Sheet'
        }
      });
      mockValidateDataSourceConfig.mockReturnValue([]);

      const service = DataServiceFactoryWithAdapter.createDataService();

      // The adapter should implement the DataService interface
      expect(service).toHaveProperty('fetchTranscripts');
      expect(service).toHaveProperty('addTranscript');
      expect(service).toHaveProperty('updateTranscript');
      expect(service).toHaveProperty('deleteTranscript');
      expect(service).toHaveProperty('syncWithSheets');
      expect(service).toHaveProperty('healthCheck');
    });

    it('should throw error for delete operation on Google Sheets adapter', async () => {
      mockGetDataSourceConfig.mockReturnValue({
        type: 'google-sheets',
        googleSheets: {
          spreadsheetId: 'test-id',
          sheetName: 'Test Sheet'
        }
      });
      mockValidateDataSourceConfig.mockReturnValue([]);

      const service = DataServiceFactoryWithAdapter.createDataService();

      await expect(service.deleteTranscript('Client A', '2024-01')).rejects.toThrow(
        'Delete operation not supported for Google Sheets data source'
      );
    });
  });

  describe('DatabaseService integration', () => {
    it('should create DatabaseService directly for database type', () => {
      mockGetDataSourceConfig.mockReturnValue({
        type: 'database',
        database: {
          host: 'localhost',
          port: 5432,
          database: 'test_db',
          user: 'test_user',
          password: 'test_pass'
        }
      });
      mockValidateDataSourceConfig.mockReturnValue([]);

      const service = DataServiceFactoryWithAdapter.createDataService();

      expect(service).toBeInstanceOf(DatabaseService);
    });
  });
});