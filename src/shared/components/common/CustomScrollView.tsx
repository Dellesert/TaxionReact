import React, { useEffect, useRef, useId, useImperativeHandle, forwardRef } from 'react';
import { View, ScrollView, Platform, StyleSheet, ViewStyle, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';

export interface CustomScrollViewRef {
  scrollTo: (options: { x?: number; y?: number; animated?: boolean }) => void;
}

interface CustomScrollViewProps {
  /** Scroll direction */
  horizontal?: boolean;
  /** Scrollbar thumb color. Default: 'rgba(128,128,128,0.35)' */
  thumbColor?: string;
  /** Scrollbar thumb color on thumb hover. Default: slightly more opaque than thumbColor */
  thumbHoverColor?: string;
  /** 'hover' — show on mouse hover only, 'always' — always visible. Default: 'hover' */
  visibility?: 'hover' | 'always';
  /** Scrollbar thickness in px. Default: 6 */
  size?: number;
  /** Style for the scroll container */
  style?: ViewStyle;
  /** Style applied to the content wrapper (like contentContainerStyle) */
  contentContainerStyle?: ViewStyle;
  /** Scroll event callback (RN-compatible format) */
  onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  /** Scroll event throttle in ms (native only, web uses passive listener) */
  scrollEventThrottle?: number;
  /** Whether scrolling is enabled. Default: true */
  scrollEnabled?: boolean;
  children: React.ReactNode;
}

/**
 * Custom-styled scrollable container.
 * On web/Electron renders a View with CSS-styled thin scrollbar.
 * On native falls back to regular ScrollView.
 */
export const CustomScrollView = forwardRef<CustomScrollViewRef, CustomScrollViewProps>(({
  horizontal = false,
  thumbColor = 'rgba(128,128,128,0.35)',
  thumbHoverColor,
  visibility = 'hover',
  size = 6,
  style,
  contentContainerStyle,
  onScroll,
  scrollEventThrottle,
  scrollEnabled = true,
  children,
}, forwardedRef) => {
  const uniqueId = useId();
  const className = `custom-scroll-${uniqueId.replace(/:/g, '')}`;
  const ref = useRef<any>(null);
  const nativeScrollRef = useRef<ScrollView>(null);

  const resolvedThumbHover = thumbHoverColor || (() => {
    // hex with alpha: #RRGGBBAA → bump alpha
    if (/^#[0-9a-fA-F]{8}$/.test(thumbColor)) {
      const alpha = parseInt(thumbColor.slice(7, 9), 16);
      const newAlpha = Math.min(alpha + 50, 255).toString(16).padStart(2, '0');
      return thumbColor.slice(0, 7) + newAlpha;
    }
    // rgba(r,g,b,a) → bump alpha
    return thumbColor.replace(/[\d.]+\)$/, (match) => {
      const opacity = Math.min(parseFloat(match) + 0.2, 1);
      return `${opacity})`;
    });
  })();

  // Expose scrollTo via ref
  useImperativeHandle(forwardedRef, () => ({
    scrollTo: (options: { x?: number; y?: number; animated?: boolean }) => {
      if (Platform.OS === 'web' && ref.current) {
        const el = ref.current as HTMLElement;
        const behavior = options.animated === false ? 'instant' : 'smooth';
        el.scrollTo({
          left: options.x ?? 0,
          top: options.y ?? 0,
          behavior: behavior as ScrollBehavior,
        });
      } else if (nativeScrollRef.current) {
        nativeScrollRef.current.scrollTo(options);
      }
    },
  }), []);

  // Inject CSS for custom scrollbar
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const styleEl = document.createElement('style');
    styleEl.dataset.customScroll = className;

    const axis = horizontal ? 'x' : 'y';
    const sizeProp = horizontal ? 'height' : 'width';
    const isHover = visibility === 'hover';
    const idleThumb = isHover ? 'transparent' : thumbColor;
    const overflowDisabled = scrollEnabled ? 'auto' : 'hidden';

    styleEl.textContent = `
      .${className} {
        overflow-${axis}: ${overflowDisabled};
        overflow-${horizontal ? 'y' : 'x'}: hidden;
        scrollbar-width: thin;
        scrollbar-color: ${idleThumb} transparent;
        transition: scrollbar-color 0.3s ease;
      }
      .${className}::-webkit-scrollbar {
        ${sizeProp}: ${size}px;
      }
      .${className}::-webkit-scrollbar-track {
        background: transparent;
      }
      .${className}::-webkit-scrollbar-thumb {
        background-color: ${idleThumb};
        border-radius: ${Math.round(size / 2)}px;
        transition: background-color 0.3s ease;
      }
      ${isHover ? `
      .${className}:hover {
        scrollbar-color: ${thumbColor} transparent;
      }
      .${className}:hover::-webkit-scrollbar-thumb {
        background-color: ${thumbColor};
        transition: background-color 0.15s ease;
      }` : ''}
      .${className}::-webkit-scrollbar-thumb:hover {
        background-color: ${resolvedThumbHover};
        transition: background-color 0.1s ease;
      }
    `;

    document.head.appendChild(styleEl);
    return () => { styleEl.remove(); };
  }, [className, horizontal, thumbColor, resolvedThumbHover, visibility, size, scrollEnabled]);

  useEffect(() => {
    if (Platform.OS === 'web' && ref.current?.classList) {
      ref.current.classList.add(className);
    }
  }, [className]);

  // Attach DOM scroll listener on web to translate to RN-compatible onScroll
  useEffect(() => {
    if (Platform.OS !== 'web' || !onScroll || !ref.current) return;

    const el = ref.current as HTMLElement;

    const handler = () => {
      const event = {
        nativeEvent: {
          contentOffset: { x: el.scrollLeft, y: el.scrollTop },
          contentSize: { width: el.scrollWidth, height: el.scrollHeight },
          layoutMeasurement: { width: el.clientWidth, height: el.clientHeight },
        },
      } as NativeSyntheticEvent<NativeScrollEvent>;
      onScroll(event);
    };

    el.addEventListener('scroll', handler, { passive: true });
    return () => { el.removeEventListener('scroll', handler); };
  }, [onScroll]);

  // Native fallback
  if (Platform.OS !== 'web') {
    return (
      <ScrollView
        ref={nativeScrollRef}
        horizontal={horizontal}
        showsHorizontalScrollIndicator={horizontal}
        showsVerticalScrollIndicator={!horizontal}
        style={style}
        contentContainerStyle={contentContainerStyle}
        onScroll={onScroll}
        scrollEventThrottle={scrollEventThrottle}
        scrollEnabled={scrollEnabled}
      >
        {children}
      </ScrollView>
    );
  }

  return (
    <View
      ref={ref}
      style={[
        horizontal ? styles.horizontalContainer : styles.verticalContainer,
        style,
      ]}
    >
      {contentContainerStyle ? (
        <View style={contentContainerStyle}>{children}</View>
      ) : (
        children
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  horizontalContainer: {
    flexDirection: 'row',
  },
  verticalContainer: {
    flexDirection: 'column',
  },
});
