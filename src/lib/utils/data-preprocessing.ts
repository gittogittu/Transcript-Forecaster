import { TranscriptData } from '@/types/transcript';

export interface DataQualityReport {
  totalRecords: number;
  missingValues: number;
  duplicates: number;
  outliers: number;
  dataRange: {
    startDate: Date;
    endDate: Date;
    daysCovered: number;
  };
  statistics: {
    mean: number;
    median: number;
    std: number;
    min: number;
    max: number;
  };
  recommendations: string[];
}

export interface PreprocessingOptions {
  fillMissingValues: boolean;
  removeDuplicates: boolean;
  handleOutliers: 'remove' | 'cap' | 'keep';
  smoothingWindow?: number;
  aggregationPeriod?: 'daily' | 'weekly' | 'monthly';
}

export class DataPreprocessor {
  /**
   * Analyze data quality and generate report
   */
  public static analyzeDataQuality(data: TranscriptData[]): DataQualityReport {
    if (data.length === 0) {
      throw new Error('Cannot analyze empty dataset');
    }

    // Sort data by date
    const sortedData = [...data].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Count missing values (assuming null/undefined transcript counts)
    const missingValues = data.filter(d => 
      d.transcriptCount === null || 
      d.transcriptCount === undefined || 
      isNaN(d.transcriptCount)
    ).length;

    // Find duplicates (same client and date)
    const duplicates = this.findDuplicates(data);

    // Detect outliers
    const outliers = this.detectOutliers(data);

    // Calculate date range
    const startDate = new Date(sortedData[0].date);
    const endDate = new Date(sortedData[sortedData.length - 1].date);
    const daysCovered = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    // Calculate statistics
    const values = data
      .filter(d => d.transcriptCount !== null && d.transcriptCount !== undefined)
      .map(d => d.transcriptCount);
    
    const statistics = this.calculateStatistics(values);

    // Generate recommendations
    const recommendations = this.generateRecommendations({
      totalRecords: data.length,
      missingValues,
      duplicates: duplicates.length,
      outliers: outliers.length,
      daysCovered,
      statistics
    });

    return {
      totalRecords: data.length,
      missingValues,
      duplicates: duplicates.length,
      outliers: outliers.length,
      dataRange: {
        startDate,
        endDate,
        daysCovered
      },
      statistics,
      recommendations
    };
  }

  /**
   * Preprocess data according to options
   */
  public static preprocessData(
    data: TranscriptData[],
    options: PreprocessingOptions
  ): TranscriptData[] {
    let processedData = [...data];

    // Remove duplicates
    if (options.removeDuplicates) {
      processedData = this.removeDuplicates(processedData);
    }

    // Fill missing values
    if (options.fillMissingValues) {
      processedData = this.fillMissingValues(processedData);
    }

    // Handle outliers
    if (options.handleOutliers !== 'keep') {
      processedData = this.handleOutliers(processedData, options.handleOutliers);
    }

    // Apply smoothing
    if (options.smoothingWindow && options.smoothingWindow > 1) {
      processedData = this.applySmoothing(processedData, options.smoothingWindow);
    }

    // Aggregate by period
    if (options.aggregationPeriod && options.aggregationPeriod !== 'daily') {
      processedData = this.aggregateByPeriod(processedData, options.aggregationPeriod);
    }

    return processedData;
  }

  /**
   * Find duplicate records
   */
  private static findDuplicates(data: TranscriptData[]): TranscriptData[] {
    const seen = new Set<string>();
    const duplicates: TranscriptData[] = [];

    data.forEach(record => {
      const key = `${record.clientName}-${new Date(record.date).toISOString().split('T')[0]}`;
      if (seen.has(key)) {
        duplicates.push(record);
      } else {
        seen.add(key);
      }
    });

    return duplicates;
  }

  /**
   * Remove duplicate records (keep the latest one)
   */
  private static removeDuplicates(data: TranscriptData[]): TranscriptData[] {
    const uniqueRecords = new Map<string, TranscriptData>();

    data.forEach(record => {
      const key = `${record.clientName}-${new Date(record.date).toISOString().split('T')[0]}`;
      const existing = uniqueRecords.get(key);
      
      if (!existing || new Date(record.updatedAt) > new Date(existing.updatedAt)) {
        uniqueRecords.set(key, record);
      }
    });

    return Array.from(uniqueRecords.values());
  }

