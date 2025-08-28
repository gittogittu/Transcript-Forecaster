import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  TextCellEditor,
  NumberCellEditor,
  DateCellEditor,
  SelectCellEditor,
  CellEditorFactory,
  InlineActionEditor
} from '../cell-editors'

describe('Cell Editors', () => {
  const mockOnChange = jest.fn()
  const mockOnComplete = jest.fn()
  const mockOnKeyDown = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('TextCellEditor', () => {
    it('renders with initial value', () => {
      render(
        <TextCellEditor
          value="Test Value"
          onChange={mockOnChange}
          onComplete={mockOnComplete}
        />
      )

      expect(screen.getByDisplayValue('Test Value')).toBeInTheDocument()
    })

    it('calls onChange when value changes', async () => {
      const user = userEvent.setup()
      
      render(
        <TextCellEditor
          value=""
          onChange={mockOnChange}
          onComplete={mockOnComplete}
        />
      )

      const input = screen.getByRole('textbox')
      await user.type(input, 'New Value')

      expect(mockOnChange).toHaveBeenCalledWith('New Value')
    })

    it('calls onComplete with save=true on Enter', async () => {
      const user = userEvent.setup()
      
      render(
        <TextCellEditor
          value="Test"
          onChange={mockOnChange}
          onComplete={mockOnComplete}
        />
      )

      const input = screen.getByRole('textbox')
      await user.type(input, '{Enter}')

      expect(mockOnComplete).toHaveBeenCalledWith(true)
    })

    it('calls onComplete with save=false on Escape', async () => {
      const user = userEvent.setup()
      
      render(
        <TextCellEditor
          value="Test"
          onChange={mockOnChange}
          onComplete={mockOnComplete}
        />
      )

      const input = screen.getByRole('textbox')
      await user.type(input, '{Escape}')

      expect(mockOnComplete).toHaveBeenCalledWith(false)
    })

    it('calls onComplete on blur', async () => {
      const user = userEvent.setup()
      
      render(
        <div>
          <TextCellEditor
            value="Test"
            onChange={mockOnChange}
            onComplete={mockOnComplete}
          />
          <button>Other Element</button>
        </div>
      )

      const input = screen.getByRole('textbox')
      await user.click(input)
      await user.click(screen.getByRole('button'))

      expect(mockOnComplete).toHaveBeenCalledWith(true)
    })

    it('renders as multiline textarea when multiline=true', () => {
      render(
        <TextCellEditor
          value="Test"
          onChange={mockOnChange}
          onComplete={mockOnComplete}
          multiline={true}
        />
      )

      expect(screen.getByRole('textbox')).toHaveProperty('tagName', 'TEXTAREA')
    })

    it('respects maxLength prop', () => {
      render(
        <TextCellEditor
          value="Test"
          onChange={mockOnChange}
          onComplete={mockOnComplete}
          maxLength={10}
        />
      )

      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('maxLength', '10')
    })
  })

  describe('NumberCellEditor', () => {
    it('renders with initial numeric value', () => {
      render(
        <NumberCellEditor
          value={42}
          onChange={mockOnChange}
          onComplete={mockOnComplete}
        />
      )

      expect(screen.getByDisplayValue('42')).toBeInTheDocument()
    })

    it('calls onChange with numeric value', async () => {
      const user = userEvent.setup()
      
      render(
        <NumberCellEditor
          value={0}
          onChange={mockOnChange}
          onComplete={mockOnComplete}
        />
      )

      const input = screen.getByRole('spinbutton')
      await user.clear(input)
      await user.type(input, '123')

      expect(mockOnChange).toHaveBeenCalledWith(123)
    })

    it('handles invalid input gracefully', async () => {
      const user = userEvent.setup()
      
      render(
        <NumberCellEditor
          value={0}
          onChange={mockOnChange}
          onComplete={mockOnComplete}
        />
      )

      const input = screen.getByRole('spinbutton')
      await user.clear(input)
      await user.type(input, 'abc')

      expect(mockOnChange).toHaveBeenCalledWith(0)
    })

    it('increments value on ArrowUp', async () => {
      const user = userEvent.setup()
      
      render(
        <NumberCellEditor
          value={10}
          onChange={mockOnChange}
          onComplete={mockOnComplete}
          step={1}
        />
      )

      const input = screen.getByRole('spinbutton')
      await user.click(input)
      await user.keyboard('{ArrowUp}')

      expect(mockOnChange).toHaveBeenCalledWith(11)
    })

    it('decrements value on ArrowDown', async () => {
      const user = userEvent.setup()
      
      render(
        <NumberCellEditor
          value={10}
          onChange={mockOnChange}
          onComplete={mockOnComplete}
          step={1}
        />
      )

      const input = screen.getByRole('spinbutton')
      await user.click(input)
      await user.keyboard('{ArrowDown}')

      expect(mockOnChange).toHaveBeenCalledWith(9)
    })

    it('respects min and max bounds', async () => {
      const user = userEvent.setup()
      
      render(
        <NumberCellEditor
          value={5}
          onChange={mockOnChange}
          onComplete={mockOnComplete}
          min={0}
          max={10}
          step={1}
        />
      )

      const input = screen.getByRole('spinbutton')
      expect(input).toHaveAttribute('min', '0')
      expect(input).toHaveAttribute('max', '10')
    })

    it('prevents non-numeric key input', async () => {
      const user = userEvent.setup()
      
      render(
        <NumberCellEditor
          value={0}
          onChange={mockOnChange}
          onComplete={mockOnComplete}
        />
      )

      const input = screen.getByRole('spinbutton')
      await user.click(input)
      
      // Try to type a letter - should be prevented
      const keydownEvent = new KeyboardEvent('keydown', { key: 'a' })
      Object.defineProperty(keydownEvent, 'preventDefault', {
        value: jest.fn()
      })
      
      fireEvent(input, keydownEvent)
      expect(keydownEvent.preventDefault).toHaveBeenCalled()
    })
  })

  describe('DateCellEditor', () => {
    it('renders with initial date value', () => {
      const date = new Date('2024-01-15')
      render(
        <DateCellEditor
          value={date}
          onChange={mockOnChange}
          onComplete={mockOnComplete}
        />
      )

      expect(screen.getByDisplayValue('2024-01-15')).toBeInTheDocument()
    })

    it('calls onChange with Date object', async () => {
      const user = userEvent.setup()
      
      render(
        <DateCellEditor
          value={null}
          onChange={mockOnChange}
          onComplete={mockOnComplete}
        />
      )

      const input = screen.getByRole('textbox')
      await user.type(input, '2024-02-01')

      expect(mockOnChange).toHaveBeenCalledWith(new Date('2024-02-01'))
    })

    it('shows calendar popup when calendar button is clicked', async () => {
      const user = userEvent.setup()
      
      render(
        <DateCellEditor
          value={new Date('2024-01-15')}
          onChange={mockOnChange}
          onComplete={mockOnComplete}
        />
      )

      const calendarButton = screen.getByRole('button')
      await user.click(calendarButton)

      // Calendar should be visible (this would need proper calendar component testing)
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('handles string date input', () => {
      render(
        <DateCellEditor
          value="2024-01-15"
          onChange={mockOnChange}
          onComplete={mockOnComplete}
        />
      )

      expect(screen.getByDisplayValue('2024-01-15')).toBeInTheDocument()
    })
  })

  describe('SelectCellEditor', () => {
    const options = [
      { value: 'option1', label: 'Option 1' },
      { value: 'option2', label: 'Option 2' },
      { value: 'option3', label: 'Option 3' }
    ]

    it('renders with initial value', () => {
      render(
        <SelectCellEditor
          value="option1"
          onChange={mockOnChange}
          onComplete={mockOnComplete}
          options={options}
        />
      )

      expect(screen.getByDisplayValue('Option 1')).toBeInTheDocument()
    })

    it('opens dropdown when autoFocus is true', () => {
      render(
        <SelectCellEditor
          value=""
          onChange={mockOnChange}
          onComplete={mockOnComplete}
          options={options}
          autoFocus={true}
        />
      )

      // Dropdown should be open
      expect(screen.getByRole('listbox')).toBeInTheDocument()
    })

    it('calls onChange and onComplete when option is selected', async () => {
      const user = userEvent.setup()
      
      render(
        <SelectCellEditor
          value=""
          onChange={mockOnChange}
          onComplete={mockOnComplete}
          options={options}
        />
      )

      const trigger = screen.getByRole('combobox')
      await user.click(trigger)

      const option = screen.getByText('Option 2')
      await user.click(option)

      expect(mockOnChange).toHaveBeenCalledWith('option2')
      expect(mockOnComplete).toHaveBeenCalledWith(true)
    })

    it('closes dropdown on Escape', async () => {
      const user = userEvent.setup()
      
      render(
        <SelectCellEditor
          value=""
          onChange={mockOnChange}
          onComplete={mockOnComplete}
          options={options}
          autoFocus={true}
        />
      )

      await user.keyboard('{Escape}')

      expect(mockOnComplete).toHaveBeenCalledWith(false)
    })
  })

  describe('InlineActionEditor', () => {
    const mockOnSave = jest.fn()
    const mockOnCancel = jest.fn()

    beforeEach(() => {
      jest.clearAllMocks()
    })

    it('renders save and cancel buttons', () => {
      render(
        <InlineActionEditor
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      )

      expect(screen.getByRole('button', { name: /check/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /x/i })).toBeInTheDocument()
    })

    it('calls onSave when save button is clicked', async () => {
      const user = userEvent.setup()
      
      render(
        <InlineActionEditor
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      )

      const saveButton = screen.getByRole('button', { name: /check/i })
      await user.click(saveButton)

      expect(mockOnSave).toHaveBeenCalled()
    })

    it('calls onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup()
      
      render(
        <InlineActionEditor
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      )

      const cancelButton = screen.getByRole('button', { name: /x/i })
      await user.click(cancelButton)

      expect(mockOnCancel).toHaveBeenCalled()
    })
  })

  describe('CellEditorFactory', () => {
    it('renders TextCellEditor for text type', () => {
      render(
        <CellEditorFactory
          type="text"
          value="Test"
          onChange={mockOnChange}
          onComplete={mockOnComplete}
        />
      )

      expect(screen.getByRole('textbox')).toBeInTheDocument()
    })

    it('renders NumberCellEditor for number type', () => {
      render(
        <CellEditorFactory
          type="number"
          value={42}
          onChange={mockOnChange}
          onComplete={mockOnComplete}
        />
      )

      expect(screen.getByRole('spinbutton')).toBeInTheDocument()
    })

    it('renders DateCellEditor for date type', () => {
      render(
        <CellEditorFactory
          type="date"
          value={new Date('2024-01-15')}
          onChange={mockOnChange}
          onComplete={mockOnComplete}
        />
      )

      expect(screen.getByDisplayValue('2024-01-15')).toBeInTheDocument()
    })

    it('renders SelectCellEditor for select type', () => {
      const options = [{ value: 'test', label: 'Test' }]
      
      render(
        <CellEditorFactory
          type="select"
          value="test"
          onChange={mockOnChange}
          onComplete={mockOnComplete}
          options={options}
        />
      )

      expect(screen.getByRole('combobox')).toBeInTheDocument()
    })

    it('defaults to TextCellEditor for unknown type', () => {
      render(
        <CellEditorFactory
          type={'unknown' as any}
          value="Test"
          onChange={mockOnChange}
          onComplete={mockOnComplete}
        />
      )

      expect(screen.getByRole('textbox')).toBeInTheDocument()
    })

    it('passes through additional props', () => {
      render(
        <CellEditorFactory
          type="text"
          value="Test"
          onChange={mockOnChange}
          onComplete={mockOnComplete}
          placeholder="Enter text"
          maxLength={50}
        />
      )

      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('placeholder', 'Enter text')
      expect(input).toHaveAttribute('maxLength', '50')
    })
  })

  describe('Common Editor Behavior', () => {
    it('auto-focuses when autoFocus prop is true', () => {
      render(
        <TextCellEditor
          value="Test"
          onChange={mockOnChange}
          onComplete={mockOnComplete}
          autoFocus={true}
        />
      )

      expect(screen.getByRole('textbox')).toHaveFocus()
    })

    it('applies custom className', () => {
      render(
        <TextCellEditor
          value="Test"
          onChange={mockOnChange}
          onComplete={mockOnComplete}
          className="custom-class"
        />
      )

      expect(screen.getByRole('textbox')).toHaveClass('custom-class')
    })

    it('calls custom onKeyDown handler', async () => {
      const user = userEvent.setup()
      
      render(
        <TextCellEditor
          value="Test"
          onChange={mockOnChange}
          onComplete={mockOnComplete}
          onKeyDown={mockOnKeyDown}
        />
      )

      const input = screen.getByRole('textbox')
      await user.type(input, 'a')

      expect(mockOnKeyDown).toHaveBeenCalled()
    })
  })
})