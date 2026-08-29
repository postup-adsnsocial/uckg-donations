'use client';

import { useEffect } from 'react';

/** Prevents a focused numeric field from changing when the user scrolls. */
export function NumberInputWheelGuard() {
  useEffect(() => {
    function preventWheelValueChange(event: WheelEvent) {
      const target = event.target;
      if (
        !(target instanceof HTMLInputElement) ||
        target.type !== 'number' ||
        document.activeElement !== target
      ) {
        return;
      }

      event.preventDefault();
      target.blur();
    }

    document.addEventListener('wheel', preventWheelValueChange, {
      capture: true,
      passive: false,
    });
    return () =>
      document.removeEventListener('wheel', preventWheelValueChange, true);
  }, []);

  return null;
}
