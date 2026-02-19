/**
 * useAnimationType Hook
 * Возвращает animationType для Modal: "none" при включённом режиме уменьшения анимаций
 */

import { useAnimationStore } from '@shared/store/animationStore';

type ModalAnimationType = 'none' | 'slide' | 'fade';

export const useAnimationType = (
  preferred: ModalAnimationType = 'fade'
): ModalAnimationType => {
  const reduceAnimations = useAnimationStore((s) => s.reduceAnimations);
  return reduceAnimations ? 'none' : preferred;
};
