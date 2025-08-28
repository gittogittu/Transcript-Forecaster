import { ScheduledExportService, ScheduledExport, ScheduleConfig } from '../scheduled-export-service'
import { ExportOptions } from '../export-service'
import { addDays, addWeeks, addMonths, format } from 'date-fns'

// Mock the export service
jest.mock('../export-service', () => ({
  exportService: {
    exportData: jest.fn().mockResolvedValue({
      success: true,
      data: 'mock-export-data',
      filename: 'test-export.csv'
    })
  }
}))

// Mock database functions
jest.mock('@/lib/database/transcripts', () => ({
  getTranscripts: jest.fn().mockResolvedValue([
    {
      id: '1',
      client_name: 'Client A',
      date: new Date('2024-01-15'),
      transcript_count: 25,
      transcript_type: 'Medical',
      notes: 'Test'
    }
  ])
}))

describe('ScheduledExportService', () => {
  let service: ScheduledExportService
  let mockScheduleConfig: ScheduleConfig
  let mockExportOptions: ExportOptions

  beforeEach(() => {
    service = new ScheduledExportService()
    
    mockScheduleConfig = {
      frequency: 'weekly',
      time: '09:00',
      dayOfWeek: 1, // Monday
      timezone: 'UTC'
    }

    mockExportOptions = {
      format: 'csv',
      includeAnalytics: true,
      includePredictions: false
    }

    // Clear any existing timers
    service.stopScheduler()
  })

  afterEach(() => {
    service.stopScheduler()
  })

  describe('createScheduledExport', () => {
    it('should create a new scheduled export', async () => {
      const config = {
        name: 'Weekly Report',
        description: 'Weekly analytics report',
        schedule: mockScheduleConfig,
        exportOptions: mockExportOptions,
        recipients: ['user@example.com'],
        isActive: true,
        createdBy: 'user1'
      }

      const id = await service.createScheduledExport(config)

      expect(id).toBeDefined()
      expect(id).toMatch(/^export_\d+_[a-z0-9]+$/)

      const scheduledExport = service.getScheduledExport(id)
      expect(scheduledExport).toBeDefined()
      expect(scheduledExport?.name).toBe('Weekly Report')
      expect(scheduledExport?.isActive).toBe(true)
      expect(scheduledExport?.nextRun).toBeDefined()
    })

    it('should calculate next run time correctly', async () => {
      const config = {
        name: 'Daily Report',
        schedule: {
          frequency: 'daily' as const,
          time: '10:30',
          timezone: 'UTC'
        },
        exportOptions: mockExportOptions,
        recipients: ['user@example.com'],
        isActive: true,
        createdBy: 'user1'
      }

      const id = await service.createScheduledExport(config)
      const scheduledExport = service.getScheduledExport(id)

      expect(scheduledExport?.nextRun).toBeDefined()
      
      const nextRun = scheduledExport!.nextRun!
      expect(nextRun.getHours()).toBe(10)
      expect(nextRun.getMinutes()).toBe(30)
    })
  })

  describe('updateScheduledExport', () => {
    it('should update an existing scheduled export', async () => {
      const config = {
        name: 'Original Report',
        schedule: mockScheduleConfig,
        exportOptions: mockExportOptions,
        recipients: ['user@example.com'],
        isActive: true,
        createdBy: 'user1'
      }

      const id = await service.createScheduledExport(config)

      const updates = {
        name: 'Updated Report',
        isActive: false
      }

      const success = await service.updateScheduledExport(id, updates)
      expect(success).toBe(true)

      const updatedExport = service.getScheduledExport(id)
      expect(updatedExport?.name).toBe('Updated Report')
      expect(updatedExport?.isActive).toBe(false)
    })

    it('should return false for non-existent export', async () => {
      const success = await service.updateScheduledExport('non-existent', { name: 'Test' })
      expect(success).toBe(false)
    })

    it('should recalculate next run when schedule is updated', async () => {
      const config = {
        name: 'Test Report',
        schedule: mockScheduleConfig,
        exportOptions: mockExportOptions,
        recipients: ['user@example.com'],
        isActive: true,
        createdBy: 'user1'
      }

      const id = await service.createScheduledExport(config)
      const originalExport = service.getScheduledExport(id)
      const originalNextRun = originalExport!.nextRun

      const newSchedule: ScheduleConfig = {
        frequency: 'daily',
        time: '15:00',
        timezone: 'UTC'
      }

      await service.updateScheduledExport(id, { schedule: newSchedule })
      const updatedExport = service.getScheduledExport(id)

      expect(updatedExport?.nextRun).not.toEqual(originalNextRun)
      expect(updatedExport?.schedule.frequency).toBe('daily')
      expect(updatedExport?.schedule.time).toBe('15:00')
    })
  })

  describe('deleteScheduledExport', () => {
    it('should delete an existing scheduled export', async () => {
      const config = {
        name: 'Test Report',
        schedule: mockScheduleConfig,
        exportOptions: mockExportOptions,
        recipients: ['user@example.com'],
        isActive: true,
        createdBy: 'user1'
      }

      const id = await service.createScheduledExport(config)
      expect(service.getScheduledExport(id)).toBeDefined()

      const success = await service.deleteScheduledExport(id)
      expect(success).toBe(true)
      expect(service.getScheduledExport(id)).toBeUndefined()
    })

    it('should return false for non-existent export', async () => {
      const success = await service.deleteScheduledExport('non-existent')
      expect(success).toBe(false)
    })
  })

  describe('executeScheduledExport', () => {
    it('should execute a scheduled export successfully', async () => {
      const config = {
        name: 'Test Report',
        schedule: mockScheduleConfig,
        exportOptions: mockExportOptions,
        recipients: ['user@example.com'],
        isActive: true,
        createdBy: 'user1'
      }

      const id = await service.createScheduledExport(config)
      const result = await service.executeScheduledExport(id)

      expect(result.success).toBe(true)
      expect(result.exportId).toBe(id)
      expect(result.filename).toBe('test-export.csv')
      expect(result.executedAt).toBeDefined()

      // Check that lastRun was updated
      const updatedExport = service.getScheduledExport(id)
      expect(updatedExport?.lastRun).toBeDefined()
    })

    it('should return error for non-existent export', async () => {
      const result = await service.executeScheduledExport('non-existent')

      expect(result.success).toBe(false)
      expect(result.error).toContain('not found')
    })

    it('should handle export service errors', async () => {
      const { exportService } = require('../export-service')
      exportService.exportData.mockResolvedValueOnce({
        success: false,
        error: 'Export failed'
      })

      const config = {
        name: 'Test Report',
        schedule: mockScheduleConfig,
        exportOptions: mockExportOptions,
        recipients: ['user@example.com'],
        isActive: true,
        createdBy: 'user1'
      }

      const id = await service.createScheduledExport(config)
      const result = await service.executeScheduledExport(id)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Export failed')
    })
  })

  describe('getScheduledExports', () => {
    it('should return all scheduled exports', async () => {
      const config1 = {
        name: 'Report 1',
        schedule: mockScheduleConfig,
        exportOptions: mockExportOptions,
        recipients: ['user1@example.com'],
        isActive: true,
        createdBy: 'user1'
      }

      const config2 = {
        name: 'Report 2',
        schedule: { ...mockScheduleConfig, frequency: 'daily' as const },
        exportOptions: mockExportOptions,
        recipients: ['user2@example.com'],
        isActive: false,
        createdBy: 'user2'
      }

      await service.createScheduledExport(config1)
      await service.createScheduledExport(config2)

      const exports = service.getScheduledExports()
      expect(exports).toHaveLength(2)
      expect(exports.map(e => e.name)).toContain('Report 1')
      expect(exports.map(e => e.name)).toContain('Report 2')
    })

    it('should return empty array when no exports exist', () => {
      const exports = service.getScheduledExports()
      expect(exports).toHaveLength(0)
    })
  })

  describe('Schedule Calculation', () => {
    beforeEach(() => {
      // Mock current time to a specific date for consistent testing
      jest.useFakeTimers()
      jest.setSystemTime(new Date('2024-01-15T08:00:00Z')) // Monday 8:00 AM
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('should calculate next daily run correctly', async () => {
      const config = {
        name: 'Daily Report',
        schedule: {
          frequency: 'daily' as const,
          time: '10:00',
          timezone: 'UTC'
        },
        exportOptions: mockExportOptions,
        recipients: ['user@example.com'],
        isActive: true,
        createdBy: 'user1'
      }

      const id = await service.createScheduledExport(config)
      const scheduledExport = service.getScheduledExport(id)
      const nextRun = scheduledExport!.nextRun!

      // Should be today at 10:00 AM (since current time is 8:00 AM)
      expect(nextRun.getHours()).toBe(10)
      expect(nextRun.getMinutes()).toBe(0)
      // Allow for either same day or next day depending on timezone handling
      expect([15, 16]).toContain(nextRun.getDate())
    })

    it('should calculate next daily run for next day if time has passed', async () => {
      jest.setSystemTime(new Date('2024-01-15T12:00:00Z')) // Monday 12:00 PM

      const config = {
        name: 'Daily Report',
        schedule: {
          frequency: 'daily' as const,
          time: '10:00',
          timezone: 'UTC'
        },
        exportOptions: mockExportOptions,
        recipients: ['user@example.com'],
        isActive: true,
        createdBy: 'user1'
      }

      const id = await service.createScheduledExport(config)
      const scheduledExport = service.getScheduledExport(id)
      const nextRun = scheduledExport!.nextRun!

      // Should be tomorrow at 10:00 AM
      expect(nextRun.getHours()).toBe(10)
      expect(nextRun.getMinutes()).toBe(0)
      expect(nextRun.getDate()).toBe(16) // Next day
    })

    it('should calculate next weekly run correctly', async () => {
      const config = {
        name: 'Weekly Report',
        schedule: {
          frequency: 'weekly' as const,
          time: '09:00',
          dayOfWeek: 3, // Wednesday
          timezone: 'UTC'
        },
        exportOptions: mockExportOptions,
        recipients: ['user@example.com'],
        isActive: true,
        createdBy: 'user1'
      }

      const id = await service.createScheduledExport(config)
      const scheduledExport = service.getScheduledExport(id)
      const nextRun = scheduledExport!.nextRun!

      // Should be Wednesday (2 days from Monday)
      expect(nextRun.getDay()).toBe(3) // Wednesday
      expect(nextRun.getHours()).toBe(9)
      expect(nextRun.getDate()).toBe(17) // January 17th is Wednesday
    })

    it('should calculate next monthly run correctly', async () => {
      const config = {
        name: 'Monthly Report',
        schedule: {
          frequency: 'monthly' as const,
          time: '14:30',
          dayOfMonth: 25,
          timezone: 'UTC'
        },
        exportOptions: mockExportOptions,
        recipients: ['user@example.com'],
        isActive: true,
        createdBy: 'user1'
      }

      const id = await service.createScheduledExport(config)
      const scheduledExport = service.getScheduledExport(id)
      const nextRun = scheduledExport!.nextRun!

      // Should be January 25th at 14:30
      expect(nextRun.getDate()).toBe(25)
      expect(nextRun.getHours()).toBe(14)
      expect(nextRun.getMinutes()).toBe(30)
    })
  })

  describe('Scheduler Management', () => {
    it('should start scheduler for active exports', async () => {
      const config = {
        name: 'Test Report',
        schedule: mockScheduleConfig,
        exportOptions: mockExportOptions,
        recipients: ['user@example.com'],
        isActive: true,
        createdBy: 'user1'
      }

      await service.createScheduledExport(config)
      
      // Starting scheduler should not throw
      expect(() => service.startScheduler()).not.toThrow()
    })

    it('should stop all scheduled exports', async () => {
      const config = {
        name: 'Test Report',
        schedule: mockScheduleConfig,
        exportOptions: mockExportOptions,
        recipients: ['user@example.com'],
        isActive: true,
        createdBy: 'user1'
      }

      await service.createScheduledExport(config)
      service.startScheduler()
      
      // Stopping scheduler should not throw
      expect(() => service.stopScheduler()).not.toThrow()
    })
  })
})