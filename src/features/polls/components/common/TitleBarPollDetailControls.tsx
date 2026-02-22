/**
 * TitleBarPollDetailControls
 * Компактные кнопки действий для деталей опроса в Electron TitleBar
 * Кнопка публикации (для черновиков) + три точки меню
 */

import React, { useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import type { Poll } from '../../types/poll.types';

interface TitleBarPollDetailControlsProps {
  poll: Poll | null;
  canEdit: boolean;
  canDeleteOrClose: boolean;
  isPublishing: boolean;
  isDeleting: boolean;
  onPublish: () => void;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onOpenMenu: (position: { x: number; y: number; width: number; height: number }) => void;
}

export const TitleBarPollDetailControls: React.FC<TitleBarPollDetailControlsProps> = ({
  poll,
  canEdit,
  canDeleteOrClose,
  isPublishing,
  onPublish,
  onOpenMenu,
}) => {
  const { theme } = useTheme();
  const menuButtonRef = useRef<View>(null);

  const handleOpenMenu = () => {
    if (menuButtonRef.current) {
      // @ts-ignore - Web-only method
      const rect = menuButtonRef.current.getBoundingClientRect?.();
      if (rect) {
        onOpenMenu({
          x: rect.left,
          y: rect.top,
          width: rect.width,
          height: rect.height,
        });
      }
    }
  };

  if (!poll) return null;

  const showMenu = canEdit || canDeleteOrClose;

  return (
    <View style={styles.container}>
      {/* Publish Button (только для черновиков) */}
      {poll.status === 'draft' && (
        <View
          style={[styles.statusButton, { backgroundColor: theme.primary }]}
          // @ts-ignore - Web-only
          onClick={isPublishing ? undefined : onPublish}
          onMouseEnter={(e: any) => {
            if (e.currentTarget?.style && !isPublishing) e.currentTarget.style.opacity = '0.9';
          }}
          onMouseLeave={(e: any) => {
            if (e.currentTarget?.style) e.currentTarget.style.opacity = '1';
          }}
        >
          {isPublishing ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={12} color="#FFFFFF" />
              <Text style={styles.statusButtonText}>Опубликовать</Text>
            </>
          )}
        </View>
      )}

      {/* Menu Button (три точки) */}
      {showMenu && (
        <View
          // @ts-ignore - ref type
          ref={menuButtonRef}
          style={[styles.menuButton, { borderColor: theme.border }]}
          // @ts-ignore - Web-only
          onClick={handleOpenMenu}
          onMouseEnter={(e: any) => {
            if (e.currentTarget?.style) e.currentTarget.style.backgroundColor = theme.backgroundTertiary;
          }}
          onMouseLeave={(e: any) => {
            if (e.currentTarget?.style) e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <Ionicons name="ellipsis-horizontal" size={14} color={theme.text} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  } as any,
  statusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
    cursor: 'pointer',
    transition: 'opacity 0.15s ease',
  } as any,
  statusButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  menuButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
  } as any,
});
