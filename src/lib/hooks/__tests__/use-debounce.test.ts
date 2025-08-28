import { renderHook, act } from '@testing-library/react'
import { useDebounce, useDebouncedValue, useAsyncDebounce, useDebounceImmediate } from '../use-debounce'

// Mock timers
jest.useFakeTimers()

describe('useDebounce', () => {
  beforeEach(() => {
    jest.clearAllTimers()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  it('debounces function calls', () => {
    const mockCallback = jest.fn()
    const { result } = renderHook(() => useDebounce(mockCallback, 1000))

    // Call the debounced function multiple times
    act(() => {
      result.current('arg1')
      result.current('arg2')
      result.current('arg3')
    })

    // Callback should not be called yet
    expect(mockCallback).not.toHaveBeenCalled()

    // Fast-forward time
    act(() => {
      jest.advanceTimersByTime(1000)
    })

    // Callback should be called once with the last arguments
    expect(mockCallback).toHaveBeenCalledTimes(1)
    expect(mockCallback).toHaveBeenCalledWith('arg3')
  })

  it('cancels previous timeout when called again', () => {
    const mockCallback = jest.fn()
    const { result } = renderHook(() => useDebounce(mockCallback, 1000))

    act(() => {
      result.current('arg1')
    })

    // Advance time partially
    act(() => {
      jest.advanceTimersByTime(500)
    })

    // Call again before timeout
    act(() => {
      result.current('arg2')
    })

    // Advance remaining time from first call
    act(() => {
      jest.advanceTimersByTime(500)
    })

    // Should not be called yet
    expect(mockCallback).not.toHaveBeenCalled()

    // Advance full delay from second call
    act(() => {
      jest.advanceTimersByTime(500)
    })

    // Should be called with second argument
    expect(mockCallback).toHaveBeenCalledTimes(1)
    expect(mockCallback).toHaveBeenCalledWith('arg2')
  })

  it('updates when callback or delay changes', () => {
    const mockCallback1 = jest.fn()
    const mockCallback2 = jest.fn()
    
    const { result, rerender } = renderHook(
      ({ callback, delay }) => useDebounce(callback, delay),
      { initialProps: { callback: mockCallback1, delay: 1000 } }
    )

    act(() => {
      result.current('test')
    })

    // Change callback
    rerender({ callback: mockCallback2, delay: 1000 })

    act(() => {
      jest.advanceTimersByTime(1000)
    })

    // Should call the new callback
    expect(mockCallback1).not.toHaveBeenCalled()
    expect(mockCallback2).toHaveBeenCalledWith('test')
  })
})

describe('useDebouncedValue', () => {
  beforeEach(() => {
    jest.clearAllTimers()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  it('returns initial value immediately', () => {
    const { result } = renderHook(() => useDebouncedValue('initial', 1000))
    expect(result.current).toBe('initial')
  })

  it('debounces value updates', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 1000),
      { initialProps: { value: 'initial' } }
    )

    expect(result.current).toBe('initial')

    // Update value
    rerender({ value: 'updated' })
    expect(result.current).toBe('initial') // Should still be initial

    // Fast-forward time
    act(() => {
      jest.advanceTimersByTime(1000)
    })

    expect(result.current).toBe('updated')
  })

  it('cancels previous update when value changes again', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 1000),
      { initialProps: { value: 'initial' } }
    )

    // First update
    rerender({ value: 'first' })
    
    // Advance time partially
    act(() => {
      jest.advanceTimersByTime(500)
    })

    // Second update before first completes
    rerender({ value: 'second' })

    // Complete original delay
    act(() => {
      jest.advanceTimersByTime(500)
    })

    // Should still be initial
    expect(result.current).toBe('initial')

    // Complete second delay
    act(() => {
      jest.advanceTimersByTime(500)
    })

    // Should be second value
    expect(result.current).toBe('second')
  })
})

