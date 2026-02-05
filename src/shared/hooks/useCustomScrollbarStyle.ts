import { useEffect, useId, useCallback } from 'react';
import { Platform } from 'react-native';

interface CustomScrollbarOptions {
  /** Scrollbar thumb color. Default: 'rgba(128,128,128,0.35)' */
  thumbColor?: string;
  /** Scrollbar thumb color on hover. Default: slightly more opaque than thumbColor */
  thumbHoverColor?: string;
  /** 'hover' — show on mouse hover only, 'always' — always visible. Default: 'hover' */
  visibility?: 'hover' | 'always';
  /** Scrollbar thickness in px. Default: 6 */
  size?: number;
}

/**
 * Hook that applies custom CSS scrollbar styles to a container and all its
 * scrollable descendants (e.g. FlashList internal scroll containers).
 *
 * Works only on web — on native this is a no-op.
 *
 * Returns a callback ref that should be attached to the wrapper View.
 * The callback ref sets a `data-custom-scrollbar` attribute on the DOM element,
 * and the injected CSS targets it via attribute selectors.
 *
 * Supports multiple elements — each call to the returned ref applies the class
 * to that element, so it's safe to use in loops/maps.
 *
 * Usage:
 * ```tsx
 * const { scrollbarRef } = useCustomScrollbarStyle();
 *
 * return (
 *   <View ref={scrollbarRef} style={{ flex: 1 }}>
 *     <FlashList ... />
 *   </View>
 * );
 * ```
 */
export function useCustomScrollbarStyle(options: CustomScrollbarOptions = {}) {
  const {
    thumbColor = 'rgba(128,128,128,0.35)',
    thumbHoverColor,
    visibility = 'hover',
    size = 6,
  } = options;

  const uniqueId = useId();
  const attrValue = uniqueId.replace(/:/g, '');

  const resolvedThumbHover = thumbHoverColor || (() => {
    if (/^#[0-9a-fA-F]{8}$/.test(thumbColor)) {
      const alpha = parseInt(thumbColor.slice(7, 9), 16);
      const newAlpha = Math.min(alpha + 50, 255).toString(16).padStart(2, '0');
      return thumbColor.slice(0, 7) + newAlpha;
    }
    return thumbColor.replace(/[\d.]+\)$/, (match) => {
      const opacity = Math.min(parseFloat(match) + 0.2, 1);
      return `${opacity})`;
    });
  })();

  // Inject scoped CSS
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const styleEl = document.createElement('style');
    styleEl.dataset.customScrollbarStyle = attrValue;

    const isHover = visibility === 'hover';
    const idleThumb = isHover ? 'transparent' : thumbColor;

    const selector = `[data-custom-scrollbar="${attrValue}"]`;
    const childSelector = `${selector} *`;

    styleEl.textContent = `
      ${selector}, ${childSelector} {
        scrollbar-width: thin;
        scrollbar-color: ${idleThumb} transparent;
        transition: scrollbar-color 0.3s ease;
      }
      ${selector}::-webkit-scrollbar, ${childSelector}::-webkit-scrollbar {
        width: ${size}px;
        height: ${size}px;
      }
      ${selector}::-webkit-scrollbar-track, ${childSelector}::-webkit-scrollbar-track {
        background: transparent;
      }
      ${selector}::-webkit-scrollbar-thumb, ${childSelector}::-webkit-scrollbar-thumb {
        background-color: ${idleThumb};
        border-radius: ${Math.round(size / 2)}px;
        transition: background-color 0.3s ease;
      }
      ${isHover ? `
      ${selector}:hover, ${childSelector}:hover {
        scrollbar-color: ${thumbColor} transparent;
      }
      ${selector}:hover::-webkit-scrollbar-thumb, ${childSelector}:hover::-webkit-scrollbar-thumb {
        background-color: ${thumbColor};
        transition: background-color 0.15s ease;
      }` : ''}
      ${selector}::-webkit-scrollbar-thumb:hover, ${childSelector}::-webkit-scrollbar-thumb:hover {
        background-color: ${resolvedThumbHover};
        transition: background-color 0.1s ease;
      }
    `;

    document.head.appendChild(styleEl);
    return () => { styleEl.remove(); };
  }, [attrValue, thumbColor, resolvedThumbHover, visibility, size]);

  /**
   * Callback ref — attach to any View.
   * On web it sets a data attribute on the underlying DOM node.
   * On native it's a no-op.
   */
  const scrollbarRef = useCallback((node: any) => {
    if (Platform.OS !== 'web' || !node) return;

    // React Native Web: the ref may be the DOM element directly
    // or a component instance with a ref to the DOM element
    const el = (node as HTMLElement);
    if (el && el.setAttribute) {
      el.setAttribute('data-custom-scrollbar', attrValue);
    }
  }, [attrValue]);

  return { scrollbarRef };
}
