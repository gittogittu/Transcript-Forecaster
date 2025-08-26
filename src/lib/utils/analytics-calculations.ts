/**
 * Analytics Calculations Utilities
 * Statistical calculations for transcript analytics
 */

import { TranscriptData } from '@/types/transcript';

export interface TrendData {
  month: string;
  count: number;
  change?: number;
  changePercent?: number;
}

export interface StatisticalSummary {
  mean: number;
  median: number;
  mode: number;
  standardDeviation: number;
  variance: number;
  min: number;
  max: number;
  total: number;
}

export interface GrowthMetrics {
  monthlyGrowthRate: number;
  quarterlyGrowthRate: number;
  yearOverYearGrowth: number;
  compoundAnnualGrowthRate: number;
}

/**
 * Calculate trend data with month-over-month changes
 */
export function calculateTrends(data: TranscriptData[]): TrendData[] {
  const monthlyData = aggregateByMonth(data);
  const sortedMonths = Object.keys(monthlyData).sort();
  
  return sortedMonths.map((month, index) => {
    const count = monthlyData[month];
    const previousMonth = index > 0 ? monthlyData[sortedMonths[index - 1]] : null;
    
    let change = 0;
    let changePercent = 0;
    
    if (previousMonth !== null) {
      change = count - previousMonth;
      changePercent = previousMonth > 0 ? (change / previousMonth) * 100 : 0;
    }
    
    return {
      month,
      count,
      change,
      changePercent
    };
  });
}

/**
 * Aggregate transcript data by month
 */
export function aggregateByMonth(data: TranscriptData[]): Record<string, number> {
  return data.reduce((acc, item) => {
    const monthKey = `${item.year}-${String(item.month).padStart(2, '0')}`;
    acc[monthKey] = (acc[monthKey] || 0) + item.transcriptCount;
    return acc;
  }, {} as Record<string, number>);
}

/**
 * Aggregate transcript data by client
 */
export function aggregateByClient(data: TranscriptData[]): Record<string, number> {
  return data.reduce((acc, item) => {
    acc[item.clientName] = (acc[item.clientName] || 0) + item.transcriptCount;
    return acc;
  }, {} as Record<string, number>);
}

/**
 * Calculate statistical summary for transcript counts
 */
export function calculateStatisticalSummary(data: TranscriptData[]): StatisticalSummary {
  const counts = data.map(item => item.transcriptCount);
  
  if (counts.length === 0) {
    return {
      mean: 0,
      median: 0,
      mode: 0,
      standardDeviation: 0,
      variance: 0,
      min: 0,
      max: 0,
      total: 0
    };
  }
  
  const sortedCounts = [...counts].sort((a, b) => a - b);
  const total = counts.reduce((sum, count) => sum + count, 0);
  const mean = total / counts.length;
  
  // Calculate median
  const median = sortedCounts.length % 2 === 0
    ? (sortedCounts[sortedCounts.length / 2 - 1] + sortedCounts[sortedCounts.length / 2]) / 2
    : sortedCounts[Math.floor(sortedCounts.length / 2)];
  
  // Calculate mode
  const frequency: Record<number, number> = {};
  counts.forEach(count => {
    frequency[count] = (frequency[count] || 0) + 1;
  });
  
  const mode = parseInt(Object.keys(frequency).reduce((a, b) => 
    frequency[parseInt(a)] > frequency[parseInt(b)] ? a : b
  ));
  
  // Calculate variance and standard deviation
  const variance = counts.reduce((sum, count) => sum + Math.pow(count - mean, 2), 0) / counts.length;
  const standardDeviation = Math.sqrt(variance);
  
  return {
    mean,
    median,
    mode,
    standardDeviation,
    variance,
    min: Math.min(...counts),
    max: Math.max(...counts),
    total
  };
}

/**
 * Calculate growth metrics
 */
export function calculateGrowthMetrics(data: TranscriptData[]): GrowthMetrics {
  const monthlyData = aggregateByMonth(data);
  const sortedMonths = Object.keys(monthlyData).sort();
  
  if (sortedMonths.length < 2) {
    return {
      monthlyGrowthRate: 0,
      quarterlyGrowthRate: 0,
      yearOverYearGrowth: 0,
      compoundAnnualGrowthRate: 0
    };
  }
  
  // Monthly growth rate (last month vs previous month)
  const lastMonth = monthlyData[sortedMonths[sortedMonths.length - 1]];
  const previousMonth = monthlyData[sortedMonths[sortedMonths.length - 2]];
  const monthlyGrowthRate = previousMonth > 0 ? ((lastMonth - previousMonth) / previousMonth) * 100 : 0;
  
  // Quarterly growth rate (last 3 months vs previous 3 months)
  const quarterlyGrowthRate = calculateQuarterlyGrowth(monthlyData, sortedMonths);
  
  // Year-over-year growth
  const yearOverYearGrowth = calculateYearOverYearGrowth(monthlyData, sortedMonths);
  
  // Compound Annual Growth Rate (CAGR)
  const compoundAnnualGrowthRate = calculateCAGR(monthlyData, sortedMonths);
  
  return {
    monthlyGrowthRate,
    quarterlyGrowthRate,
    yearOverYearGrowth,
    compoundAnnualGrowthRate
  };
}

/**
 * Calculate quarterly growth rate
 */
function calculateQuarterlyGrowth(monthlyData: Record<string, number>, sortedMonths: string[]): number {
  if (sortedMonths.length < 6) return 0;
  
  const lastQuarter = sortedMonths.slice(-3).reduce((sum, month) => sum + monthlyData[month], 0);
  const previousQuarter = sortedMonths.slice(-6, -3).reduce((sum, month) => sum + monthlyData[month], 0);
  
  return previousQuarter > 0 ? ((lastQuarter - previousQuarter) / previousQuarter) * 100 : 0;
}

