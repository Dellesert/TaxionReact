import React, { useEffect, useRef, useId } from 'react';
import { View, ScrollView, Platform, StyleSheet, ViewStyle } from 'react-native';

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
  children: React.ReactNode;
}

/**
 * Custom-styled scrollable container.
 * On web/Electron renders a View with CSS-styled thin scrollbar.
 * On native falls back to regular ScrollView.
 */
export const CustomScrollView: React.FC<CustomScrollViewProps> = ({
  horizontal = false,
  thumbColor = 'rgba(128,128,128,0.35)',
  thumbHoverColor,
  visibility = 'hover',
  size = 6,
  style,
  contentContainerStyle,
  children,
}) => {
  const uniqueId = useId();
  const className = `custom-scroll-${uniqueId.replace(/:/g, '')}`;
  const ref = useRef<any>(null);

  const resolvedThumbHover = thumbHoverColor || thumbColor.replace(/[\d.]+\)$/, (match) => {
    const opacity = Math.min(parseFloat(match) + 0.2, 1);
    return `${opacity})`;
  });

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const styleEl = document.createElement('style');
    styleEl.dataset.customScroll = className;

    const axis = horizontal ? 'x' : 'y';
    const sizeProp = horizontal ? 'height' : 'width';
    const isHover = visibility === 'hover';
    const idleThumb = isHover ? 'transparent' : thumbColor;

    styleEl.textContent = `
      .${className} {
        overflow-${axis}: auto;
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
  }, [className, horizontal, thumbColor, resolvedThumbHover, visibility, size]);

  useEffect(() => {
    if (Platform.OS === 'web' && ref.current?.classList) {
      ref.current.classList.add(className);
    }
  }, [className]);

  // Native fallback
  if (Platform.OS !== 'web') {
    return (
      <ScrollView
        horizontal={horizontal}
        showsHorizontalScrollIndicator={horizontal}
        showsVerticalScrollIndicator={!horizontal}
        style={style}
        contentContainerStyle={contentContainerStyle}
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
};

const styles = StyleSheet.create({
  horizontalContainer: {
    flexDirection: 'row',
  },
  verticalContainer: {
    flexDirection: 'column',
  },
});
