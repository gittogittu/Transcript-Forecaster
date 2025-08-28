import { useCallback, useRef, useState, useEffect } from 'react'

/**
 * Hook for debouncing function calls
 * @param callback Function to debounce
 * @param delay Delay in milliseconds
 * @returns Debounced function
 */
export function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<NodeJS.Timeout>()

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args)
      }, delay)
    },
    [callback, delay]
  )
}

/**
 * Hook for debouncing values
 * @param value Value to debounce
 * @param delay Delay in milliseconds
 * @returns Debounced value
 */
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

/**
 * Hook for debouncing async operations with cancellation
 * @param asyncCallback Async function to debounce
 * @param delay Delay in milliseconds
 * @returns Object with debounced function and cancel method
 */
export function useAsyncDebounce<T extends (...args: any[]) => Promise<any>>(
  asyncCallback: T,
  delay: number
): {
  debouncedFn: (...args: Parameters<T>) => Promise<ReturnType<T>>
  cancel: () => void
  isPending: boolean
} {
  const timeoutRef = useRef<NodeJS.Timeout>()
  const abortControllerRef = useRef<AbortController>()
  const [isPending, setIsPending] = useState(false)

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    setIsPending(false)
  }, [])

  const debouncedFn = useCallback(
    (...args: Parameters<T>): Promise<ReturnType<T>> => {
      return new Promise((resolve, reject) => {
        // Cancel previous operation
        cancel()

        setIsPending(true)

        timeoutRef.current = setTimeout(async () => {
          try {
            abortControllerRef.current = new AbortController()
            const result = await asyncCallback(...args)
            setIsPending(false)
            resolve(result)
          } catch (error) {
            setIsPending(false)
            reject(error)
          }
        }, delay)
      })
    },
    [asyncCallback, delay, cancel]
  )

  return { debouncedFn, cancel, isPending }
}

/**
 * Hook for debouncing with immediate execution option
 * @param callback Function to debounce
 * @param delay Delay in milliseconds
 * @param immediate Whether to execute immediately on first call
 * @returns Debounced function
 */
export function useDebounceImmediate<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  immediate: boolean = false
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<NodeJS.Timeout>()
  const immediateRef = useRef<boolean>(immediate)

  return useCallback(
    (...args: Parameters<T>) => {
      const callNow = immediateRef.current && !timeoutRef.current

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = undefined
        if (!immediateRef.current) {
          callback(...args)
        }
      }, delay)

      if (callNow) {
        callback(...args)
      }
    },
    [callback, delay]
  )
}