/**
 * Calculate year-over-year growth
 */
function calculateYearOverYearGrowth(monthlyData: Record<string, number>, sortedMonths: string[]): number {
  if (sortedMonths.length < 12) return 0;
  
  const currentYear = sortedMonths.slice(-12).reduce((sum, month) => sum + monthlyData[month], 0);
  const previousYear = sortedMonths.slice(-24, -12).reduce((sum, month) => sum + monthlyData[month], 0);
  
  return previousYear > 0 ? ((currentYear - previousYear) / previousYear) * 100 : 0;
}

/**
 * Calculate Compound Annual Growth Rate (CAGR)
 */
function calculateCAGR(monthlyData: Record<string, number>, sortedMonths: string[]): number {
  if (sortedMonths.length < 12) return 0;
  
  const firstValue = monthlyData[sortedMonths[0]];
  const lastValue = monthlyData[sortedMonths[sortedMonths.length - 1]];
  const periods = sortedMonths.length / 12; // Number of years
  
  if (firstValue <= 0 || periods <= 0) return 0;
  
  return (Math.pow(lastValue / firstValue, 1 / periods) - 1) * 100;
}

/**
 * Calculate moving average
 */
export function calculateMovingAverage(data: TranscriptData[], windowSize: number = 3): TrendData[] {
  const monthlyData = aggregateByMonth(data);
  const sortedMonths = Object.keys(monthlyData).sort();
  
  return sortedMonths.map((month, index) => {
    const start = Math.max(0, index - windowSize + 1);
    const end = index + 1;
    const window = sortedMonths.slice(start, end);
    
    const average = window.reduce((sum, m) => sum + monthlyData[m], 0) / window.length;
    
    return {
      month,
      count: Math.round(average)
    };
  });
}

/**
 * Detect seasonal patterns
 */
export function detectSeasonalPatterns(data: TranscriptData[]): Record<string, number> {
  const monthlyAverages: Record<string, number[]> = {};
  
  data.forEach(item => {
    const monthNumber = parseInt(item.month.split('-')[1]) - 1; // Extract month from "YYYY-MM" format
    const monthName = new Date(item.year, monthNumber).toLocaleString('default', { month: 'long' });
    if (!monthlyAverages[monthName]) {
      monthlyAverages[monthName] = [];
    }
    monthlyAverages[monthName].push(item.transcriptCount);
  });
  
  const seasonalPattern: Record<string, number> = {};
  
  Object.keys(monthlyAverages).forEach(month => {
    const counts = monthlyAverages[month];
    seasonalPattern[month] = counts.reduce((sum, count) => sum + count, 0) / counts.length;
  });
  
  return seasonalPattern;
}

/**
 * Calculate correlation between two data series
 */
export function calculateCorrelation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length === 0) return 0;
  
  const n = x.length;
  const sumX = x.reduce((sum, val) => sum + val, 0);
  const sumY = y.reduce((sum, val) => sum + val, 0);
  const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
  const sumX2 = x.reduce((sum, val) => sum + val * val, 0);
  const sumY2 = y.reduce((sum, val) => sum + val * val, 0);
  
  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  
  return denominator === 0 ? 0 : numerator / denominator;
}

/**
 * Calculate forecast accuracy metrics
 */
export function calculateForecastAccuracy(actual: number[], predicted: number[]): {
  mae: number; // Mean Absolute Error
  mape: number; // Mean Absolute Percentage Error
  rmse: number; // Root Mean Square Error
  r2: number; // R-squared
} {
  if (actual.length !== predicted.length || actual.length === 0) {
    return { mae: 0, mape: 0, rmse: 0, r2: 0 };
  }
  
  const n = actual.length;
  
  // Mean Absolute Error
  const mae = actual.reduce((sum, val, i) => sum + Math.abs(val - predicted[i]), 0) / n;
  
  // Mean Absolute Percentage Error
  const mape = actual.reduce((sum, val, i) => {
    return sum + (val !== 0 ? Math.abs((val - predicted[i]) / val) : 0);
  }, 0) / n * 100;
  
  // Root Mean Square Error
  const rmse = Math.sqrt(
    actual.reduce((sum, val, i) => sum + Math.pow(val - predicted[i], 2), 0) / n
  );
  
  // R-squared
  const actualMean = actual.reduce((sum, val) => sum + val, 0) / n;
  const totalSumSquares = actual.reduce((sum, val) => sum + Math.pow(val - actualMean, 2), 0);
  const residualSumSquares = actual.reduce((sum, val, i) => sum + Math.pow(val - predicted[i], 2), 0);
  const r2 = totalSumSquares === 0 ? 0 : 1 - (residualSumSquares / totalSumSquares);
  
  return { mae, mape, rmse, r2 };
}

/**
 * Calculate trend analytics combining multiple metrics
 */
export function calculateTrendAnalytics(data: TranscriptData[]) {
  const trends = calculateTrends(data);
  const statistics = calculateStatisticalSummary(data);
  const growthMetrics = calculateGrowthMetrics(data);
  const movingAverage = calculateMovingAverage(data);
  const seasonalPatterns = detectSeasonalPatterns(data);
  
  return {
    trends,
    statistics,
    growthMetrics,
    movingAverage,
    seasonalPatterns,
    clientBreakdown: aggregateByClient(data),
    monthlyBreakdown: aggregateByMonth(data)
  };
}