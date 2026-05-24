import { useEffect, useRef, useState } from 'react';
import { useUiStore } from '../../store/ui.store';

export default function GlobalLoadingBar() {
  const isGlobalLoading = useUiStore((state) => state.isGlobalLoading);
  const [isVisible, setIsVisible] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const finishTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (isGlobalLoading) {
      if (finishTimeoutRef.current) {
        window.clearTimeout(finishTimeoutRef.current);
        finishTimeoutRef.current = null;
      }
      setIsVisible(true);
      setIsFinishing(false);
      return;
    }

    if (isVisible) {
      setIsFinishing(true);
      finishTimeoutRef.current = window.setTimeout(() => {
        setIsVisible(false);
        setIsFinishing(false);
        finishTimeoutRef.current = null;
      }, 320);
    }
  }, [isGlobalLoading, isVisible]);

  useEffect(() => () => {
    if (finishTimeoutRef.current) {
      window.clearTimeout(finishTimeoutRef.current);
    }
  }, []);

  if (!isVisible) {
    return null;
  }

  return (
    <>
      <style>{`
        @keyframes alumex-loading {
          from { width: 0%; }
          to { width: 85%; }
        }
      `}</style>
      <div
        className="fixed left-0 top-0 z-9999 h-0.75 bg-amber-500"
        style={{
          animation: isGlobalLoading ? 'alumex-loading 800ms ease-out forwards' : undefined,
          width: isFinishing ? '100%' : '85%',
          opacity: isFinishing ? 0 : 1,
          transition: isFinishing ? 'width 200ms ease, opacity 200ms ease' : 'opacity 150ms ease',
        }}
      />
    </>
  );
}
