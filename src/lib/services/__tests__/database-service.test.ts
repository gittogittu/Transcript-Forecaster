import { DatabaseService } from '../database-service';
import { TranscriptData } from '@/types/transcript';
import { Pool } from 'pg';

// Mock pg Pool
jest.mock('pg', () => ({
  Pool: jest.fn().mockImplementation(() => ({
    query: jest.fn(),
    connect: jest.fn(),
    end: jest.fn()
  }))
}));

// Mock database connection
jest.mock('@/lib/database/connection', () => ({
  getDatabasePool: jest.fn()
}));

describe('DatabaseService', () => {
  let databaseService: DatabaseService;
  let mockPool: jest.Mocked<Pool>;
  let mockClient: any;

  beforeEach(() => {
    mockClient = {
      query: jest.fn(),
      release: jest.fn()
    };

    mockPool = {
      query: jest.fn(),
      connect: jest.fn().mockResolvedValue(mockClient),
      end: jest.fn()
    } as any;

    databaseService = new DatabaseService(mockPool);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchTranscripts', () => {
    it('should fetch and format transcript data correctly', async () => {
      const mockRows = [
        {
          client_name: 'Client A',
          month: new Date('2024-01-01'),
          count: 10,
          notes: 'Test note',
          created_at: new Date('2024-01-01'),
          updated_at: new Date('2024-01-01')
        }
      ];

      mockPool.query.mockResolvedValue({ rows: mockRows });

      const result = await databaseService.fetchTranscripts();

      expect(result).toEqual([
        {
          clientName: 'Client A',
          month: '2024-01',
          transcriptCount: 10,
          notes: 'Test note',
          createdAt: mockRows[0].created_at,
          updatedAt: mockRows[0].updated_at
        }
      ]);

      expect(mockPool.query).toHaveBeenCalledWith(expect.stringContaining('SELECT'));
    });

    it('should handle empty results', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await databaseService.fetchTranscripts();

      expect(result).toEqual([]);
    });

    it('should handle database errors', async () => {
      mockPool.query.mockRejectedValue(new Error('Database error'));

      await expect(databaseService.fetchTranscripts()).rejects.toThrow('Database error');
    });
  });

  describe('addTranscript', () => {
    const mockTranscriptData: TranscriptData = {
      clientName: 'Client A',
      month: '2024-01',
      transcriptCount: 10,
      notes: 'Test note'
    };

    it('should add transcript data successfully', async () => {
      // Mock client queries
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 'client-id' }] }) // Get existing client
        .mockResolvedValueOnce({ rows: [] }) // Insert transcript
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      await databaseService.addTranscript(mockTranscriptData);

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should create new client if not exists', async () => {
      // Mock client queries
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // Get existing client (not found)
        .mockResolvedValueOnce({ rows: [{ id: 'new-client-id' }] }) // Create new client
        .mockResolvedValueOnce({ rows: [] }) // Insert transcript
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      await databaseService.addTranscript(mockTranscriptData);

      expect(mockClient.query).toHaveBeenCalledWith(
        'INSERT INTO clients (name) VALUES ($1) RETURNING id',
        ['Client A']
      );
    });

    it('should rollback on error', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockRejectedValueOnce(new Error('Database error')); // Error on next query

      await expect(databaseService.addTranscript(mockTranscriptData)).rejects.toThrow('Database error');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('updateTranscript', () => {
    it('should update transcript data successfully', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 'client-id' }] }) // Get client
        .mockResolvedValueOnce({ rowCount: 1 }) // Update transcript
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      await databaseService.updateTranscript('Client A', '2024-01', { transcriptCount: 15 });

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should throw error if client not found', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [] }); // Get client (not found)

      await expect(
        databaseService.updateTranscript('Nonexistent Client', '2024-01', { transcriptCount: 15 })
      ).rejects.toThrow('Client not found: Nonexistent Client');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should throw error if transcript not found', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 'client-id' }] }) // Get client
        .mockResolvedValueOnce({ rowCount: 0 }); // Update transcript (not found)

      await expect(
        databaseService.updateTranscript('Client A', '2024-01', { transcriptCount: 15 })
      ).rejects.toThrow('Transcript not found for client Client A and month 2024-01');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('deleteTranscript', () => {
    it('should delete transcript successfully', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 'client-id' }] }) // Get client
        .mockResolvedValueOnce({ rowCount: 1 }) // Delete transcript
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      await databaseService.deleteTranscript('Client A', '2024-01');

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should throw error if client not found', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [] }); // Get client (not found)

      await expect(
        databaseService.deleteTranscript('Nonexistent Client', '2024-01')
      ).rejects.toThrow('Client not found: Nonexistent Client');
    });

    it('should throw error if transcript not found', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 'client-id' }] }) // Get client
        .mockResolvedValueOnce({ rowCount: 0 }); // Delete transcript (not found)

      await expect(
        databaseService.deleteTranscript('Client A', '2024-01')
      ).rejects.toThrow('Transcript not found for client Client A and month 2024-01');
    });
  });

  describe('getClients', () => {
    it('should fetch all clients', async () => {
      const mockRows = [
        {
          id: 'client-1',
          name: 'Client A',
          created_at: new Date('2024-01-01'),
          updated_at: new Date('2024-01-01')
        }
      ];

      mockPool.query.mockResolvedValue({ rows: mockRows });

      const result = await databaseService.getClients();

      expect(result).toEqual([
        {
          id: 'client-1',
          name: 'Client A',
          createdAt: mockRows[0].created_at,
          updatedAt: mockRows[0].updated_at
        }
      ]);
    });
  });

  describe('getTranscriptsByClient', () => {
    it('should fetch transcripts for specific client', async () => {
      const mockRows = [
        {
          month: new Date('2024-01-01'),
          transcript_count: 10,
          notes: 'Test note',
          created_at: new Date('2024-01-01'),
          updated_at: new Date('2024-01-01')
        }
      ];

      mockPool.query.mockResolvedValue({ rows: mockRows });

      const result = await databaseService.getTranscriptsByClient('Client A');

      expect(result).toEqual([
        {
          clientName: 'Client A',
          month: '2024-01',
          transcriptCount: 10,
          notes: 'Test note',
          createdAt: mockRows[0].created_at,
          updatedAt: mockRows[0].updated_at
        }
      ]);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE c.name = $1'),
        ['Client A']
      );
    });
  });

  describe('healthCheck', () => {
    it('should return true when database is healthy', async () => {
      mockPool.query.mockResolvedValue({ rows: [{ '?column?': 1 }] });

      const result = await databaseService.healthCheck();

      expect(result).toBe(true);
      expect(mockPool.query).toHaveBeenCalledWith('SELECT 1');
    });

    it('should return false when database is unhealthy', async () => {
      mockPool.query.mockRejectedValue(new Error('Connection failed'));

      const result = await databaseService.healthCheck();

      expect(result).toBe(false);
    });
  });

  describe('syncWithSheets', () => {
    it('should complete without error', async () => {
      await expect(databaseService.syncWithSheets()).resolves.toBeUndefined();
    });
  });

  describe('close', () => {
    it('should close the pool', async () => {
      await databaseService.close();

      expect(mockPool.end).toHaveBeenCalled();
    });
  });
});