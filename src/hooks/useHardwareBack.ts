import { useEffect, useRef, useState } from 'react';

/**
 * A hook that handles the hardware (or browser) back button for overlays/modals.
 * It pushes a dummy state to the history stack when the overlay opens.
 * When the back button is pressed, it intercepts the popstate event and calls onClose.
 * If the overlay is closed via the UI, it automatically pops the dummy state to keep history clean.
 */
export function useHardwareBack(isOpen: boolean, onClose: () => void) {
  const isPopped = useRef(false);
  const onCloseRef = useRef(onClose);
  // Keep the stateId stable for the lifecycle of the component
  const [stateId] = useState(() => Math.random().toString(36).substring(7));

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;

    isPopped.current = false;
    
    // Push a state specific to this instance
    window.history.pushState({ pandoosModal: stateId }, '');

    const handlePopState = (e: PopStateEvent) => {
      // If the current history state is OUR state, it means we just arrived AT this state
      // (e.g. a modal on top of us was closed and popped its state).
      // We are now the active modal again, so we DO NOT close ourselves.
      if (e.state?.pandoosModal === stateId) {
        return;
      }

      // Otherwise, the state is no longer ours (we popped back past our state)
      // This means the user pressed back while we were the active modal.
      isPopped.current = true;
      onCloseRef.current();
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      
      // If the modal is closing (isOpen = false or unmounting) 
      // and it WAS NOT caused by the hardware back button:
      if (!isPopped.current) {
        // We need to clean up the history stack.
        // Only go back if our state is currently at the top of the history stack.
        if (window.history.state?.pandoosModal === stateId) {
          window.history.back();
        }
      }
    };
  }, [isOpen, stateId]);
}