  /**
   * Fill missing values using interpolation
   */
  private static fillMissingValues(data: TranscriptData[]): TranscriptData[] {
    const sortedData = [...data].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    return sortedData.map((record, index) => {
      if (record.transcriptCount === null || 
          record.transcriptCount === undefined || 
          isNaN(record.transcriptCount)) {
        
        // Find nearest valid values
        const prevValid = this.findNearestValidValue(sortedData, index, -1);
        const nextValid = this.findNearestValidValue(sortedData, index, 1);

        let filledValue = 0;

        if (prevValid !== null && nextValid !== null) {
          // Linear interpolation
          filledValue = (prevValid + nextValid) / 2;
        } else if (prevValid !== null) {
          filledValue = prevValid;
        } else if (nextValid !== null) {
          filledValue = nextValid;
        } else {
          // Use overall mean as fallback
          const validValues = sortedData
            .filter(d => d.transcriptCount !== null && !isNaN(d.transcriptCount))
            .map(d => d.transcriptCount);
          filledValue = validValues.length > 0 
            ? validValues.reduce((sum, val) => sum + val, 0) / validValues.length
            : 0;
        }

        return {
          ...record,
          transcriptCount: Math.round(filledValue)
        };
      }

      return record;
    });
  }

  /**
   * Find nearest valid value in a direction
   */
  private static findNearestValidValue(
    data: TranscriptData[],
    startIndex: number,
    direction: number
  ): number | null {
    for (let i = startIndex + direction; i >= 0 && i < data.length; i += direction) {
      const value = data[i].transcriptCount;
      if (value !== null && value !== undefined && !isNaN(value)) {
        return value;
      }
    }
    return null;
  }

  /**
   * Detect outliers using IQR method
   */
  private static detectOutliers(data: TranscriptData[]): TranscriptData[] {
    const values = data
      .filter(d => d.transcriptCount !== null && !isNaN(d.transcriptCount))
      .map(d => d.transcriptCount)
      .sort((a, b) => a - b);

    if (values.length < 4) return []; // Need at least 4 values for quartiles

    const q1Index = Math.floor(values.length * 0.25);
    const q3Index = Math.floor(values.length * 0.75);
    
    const q1 = values[q1Index];
    const q3 = values[q3Index];
    const iqr = q3 - q1;
    
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;
    
    return data.filter(d => 
      d.transcriptCount < lowerBound || d.transcriptCount > upperBound
    );
  }

  /**
   * Handle outliers by removing or capping
   */
  private static handleOutliers(
    data: TranscriptData[],
    method: 'remove' | 'cap'
  ): TranscriptData[] {
    const outliers = this.detectOutliers(data);
    const outlierIds = new Set(outliers.map(o => o.id));

    if (method === 'remove') {
      return data.filter(d => !outlierIds.has(d.id));
    }

    // Cap outliers
    const values = data
      .filter(d => !outlierIds.has(d.id))
      .map(d => d.transcriptCount)
      .sort((a, b) => a - b);

    if (values.length === 0) return data;

    const min = Math.min(...values);
    const max = Math.max(...values);

    return data.map(record => {
      if (outlierIds.has(record.id)) {
        return {
          ...record,
          transcriptCount: record.transcriptCount < min ? min : max
        };
      }
      return record;
    });
  }

  /**
   * Apply moving average smoothing
   */
  private static applySmoothing(
    data: TranscriptData[],
    windowSize: number
  ): TranscriptData[] {
    const sortedData = [...data].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    return sortedData.map((record, index) => {
      const start = Math.max(0, index - Math.floor(windowSize / 2));
      const end = Math.min(sortedData.length, start + windowSize);
      
      const windowData = sortedData.slice(start, end);
      const average = windowData.reduce((sum, d) => sum + d.transcriptCount, 0) / windowData.length;

      return {
        ...record,
        transcriptCount: Math.round(average)
      };
    });
  }

