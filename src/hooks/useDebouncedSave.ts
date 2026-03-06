import { useRef, useCallback, useEffect } from 'react'

/**
 * Returns a debounced save function that delays execution until
 * the user stops typing for the given delay (default 600ms).
 * Automatically cleans up pending timers on unmount.
 */
export function useDebouncedSave<T>(
    saveFn: (value: T) => Promise<void> | void,
    delay = 600
) {
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    useEffect(() => {
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current)
        }
    }, [])

    return useCallback(
        (value: T) => {
            if (timerRef.current) clearTimeout(timerRef.current)
            timerRef.current = setTimeout(() => {
                saveFn(value)
            }, delay)
        },
        [saveFn, delay]
    )
}
