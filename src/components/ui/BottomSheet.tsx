import React, { useEffect } from 'react';
import { motion, useAnimation, useDragControls, type PanInfo } from 'framer-motion';
import { cn } from '@/utils/cn';
import { SWIPE_CLOSE_THRESHOLD } from '@/utils/constants';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  /** If true, the sheet takes up the full screen height minus safe area */
  fullScreen?: boolean;
}

/**
 * Reusable Bottom Sheet with swipe-to-close gesture.
 * Designed for mobile-first interactions, fully Capacitor-ready.
 */
export function BottomSheet({ isOpen, onClose, children, className, fullScreen = false }: BottomSheetProps) {
  const controls = useAnimation();
  const dragControls = useDragControls();

  // Animate in/out when isOpen changes
  useEffect(() => {
    if (isOpen) {
      controls.start('visible');
      // Lock body scroll when open (important for iOS Safari)
      document.body.style.overflow = 'hidden';
    } else {
      controls.start('hidden');
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, controls]);

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    // If the user swiped down fast or dragged down far enough
    if (info.velocity.y > 20 || info.offset.y > SWIPE_CLOSE_THRESHOLD) {
      onClose();
    } else {
      // Snap back to top
      controls.start('visible');
    }
  };

  return (
    <motion.div
      className={cn(
        'fixed inset-0 z-50 flex flex-col justify-end pointer-events-none',
        !isOpen && 'hidden' // completely hide when animation finishes
      )}
      initial="hidden"
      animate={controls}
      variants={{
        visible: { pointerEvents: 'auto', transition: { staggerChildren: 0.1 } },
        hidden: { pointerEvents: 'none', transition: { when: 'afterChildren' } },
      }}
    >
      {/* Dark overlay backdrop */}
      <motion.div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        variants={{
          visible: { opacity: 1 },
          hidden: { opacity: 0 },
        }}
        initial="hidden"
        onClick={onClose}
      />

      {/* Sheet Content */}
      <motion.div
        className={cn(
          'relative w-full bg-surface-base shadow-glass flex flex-col',
          fullScreen ? 'h-[100dvh] rounded-none border-none' : 'max-h-[90vh] rounded-t-4xl border-t border-white/10',
          className
        )}
        variants={{
          visible: { y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
          hidden: { y: '100%', transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
        }}
        drag="y"
        dragControls={dragControls}
        dragListener={false} // Only listen via the drag handle
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.8 }}
        onDragEnd={handleDragEnd}
      >
        {/* Drag Handle Area */}
        <div
          className="w-full pt-3 pb-1 cursor-grab active:cursor-grabbing touch-none flex justify-center"
          onPointerDown={(e) => dragControls.start(e)}
        >
          {!fullScreen && <div className="w-12 h-1.5 rounded-full bg-white/20" />}
        </div>

        {/* Scrollable Content inside the sheet */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden scroll-container pb-safe">
          {children}
        </div>
      </motion.div>
    </motion.div>
  );
}
