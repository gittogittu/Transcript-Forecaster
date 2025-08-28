import { DataPreprocessor, PreprocessingOptions } from '../data-preprocessing';
import { TranscriptData } from '@/types/transcript';

describe('DataPreprocessor', () => {
  let mockData: TranscriptData[];

  beforeEach(() => {
    mockData = [
      {
        id: '1',
        clientName: 'Client A',
        date: new Date('2024-01-01'),
        transcriptCount: 10,
        transcriptType: 'type1',
        notes: '',
        createdAt: new Date('2024-01-01T10:00:00Z'),
        updatedAt: new Date('2024-01-01T10:00:00Z'),
        createdBy: 'user1'
      },
      {
        id: '2',
        clientName: 'Client A',
        date: new Date('2024-01-02'),
        transcriptCount: 15,
        transcriptType: 'type1',
        notes: '',
        createdAt: new Date('2024-01-02T10:00:00Z'),
        updatedAt: new Date('2024-01-02T10:00:00Z'),
        createdBy: 'user1'
      },
      {
        id: '3',
        clientName: 'Client A',
        date: new Date('2024-01-03'),
        transcriptCount: 20,
        transcriptType: 'type1',
        notes: '',
        createdAt: new Date('2024-01-03T10:00:00Z'),
        updatedAt: new Date('2024-01-03T10:00:00Z'),
        createdBy: 'user1'
      },
      {
        id: '4',
        clientName: 'Client A',
        date: new Date('2024-01-04'),
        transcriptCount: 100, // Outlier
        transcriptType: 'type1',
        notes: '',
        createdAt: new Date('2024-01-04T10:00:00Z'),
        updatedAt: new Date('2024-01-04T10:00:00Z'),
        createdBy: 'user1'
      },
      {
        id: '5',
        clientName: 'Client A',
        date: new Date('2024-01-05'),
        transcriptCount: 18,
        transcriptType: 'type1',
        notes: '',
        createdAt: new Date('2024-01-05T10:00:00Z'),
        updatedAt: new Date('2024-01-05T10:00:00Z'),
        createdBy: 'user1'
      },
      {
        id: '6',
        clientName: 'Client B',
        date: new Date('2024-01-01'),
        transcriptCount: 5,
        transcriptType: 'type2',
        notes: '',
        createdAt: new Date('2024-01-01T11:00:00Z'),
        updatedAt: new Date('2024-01-01T11:00:00Z'),
        createdBy: 'user1'
      },
      // Duplicate entry (same client and date)
      {
        id: '7',
        clientName: 'Client A',
        date: new Date('2024-01-01'),
        transcriptCount: 12,
        transcriptType: 'type1',
        notes: 'Updated entry',
        createdAt: new Date('2024-01-01T12:00:00Z'),
        updatedAt: new Date('2024-01-01T12:00:00Z'),
        createdBy: 'user1'
      }
    ];
  });

  describe('analyzeDataQuality', () => {
    it('should analyze data quality correctly', () => {
      const report = DataPreprocessor.analyzeDataQuality(mockData);

      expect(report.totalRecords).toBe(7);
      expect(report.duplicates).toBe(1); // One duplicate for Client A on 2024-01-01
      expect(report.outliers).toBeGreaterThan(0); // Should detect the value 100 as outlier
      expect(report.dataRange.startDate).toEqual(new Date('2024-01-01'));
      expect(report.dataRange.endDate).toEqual(new Date('2024-01-05'));
      expect(report.dataRange.daysCovered).toBe(4);
      expect(report.statistics.mean).toBeGreaterThan(0);
      expect(report.statistics.min).toBe(5);
      expect(report.statistics.max).toBe(100);
      expect(report.recommendations).toBeDefined();
      expect(Array.isArray(report.recommendations)).toBe(true);
    });

    it('should detect missing values', () => {
      const dataWithMissing = [...mockData];
      dataWithMissing[0].transcriptCount = null as any;
      dataWithMissing[1].transcriptCount = undefined as any;

      const report = DataPreprocessor.analyzeDataQuality(dataWithMissing);

      expect(report.missingValues).toBe(2);
      expect(report.recommendations).toContain(
        expect.stringContaining('missing values')
      );
    });

    it('should calculate statistics correctly', () => {
      const simpleData = [
        { ...mockData[0], transcriptCount: 10 },
        { ...mockData[1], transcriptCount: 20 },
        { ...mockData[2], transcriptCount: 30 }
      ];

      const report = DataPreprocessor.analyzeDataQuality(simpleData);

      expect(report.statistics.mean).toBe(20);
      expect(report.statistics.median).toBe(20);
      expect(report.statistics.min).toBe(10);
      expect(report.statistics.max).toBe(30);
    });

    it('should throw error for empty dataset', () => {
      expect(() => DataPreprocessor.analyzeDataQuality([])).toThrow('Cannot analyze empty dataset');
    });

    it('should generate appropriate recommendations', () => {
      const smallDataset = mockData.slice(0, 2);
      const report = DataPreprocessor.analyzeDataQuality(smallDataset);

      expect(report.recommendations).toContain(
        expect.stringContaining('Consider collecting more data')
      );
    });
  });

  describe('preprocessData', () => {
    const defaultOptions: PreprocessingOptions = {
      fillMissingValues: false,
      removeDuplicates: false,
      handleOutliers: 'keep'
    };

    it('should remove duplicates when option is enabled', () => {
      const options: PreprocessingOptions = {
        ...defaultOptions,
        removeDuplicates: true
      };

      const processed = DataPreprocessor.preprocessData(mockData, options);

      // Should have one less record due to duplicate removal
      expect(processed.length).toBe(6);
      
      // Should keep the more recent duplicate (id: '7')
      const clientAJan1 = processed.filter(d => 
        d.clientName === 'Client A' && 
        new Date(d.date).toDateString() === new Date('2024-01-01').toDateString()
      );
      expect(clientAJan1).toHaveLength(1);
      expect(clientAJan1[0].transcriptCount).toBe(12); // The updated value
    });

    it('should fill missing values when option is enabled', () => {
      const dataWithMissing = [...mockData];
      dataWithMissing[1].transcriptCount = null as any;
      dataWithMissing[2].transcriptCount = undefined as any;

      const options: PreprocessingOptions = {
        ...defaultOptions,
        fillMissingValues: true
      };

      const processed = DataPreprocessor.preprocessData(dataWithMissing, options);

      // All records should have valid transcript counts
      processed.forEach(record => {
        expect(record.transcriptCount).not.toBeNull();
        expect(record.transcriptCount).not.toBeUndefined();
        expect(isNaN(record.transcriptCount)).toBe(false);
        expect(record.transcriptCount).toBeGreaterThanOrEqual(0);
      });
    });

    it('should remove outliers when option is set to remove', () => {
      const options: PreprocessingOptions = {
        ...defaultOptions,
        handleOutliers: 'remove'
      };

      const processed = DataPreprocessor.preprocessData(mockData, options);

      // Should have fewer records due to outlier removal
      expect(processed.length).toBeLessThan(mockData.length);
      
      // The outlier value (100) should be removed
      const hasOutlier = processed.some(d => d.transcriptCount === 100);
      expect(hasOutlier).toBe(false);
    });

    it('should cap outliers when option is set to cap', () => {
      const options: PreprocessingOptions = {
        ...defaultOptions,
        handleOutliers: 'cap'
      };

      const processed = DataPreprocessor.preprocessData(mockData, options);

      // Should have same number of records
      expect(processed.length).toBe(mockData.length);
      
      // The outlier should be capped, not removed
      const outlierRecord = processed.find(d => d.id === '4');
      expect(outlierRecord).toBeDefined();
      expect(outlierRecord!.transcriptCount).not.toBe(100);
      expect(outlierRecord!.transcriptCount).toBeLessThan(100);
    });

    it('should apply smoothing when window size is specified', () => {
      const options: PreprocessingOptions = {
        ...defaultOptions,
        smoothingWindow: 3
      };

      const processed = DataPreprocessor.preprocessData(mockData, options);

      // Should have same number of records
      expect(processed.length).toBe(mockData.length);
      
      // Values should be smoothed (less extreme)
      const originalOutlier = mockData.find(d => d.transcriptCount === 100);
      const smoothedOutlier = processed.find(d => d.id === originalOutlier!.id);
      expect(smoothedOutlier!.transcriptCount).toBeLessThan(100);
    });

    it('should aggregate by week when specified', () => {
      const options: PreprocessingOptions = {
        ...defaultOptions,
        aggregationPeriod: 'weekly'
      };

      const processed = DataPreprocessor.preprocessData(mockData, options);

      // Should have fewer records due to weekly aggregation
      expect(processed.length).toBeLessThan(mockData.length);
      
      // Each client should have at most one record per week
      const clientARecords = processed.filter(d => d.clientName === 'Client A');
      expect(clientARecords.length).toBeLessThanOrEqual(2); // All data is within one week
    });

    it('should aggregate by month when specified', () => {
      const options: PreprocessingOptions = {
        ...defaultOptions,
        aggregationPeriod: 'monthly'
      };

      const processed = DataPreprocessor.preprocessData(mockData, options);

      // Should have fewer records due to monthly aggregation
      expect(processed.length).toBeLessThan(mockData.length);
      
      // Each client should have at most one record per month
      const clientARecords = processed.filter(d => d.clientName === 'Client A');
      expect(clientARecords.length).toBe(1); // All data is within January 2024
    });

    it('should apply multiple preprocessing steps', () => {
      const dataWithIssues = [...mockData];
      dataWithIssues[1].transcriptCount = null as any; // Add missing value

      const options: PreprocessingOptions = {
        fillMissingValues: true,
        removeDuplicates: true,
        handleOutliers: 'cap',
        smoothingWindow: 3
      };

      const processed = DataPreprocessor.preprocessData(dataWithIssues, options);

      // Should handle all issues
      expect(processed.length).toBeLessThan(dataWithIssues.length); // Duplicates removed
      processed.forEach(record => {
        expect(record.transcriptCount).not.toBeNull();
        expect(record.transcriptCount).not.toBeUndefined();
        expect(isNaN(record.transcriptCount)).toBe(false);
      });
    });
  });

  describe('findMissingDateRanges', () => {
    it('should find missing date ranges', () => {
      const dataWithGaps = [
        { ...mockData[0], date: new Date('2024-01-01') },
        { ...mockData[1], date: new Date('2024-01-05') }, // Gap from 2-4
        { ...mockData[2], date: new Date('2024-01-10') }  // Gap from 6-9
      ];

      const missingRanges = DataPreprocessor.findMissingDateRanges(dataWithGaps);

      expect(missingRanges).toHaveLength(2);
      expect(missingRanges[0].start.toDateString()).toBe(new Date('2024-01-02').toDateString());
      expect(missingRanges[0].end.toDateString()).toBe(new Date('2024-01-04').toDateString());
      expect(missingRanges[1].start.toDateString()).toBe(new Date('2024-01-06').toDateString());
      expect(missingRanges[1].end.toDateString()).toBe(new Date('2024-01-09').toDateString());
    });

    it('should find missing ranges for specific client', () => {
      const mixedData = [
        { ...mockData[0], clientName: 'Client A', date: new Date('2024-01-01') },
        { ...mockData[1], clientName: 'Client B', date: new Date('2024-01-02') },
        { ...mockData[2], clientName: 'Client A', date: new Date('2024-01-05') }
      ];

      const missingRanges = DataPreprocessor.findMissingDateRanges(mixedData, 'Client A');

      expect(missingRanges).toHaveLength(1);
      expect(missingRanges[0].start.toDateString()).toBe(new Date('2024-01-02').toDateString());
      expect(missingRanges[0].end.toDateString()).toBe(new Date('2024-01-04').toDateString());
    });

    it('should return empty array for consecutive dates', () => {
      const consecutiveData = [
        { ...mockData[0], date: new Date('2024-01-01') },
        { ...mockData[1], date: new Date('2024-01-02') },
        { ...mockData[2], date: new Date('2024-01-03') }
      ];

      const missingRanges = DataPreprocessor.findMissingDateRanges(consecutiveData);

      expect(missingRanges).toHaveLength(0);
    });

    it('should return empty array for insufficient data', () => {
      const singleRecord = [mockData[0]];
      const missingRanges = DataPreprocessor.findMissingDateRanges(singleRecord);

      expect(missingRanges).toHaveLength(0);
    });
  });

  describe('edge cases', () => {
    it('should handle data with all same values', () => {
      const constantData = mockData.map(d => ({ ...d, transcriptCount: 15 }));
      const report = DataPreprocessor.analyzeDataQuality(constantData);

      expect(report.statistics.mean).toBe(15);
      expect(report.statistics.std).toBe(0);
      expect(report.outliers).toBe(0);
    });

    it('should handle single record', () => {
      const singleRecord = [mockData[0]];
      const report = DataPreprocessor.analyzeDataQuality(singleRecord);

      expect(report.totalRecords).toBe(1);
      expect(report.duplicates).toBe(0);
      expect(report.outliers).toBe(0);
      expect(report.statistics.mean).toBe(10);
      expect(report.statistics.median).toBe(10);
    });

    it('should handle preprocessing with no changes needed', () => {
      const cleanData = mockData.slice(0, 3); // No duplicates, outliers, or missing values
      const options: PreprocessingOptions = {
        fillMissingValues: true,
        removeDuplicates: true,
        handleOutliers: 'remove'
      };

      const processed = DataPreprocessor.preprocessData(cleanData, options);

      expect(processed.length).toBe(3);
      expect(processed).toEqual(expect.arrayContaining(cleanData));
    });

    it('should handle extreme outliers correctly', () => {
      const dataWithExtremes = [
        { ...mockData[0], transcriptCount: 1 },
        { ...mockData[1], transcriptCount: 2 },
        { ...mockData[2], transcriptCount: 1000000 } // Extreme outlier
      ];

      const report = DataPreprocessor.analyzeDataQuality(dataWithExtremes);

      expect(report.outliers).toBeGreaterThan(0);
      expect(report.recommendations).toContain(
        expect.stringContaining('outliers')
      );
    });
  });
});