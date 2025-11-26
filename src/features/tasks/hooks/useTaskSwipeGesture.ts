import { Platform, Dimensions } from 'react-native';
import { Gesture } from 'react-native-gesture-handler';
import { useSharedValue, withTiming, runOnJS } from 'react-native-reanimated';
import { StatusTab, STATUS_TABS_ORDER } from '../utils/taskListHelpers';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;
const VELOCITY_THRESHOLD = 400;

/**
 * Custom hook for handling swipe gestures to switch tabs (iOS only)
 */
export const useTaskSwipeGesture = (
  currentTab: StatusTab,
  onTabChange: (tab: StatusTab) => void
) => {
  const translateX = useSharedValue(0);
  const isSwipingHorizontally = useSharedValue(false);
  const currentTabIndex = useSharedValue(STATUS_TABS_ORDER.indexOf(currentTab));

  /**
   * Reset swipe flag after animation
   */
  const resetSwipeFlag = () => {
    setTimeout(() => {
      isSwipingHorizontally.value = false;
    }, 100);
  };

  /**
   * Handle tab change from swipe
   */
  const handleTabChange = (tab: StatusTab) => {
    onTabChange(tab);
  };

  /**
   * Create pan gesture for swipe navigation
   */
  const swipeGesture = Gesture.Pan()
    .enabled(Platform.OS === 'ios')
    .maxPointers(1)
    .onBegin(() => {
      'worklet';
      isSwipingHorizontally.value = false;
    })
    .onUpdate((event) => {
      'worklet';
      const absX = Math.abs(event.translationX);
      const absY = Math.abs(event.translationY);

      if (absX > absY || absX > 3) {
        isSwipingHorizontally.value = true;
        const baseOffset = -currentTabIndex.value * SCREEN_WIDTH;
        translateX.value = baseOffset + event.translationX;
      }
    })
    .onEnd((event) => {
      'worklet';
      const currentIndex = currentTabIndex.value;

      const shouldSwitchTab =
        Math.abs(event.translationX) > SWIPE_THRESHOLD ||
        Math.abs(event.velocityX) > VELOCITY_THRESHOLD;

      let targetIndex = currentIndex;

      if (shouldSwitchTab && event.translationX > 0 && currentIndex > 0) {
        targetIndex = currentIndex - 1;
      } else if (shouldSwitchTab && event.translationX < 0 && currentIndex < 3) {
        targetIndex = currentIndex + 1;
      }

      const targetOffset = -targetIndex * SCREEN_WIDTH;

      translateX.value = withTiming(
        targetOffset,
        { duration: 200 },
        () => {
          'worklet';
          currentTabIndex.value = targetIndex;
        }
      );

      if (targetIndex !== currentIndex) {
        const newTab = STATUS_TABS_ORDER[targetIndex] || 'new';
        runOnJS(handleTabChange)(newTab);
      }

      runOnJS(resetSwipeFlag)();
    });

  /**
   * Update translateX when tab changes externally (e.g., from tab click)
   */
  const updateTranslateX = (tab: StatusTab) => {
    const newIndex = STATUS_TABS_ORDER.indexOf(tab);
    currentTabIndex.value = withTiming(newIndex, { duration: 250 });

    if (Platform.OS === 'ios') {
      translateX.value = withTiming(-newIndex * SCREEN_WIDTH, { duration: 300 });
    }
  };

  return {
    translateX,
    isSwipingHorizontally,
    currentTabIndex,
    swipeGesture,
    updateTranslateX,
  };
};