describe('useAsyncDebounce', () => {
  beforeEach(() => {
    jest.clearAllTimers()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  it('debounces async function calls', async () => {
    const mockAsyncCallback = jest.fn().mockResolvedValue('result')
    const { result } = renderHook(() => useAsyncDebounce(mockAsyncCallback, 1000))

    expect(result.current.isPending).toBe(false)

    // Call debounced function
    let promise: Promise<any>
    act(() => {
      promise = result.current.debouncedFn('arg')
    })

    expect(result.current.isPending).toBe(true)
    expect(mockAsyncCallback).not.toHaveBeenCalled()

    // Fast-forward time
    act(() => {
      jest.advanceTimersByTime(1000)
    })

    // Wait for async operation
    const resolvedValue = await promise!
    expect(resolvedValue).toBe('result')
    expect(mockAsyncCallback).toHaveBeenCalledWith('arg')
    expect(result.current.isPending).toBe(false)
  })

  it('cancels previous operation when called again', async () => {
    const mockAsyncCallback = jest.fn().mockResolvedValue('result')
    const { result } = renderHook(() => useAsyncDebounce(mockAsyncCallback, 1000))

    // First call
    let promise1: Promise<any>
    act(() => {
      promise1 = result.current.debouncedFn('arg1')
    })

    // Second call before first completes
    let promise2: Promise<any>
    act(() => {
      promise2 = result.current.debouncedFn('arg2')
    })

    // Fast-forward time
    act(() => {
      jest.advanceTimersByTime(1000)
    })

    // Only second call should execute
    const result2 = await promise2!
    expect(result2).toBe('result')
    expect(mockAsyncCallback).toHaveBeenCalledTimes(1)
    expect(mockAsyncCallback).toHaveBeenCalledWith('arg2')
  })

  it('handles async errors', async () => {
    const mockAsyncCallback = jest.fn().mockRejectedValue(new Error('Test error'))
    const { result } = renderHook(() => useAsyncDebounce(mockAsyncCallback, 1000))

    let promise: Promise<any>
    act(() => {
      promise = result.current.debouncedFn('arg')
    })

    act(() => {
      jest.advanceTimersByTime(1000)
    })

    await expect(promise!).rejects.toThrow('Test error')
    expect(result.current.isPending).toBe(false)
  })

  it('can be cancelled manually', () => {
    const mockAsyncCallback = jest.fn().mockResolvedValue('result')
    const { result } = renderHook(() => useAsyncDebounce(mockAsyncCallback, 1000))

    act(() => {
      result.current.debouncedFn('arg')
    })

    expect(result.current.isPending).toBe(true)

    act(() => {
      result.current.cancel()
    })

    expect(result.current.isPending).toBe(false)

    act(() => {
      jest.advanceTimersByTime(1000)
    })

    expect(mockAsyncCallback).not.toHaveBeenCalled()
  })
})

describe('useDebounceImmediate', () => {
  beforeEach(() => {
    jest.clearAllTimers()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  it('executes immediately when immediate=true', () => {
    const mockCallback = jest.fn()
    const { result } = renderHook(() => useDebounceImmediate(mockCallback, 1000, true))

    act(() => {
      result.current('arg')
    })

    // Should be called immediately
    expect(mockCallback).toHaveBeenCalledTimes(1)
    expect(mockCallback).toHaveBeenCalledWith('arg')
  })

  it('does not execute immediately when immediate=false', () => {
    const mockCallback = jest.fn()
    const { result } = renderHook(() => useDebounceImmediate(mockCallback, 1000, false))

    act(() => {
      result.current('arg')
    })

    // Should not be called immediately
    expect(mockCallback).not.toHaveBeenCalled()

    act(() => {
      jest.advanceTimersByTime(1000)
    })

    // Should be called after delay
    expect(mockCallback).toHaveBeenCalledTimes(1)
    expect(mockCallback).toHaveBeenCalledWith('arg')
  })

  it('prevents immediate execution on subsequent calls', () => {
    const mockCallback = jest.fn()
    const { result } = renderHook(() => useDebounceImmediate(mockCallback, 1000, true))

    // First call - should execute immediately
    act(() => {
      result.current('arg1')
    })

    expect(mockCallback).toHaveBeenCalledTimes(1)

    // Second call before timeout - should not execute immediately
    act(() => {
      result.current('arg2')
    })

    expect(mockCallback).toHaveBeenCalledTimes(1) // Still only once

    // Wait for timeout
    act(() => {
      jest.advanceTimersByTime(1000)
    })

    // Should not call again (immediate mode doesn't call on timeout)
    expect(mockCallback).toHaveBeenCalledTimes(1)
  })

  it('allows immediate execution again after timeout', () => {
    const mockCallback = jest.fn()
    const { result } = renderHook(() => useDebounceImmediate(mockCallback, 1000, true))

    // First call
    act(() => {
      result.current('arg1')
    })

    expect(mockCallback).toHaveBeenCalledTimes(1)

    // Wait for timeout to complete
    act(() => {
      jest.advanceTimersByTime(1000)
    })

    // Second call after timeout - should execute immediately again
    act(() => {
      result.current('arg2')
    })

    expect(mockCallback).toHaveBeenCalledTimes(2)
    expect(mockCallback).toHaveBeenLastCalledWith('arg2')
  })

  it('defaults to immediate=false', () => {
    const mockCallback = jest.fn()
    const { result } = renderHook(() => useDebounceImmediate(mockCallback, 1000))

    act(() => {
      result.current('arg')
    })

    // Should not be called immediately (default behavior)
    expect(mockCallback).not.toHaveBeenCalled()

    act(() => {
      jest.advanceTimersByTime(1000)
    })

    expect(mockCallback).toHaveBeenCalledTimes(1)
  })
})