  /**
   * Aggregate data by time period
   */
  private static aggregateByPeriod(
    data: TranscriptData[],
    period: 'weekly' | 'monthly'
  ): TranscriptData[] {
    const aggregated = new Map<string, {
      records: TranscriptData[];
      totalCount: number;
      date: Date;
    }>();

    data.forEach(record => {
      const date = new Date(record.date);
      let key: string;
      let periodDate: Date;

      if (period === 'weekly') {
        // Get start of week (Monday)
        const startOfWeek = new Date(date);
        startOfWeek.setDate(date.getDate() - date.getDay() + 1);
        key = `${record.clientName}-${startOfWeek.toISOString().split('T')[0]}`;
        periodDate = startOfWeek;
      } else { // monthly
        key = `${record.clientName}-${date.getFullYear()}-${date.getMonth()}`;
        periodDate = new Date(date.getFullYear(), date.getMonth(), 1);
      }

      if (aggregated.has(key)) {
        const existing = aggregated.get(key)!;
        existing.records.push(record);
        existing.totalCount += record.transcriptCount;
      } else {
        aggregated.set(key, {
          records: [record],
          totalCount: record.transcriptCount,
          date: periodDate
        });
      }
    });

    return Array.from(aggregated.values()).map(({ records, totalCount, date }) => ({
      id: `agg_${Date.now()}_${Math.random()}`,
      clientName: records[0].clientName,
      date,
      transcriptCount: totalCount,
      transcriptType: records[0].transcriptType,
      notes: `Aggregated from ${records.length} records`,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: records[0].createdBy
    }));
  }

  /**
   * Calculate basic statistics
   */
  private static calculateStatistics(values: number[]): {
    mean: number;
    median: number;
    std: number;
    min: number;
    max: number;
  } {
    if (values.length === 0) {
      return { mean: 0, median: 0, std: 0, min: 0, max: 0 };
    }

    const sorted = [...values].sort((a, b) => a - b);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    
    const median = sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)];

    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const std = Math.sqrt(variance);

    return {
      mean: Math.round(mean * 100) / 100,
      median,
      std: Math.round(std * 100) / 100,
      min: Math.min(...values),
      max: Math.max(...values)
    };
  }

  /**
   * Generate data quality recommendations
   */
  private static generateRecommendations(report: {
    totalRecords: number;
    missingValues: number;
    duplicates: number;
    outliers: number;
    daysCovered: number;
    statistics: any;
  }): string[] {
    const recommendations: string[] = [];

    // Data volume recommendations
    if (report.totalRecords < 30) {
      recommendations.push('Consider collecting more data points for better prediction accuracy.');
    }

    // Missing values
    if (report.missingValues > 0) {
      const percentage = (report.missingValues / report.totalRecords) * 100;
      if (percentage > 10) {
        recommendations.push(`High percentage of missing values (${percentage.toFixed(1)}%). Consider data collection improvements.`);
      } else {
        recommendations.push('Some missing values detected. Consider using interpolation to fill gaps.');
      }
    }

    // Duplicates
    if (report.duplicates > 0) {
      recommendations.push(`${report.duplicates} duplicate records found. Remove duplicates for better data quality.`);
    }

    // Outliers
    if (report.outliers > 0) {
      const percentage = (report.outliers / report.totalRecords) * 100;
      if (percentage > 5) {
        recommendations.push(`High number of outliers (${percentage.toFixed(1)}%). Investigate data collection process.`);
      } else {
        recommendations.push('Some outliers detected. Consider capping or removing extreme values.');
      }
    }

    // Data coverage
    if (report.daysCovered < 30) {
      recommendations.push('Limited time coverage. Collect data over a longer period for seasonal pattern detection.');
    }

    // Data variance
    if (report.statistics.std < report.statistics.mean * 0.1) {
      recommendations.push('Low data variance detected. Predictions may be less informative.');
    }

    return recommendations;
  }

  /**
   * Generate missing date ranges
   */
  public static findMissingDateRanges(
    data: TranscriptData[],
    clientName?: string
  ): { start: Date; end: Date }[] {
    let filteredData = clientName 
      ? data.filter(d => d.clientName === clientName)
      : data;

    if (filteredData.length < 2) return [];

    const sortedData = filteredData.sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const missingRanges: { start: Date; end: Date }[] = [];
    
    for (let i = 1; i < sortedData.length; i++) {
      const prevDate = new Date(sortedData[i - 1].date);
      const currentDate = new Date(sortedData[i].date);
      
      const daysDiff = Math.ceil((currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff > 1) {
        const gapStart = new Date(prevDate);
        gapStart.setDate(gapStart.getDate() + 1);
        
        const gapEnd = new Date(currentDate);
        gapEnd.setDate(gapEnd.getDate() - 1);
        
        missingRanges.push({ start: gapStart, end: gapEnd });
      }
    }

    return missingRanges;
  }
}