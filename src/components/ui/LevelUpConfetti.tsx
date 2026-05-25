import { useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { useGamificationStore, computeXP, getRankForXP } from '@/stores/useGamificationStore';
import { useThemeStore } from '@/stores/useThemeStore';

export function LevelUpConfetti() {
  const gamificationState = useGamificationStore();
  const xp = computeXP(gamificationState as any);
  const currentRank = getRankForXP(xp);
  
  const previousRankRef = useRef(currentRank.name);

  useEffect(() => {
    if (currentRank.name !== previousRankRef.current) {
      // Rank Up Detected!
      previousRankRef.current = currentRank.name;
      
      const duration = 3000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 5,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#a855f7', '#ec4899', '#fcd34d']
        });
        confetti({
          particleCount: 5,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#a855f7', '#ec4899', '#fcd34d']
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      
      frame();

      // Gamification toast
      console.log(`Rank Up! You are now a ${currentRank.name}!`);
    }
  }, [currentRank.name]);

  return null;
}
