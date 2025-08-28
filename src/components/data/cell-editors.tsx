"use client"

import React, { useState, useEffect, useRef, forwardRef } from 'react'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon, Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

export interface CellEditorProps {
  value: any
  onChange: (value: any) => void
  onComplete: (save: boolean) => void
  onKeyDown?: (event: React.KeyboardEvent) => void
  autoFocus?: boolean
  className?: string
}

export interface SelectCellEditorProps extends CellEditorProps {
  options: Array<{ value: string; label: string }>
  placeholder?: string
}

export interface DateCellEditorProps extends CellEditorProps {
  format?: string
  placeholder?: string
}

export interface NumberCellEditorProps extends CellEditorProps {
  min?: number
  max?: number
  step?: number
  placeholder?: string
}

export interface TextCellEditorProps extends CellEditorProps {
  multiline?: boolean
  maxLength?: number
  placeholder?: string
}

// Text Cell Editor
export const TextCellEditor = forwardRef<HTMLInputElement, TextCellEditorProps>(
  ({ value, onChange, onComplete, onKeyDown, autoFocus, className, multiline, maxLength, placeholder }, ref) => {
    const [internalValue, setInternalValue] = useState(String(value || ''))

    useEffect(() => {
      setInternalValue(String(value || ''))
    }, [value])

    const handleChange = (newValue: string) => {
      setInternalValue(newValue)
      onChange(newValue)
    }

    const handleKeyDown = (event: React.KeyboardEvent) => {
      if (event.key === 'Enter' && !multiline) {
        event.preventDefault()
        onComplete(true)
      } else if (event.key === 'Escape') {
        event.preventDefault()
        onComplete(false)
      } else if (event.key === 'Tab') {
        event.preventDefault()
        onComplete(true)
      }
      
      onKeyDown?.(event)
    }

    const handleBlur = () => {
      onComplete(true)
    }

    if (multiline) {
      return (
        <Textarea
          ref={ref as any}
          value={internalValue}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={placeholder}
          maxLength={maxLength}
          autoFocus={autoFocus}
          className={cn("min-h-[60px] resize-none", className)}
          rows={3}
        />
      )
    }

    return (
      <Input
        ref={ref}
        type="text"
        value={internalValue}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={placeholder}
        maxLength={maxLength}
        autoFocus={autoFocus}
        className={cn("h-8 border-0 p-1 focus:ring-2 focus:ring-blue-500", className)}
      />
    )
  }
)

TextCellEditor.displayName = 'TextCellEditor'

// Number Cell Editor
export const NumberCellEditor = forwardRef<HTMLInputElement, NumberCellEditorProps>(
  ({ value, onChange, onComplete, onKeyDown, autoFocus, className, min, max, step, placeholder }, ref) => {
    const [internalValue, setInternalValue] = useState(String(value || ''))

    useEffect(() => {
      setInternalValue(String(value || ''))
    }, [value])

    const handleChange = (newValue: string) => {
      setInternalValue(newValue)
      const numValue = parseFloat(newValue)
      onChange(isNaN(numValue) ? 0 : numValue)
    }

    const handleKeyDown = (event: React.KeyboardEvent) => {
      // Allow navigation and editing keys
      const allowedKeys = [
        'Backspace', 'Delete', 'Tab', 'Escape', 'Enter',
        'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
        'Home', 'End'
      ]

      if (allowedKeys.includes(event.key)) {
        if (event.key === 'Enter') {
          event.preventDefault()
          onComplete(true)
        } else if (event.key === 'Escape') {
          event.preventDefault()
          onComplete(false)
        } else if (event.key === 'Tab') {
          event.preventDefault()
          onComplete(true)
        } else if (event.key === 'ArrowUp') {
          event.preventDefault()
          const currentValue = parseFloat(internalValue) || 0
          const newValue = currentValue + (step || 1)
          if (!max || newValue <= max) {
            handleChange(String(newValue))
          }
        } else if (event.key === 'ArrowDown') {
          event.preventDefault()
          const currentValue = parseFloat(internalValue) || 0
          const newValue = currentValue - (step || 1)
          if (!min || newValue >= min) {
            handleChange(String(newValue))
          }
        }
        
        onKeyDown?.(event)
        return
      }

      // Allow digits, decimal point, and minus sign
      if (!/[\d.-]/.test(event.key)) {
        event.preventDefault()
      }
    }

    const handleBlur = () => {
      onComplete(true)
    }

    return (
      <Input
        ref={ref}
        type="number"
        value={internalValue}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
        autoFocus={autoFocus}
        className={cn("h-8 border-0 p-1 focus:ring-2 focus:ring-blue-500", className)}
      />
    )
  }
)

NumberCellEditor.displayName = 'NumberCellEditor'

