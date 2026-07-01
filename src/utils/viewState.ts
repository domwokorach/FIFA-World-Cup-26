import { useEffect, useState } from 'react'

/** useState persisted to localStorage — for remembering filter/view choices.
 * Pass `validate` to reject stored JSON of the wrong shape back to `initial`. */
export function usePersistentState<T>(
  key: string,
  initial: T,
  validate?: (parsed: unknown) => boolean,
): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key)
      if (raw !== null) {
        const parsed: unknown = JSON.parse(raw)
        if (!validate || validate(parsed)) return parsed as T
      }
    } catch {
      /* corrupted/blocked storage: fall back */
    }
    return initial
  })
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      /* private mode quota: view state is best-effort */
    }
  }, [key, value])
  return [value, setValue]
}
