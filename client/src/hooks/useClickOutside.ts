import { useEffect, type RefObject } from 'react';

export function useClickOutside(
  ref: RefObject<HTMLElement | null>,
  callback: () => void,
): void {
  useEffect(() => {
    const handleMouseDown = (event: MouseEvent) => {
      const element = ref.current;

      if (!element) {
        return;
      }

      if (!element.contains(event.target as Node)) {
        callback();
      }
    };

    document.addEventListener('mousedown', handleMouseDown);

    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, [ref, callback]);
}
