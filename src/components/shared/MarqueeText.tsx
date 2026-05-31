import React, { useRef, useEffect, useState } from 'react';
import { cn } from '@/utils/cn';

interface MarqueeTextProps {
  text: string;
  className?: string;
}

export function MarqueeText({ text, className }: MarqueeTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    const checkOverflow = () => {
      if (containerRef.current && textRef.current) {
        // If the text is wider than its container, we need to scroll
        setIsOverflowing(textRef.current.offsetWidth > containerRef.current.offsetWidth);
      }
    };

    checkOverflow();
    window.addEventListener('resize', checkOverflow);
    return () => window.removeEventListener('resize', checkOverflow);
  }, [text]);

  return (
    <div ref={containerRef} className={cn('relative w-full overflow-hidden whitespace-nowrap flex', className)}>
      <div
        className={cn(
          'flex whitespace-nowrap min-w-full items-center',
          isOverflowing && 'animate-marquee'
        )}
      >
        <span ref={textRef} className="mr-8">
          {text}
        </span>
        {isOverflowing && (
          <span className="mr-8">
            {text}
          </span>
        )}
      </div>
    </div>
  );
}
