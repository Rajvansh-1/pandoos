import React, { useEffect } from 'react';
import { motion, AnimatePresence, useDragControls, type PanInfo } from 'framer-motion';
import { cn } from '@/utils/cn';
import { SWIPE_CLOSE_THRESHOLD } from '@/utils/constants';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  /** If true, the sheet takes up the full screen height */
  fullScreen?: boolean;
}

/**
 * BottomSheet — Swipe-to-close mobile sheet.
 *
 * Ghost-overlay fix:
 * - Uses AnimatePresence + conditional rendering so the entire DOM node is
 *   REMOVED after the exit animation completes — no invisible overlay lingers.
 * - The outer wrapper gets `pointer-events-none` immediately when closing so
 *   there is zero gap between "user taps close" and "page becomes interactive".
 * - Body scroll lock is properly restored on unmount.
 */
export function BottomSheet({
  isOpen,
  onClose,
  children,
  className,
  fullScreen = false,
}: BottomSheetProps) {
  const dragControls = useDragControls();

  // Body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleDragEnd = (_: never, info: PanInfo) => {
    if (info.velocity.y > 20 || info.offset.y > SWIPE_CLOSE_THRESHOLD) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[500] flex flex-col justify-end"
          // The outer wrapper instantly gets pointer-events-none when exit starts.
          initial={{ pointerEvents: 'auto' }}
          animate={{ pointerEvents: 'auto' }}
          exit={{ pointerEvents: 'none' }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.3 } }}
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            className={cn(
              'relative w-full bg-surface-base shadow-glass flex flex-col',
              fullScreen
                ? 'h-[100dvh] rounded-none border-none'
                : 'max-h-[90vh] rounded-t-4xl border-t border-white/10',
              className
            )}
            initial={{ y: '100%' }}
            animate={{ y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } }}
            exit={{ y: '100%', transition: { duration: 0.4, ease: [0.4, 0, 1, 1] } }}
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={handleDragEnd}
            // Stop ALL pointer events from bleeding through the sheet to the page
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag Handle */}
            <div
              className="w-full pt-3 pb-1 cursor-grab active:cursor-grabbing touch-none flex justify-center shrink-0"
              onPointerDown={(e) => dragControls.start(e)}
            >
              {!fullScreen && <div className="w-12 h-1.5 rounded-full bg-white/20" />}
            </div>

            {/* Content — fills sheet, scrolls internally */}
            <div className="flex-1 min-h-0 overflow-hidden">
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