// Date Cell Editor
export const DateCellEditor = forwardRef<HTMLInputElement, DateCellEditorProps>(
  ({ value, onChange, onComplete, onKeyDown, autoFocus, className, format: dateFormat = 'yyyy-MM-dd', placeholder }, ref) => {
    const [internalValue, setInternalValue] = useState('')
    const [isOpen, setIsOpen] = useState(false)

    useEffect(() => {
      if (value instanceof Date) {
        setInternalValue(value.toISOString().split('T')[0])
      } else if (typeof value === 'string') {
        setInternalValue(value)
      } else {
        setInternalValue('')
      }
    }, [value])

    const handleChange = (newValue: string) => {
      setInternalValue(newValue)
      const dateValue = new Date(newValue)
      onChange(isNaN(dateValue.getTime()) ? null : dateValue)
    }

    const handleDateSelect = (date: Date | undefined) => {
      if (date) {
        const dateString = date.toISOString().split('T')[0]
        setInternalValue(dateString)
        onChange(date)
        setIsOpen(false)
        onComplete(true)
      }
    }

    const handleKeyDown = (event: React.KeyboardEvent) => {
      if (event.key === 'Enter') {
        event.preventDefault()
        onComplete(true)
      } else if (event.key === 'Escape') {
        event.preventDefault()
        onComplete(false)
      } else if (event.key === 'Tab') {
        event.preventDefault()
        onComplete(true)
      }
      
      onKeyDown?.(event)
    }

    const handleBlur = () => {
      if (!isOpen) {
        onComplete(true)
      }
    }

    return (
      <div className="flex items-center gap-1">
        <Input
          ref={ref}
          type="date"
          value={internalValue}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className={cn("h-8 border-0 p-1 focus:ring-2 focus:ring-blue-500 flex-1", className)}
        />
        
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setIsOpen(true)}
            >
              <CalendarIcon className="h-3 w-3" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={value instanceof Date ? value : undefined}
              onSelect={handleDateSelect}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>
    )
  }
)

DateCellEditor.displayName = 'DateCellEditor'

// Select Cell Editor
export const SelectCellEditor = forwardRef<HTMLButtonElement, SelectCellEditorProps>(
  ({ value, onChange, onComplete, onKeyDown, autoFocus, className, options, placeholder }, ref) => {
    const [internalValue, setInternalValue] = useState(String(value || ''))
    const [isOpen, setIsOpen] = useState(false)

    useEffect(() => {
      setInternalValue(String(value || ''))
    }, [value])

    useEffect(() => {
      if (autoFocus) {
        setIsOpen(true)
      }
    }, [autoFocus])

    const handleValueChange = (newValue: string) => {
      setInternalValue(newValue)
      onChange(newValue)
      setIsOpen(false)
      onComplete(true)
    }

    const handleKeyDown = (event: React.KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setIsOpen(false)
        onComplete(false)
      } else if (event.key === 'Tab') {
        event.preventDefault()
        setIsOpen(false)
        onComplete(true)
      }
      
      onKeyDown?.(event)
    }

    const handleOpenChange = (open: boolean) => {
      setIsOpen(open)
      if (!open) {
        onComplete(true)
      }
    }

    return (
      <Select
        value={internalValue}
        onValueChange={handleValueChange}
        open={isOpen}
        onOpenChange={handleOpenChange}
      >
        <SelectTrigger
          ref={ref}
          className={cn("h-8 border-0 p-1 focus:ring-2 focus:ring-blue-500", className)}
          onKeyDown={handleKeyDown}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }
)

SelectCellEditor.displayName = 'SelectCellEditor'

// Inline Action Editor (for save/cancel actions)
export interface InlineActionEditorProps {
  onSave: () => void
  onCancel: () => void
  className?: string
}

export const InlineActionEditor: React.FC<InlineActionEditorProps> = ({
  onSave,
  onCancel,
  className
}) => {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Button
        size="sm"
        variant="ghost"
        onClick={onSave}
        className="h-6 w-6 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
      >
        <Check className="h-3 w-3" />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={onCancel}
        className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  )
}

// Cell Editor Factory
export interface CellEditorFactoryProps extends CellEditorProps {
  type: 'text' | 'number' | 'date' | 'select'
  options?: Array<{ value: string; label: string }>
  multiline?: boolean
  min?: number
  max?: number
  step?: number
  maxLength?: number
  placeholder?: string
  format?: string
}

export const CellEditorFactory = forwardRef<any, CellEditorFactoryProps>(
  ({ type, ...props }, ref) => {
    switch (type) {
      case 'text':
        return <TextCellEditor ref={ref} {...props} />
      case 'number':
        return <NumberCellEditor ref={ref} {...props} />
      case 'date':
        return <DateCellEditor ref={ref} {...props} />
      case 'select':
        return <SelectCellEditor ref={ref} {...props} />
      default:
        return <TextCellEditor ref={ref} {...props} />
    }
  }
)

CellEditorFactory.displayName = 'CellEditorFactory'