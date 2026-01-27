/**
 * TitleBarPollDetailControls
 * Компактные кнопки действий для деталей опроса в Electron TitleBar
 */

import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
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
  onOpenMenu?: (position: { x: number; y: number }) => void;
}

export const TitleBarPollDetailControls: React.FC<TitleBarPollDetailControlsProps> = ({
  poll,
  canEdit,
  canDeleteOrClose,
  isPublishing,
  isDeleting,
  onPublish,
  onClose,
  onEdit,
  onDelete,
}) => {
  const { theme } = useTheme();

  if (!poll) return null;

  return (
    <View style={styles.container}>
      {/* Publish Button (только для черновиков) */}
      {poll.status === 'draft' && (
        <View
          style={[styles.actionButton, { backgroundColor: theme.backgroundTertiary }]}
          // @ts-ignore - Web-only
          onClick={isPublishing ? undefined : onPublish}
          title="Опубликовать"
          onMouseEnter={(e: any) => !isPublishing && e.currentTarget?.style && (e.currentTarget.style.backgroundColor = theme.border)}
          onMouseLeave={(e: any) => e.currentTarget?.style && (e.currentTarget.style.backgroundColor = theme.backgroundTertiary)}
        >
          {isPublishing ? (
            <ActivityIndicator size="small" color={theme.primary} />
          ) : (
            <Ionicons name="checkmark-circle-outline" size={14} color={theme.primary} />
          )}
        </View>
      )}

      {/* Close Button (завершить опрос) */}
      {canDeleteOrClose && poll.status === 'active' && (
        <View
          style={[styles.actionButton, { backgroundColor: theme.backgroundTertiary }]}
          // @ts-ignore - Web-only
          onClick={onClose}
          title="Завершить опрос"
          onMouseEnter={(e: any) => e.currentTarget?.style && (e.currentTarget.style.backgroundColor = theme.border)}
          onMouseLeave={(e: any) => e.currentTarget?.style && (e.currentTarget.style.backgroundColor = theme.backgroundTertiary)}
        >
          <Ionicons name="lock-closed-outline" size={14} color="#F59E0B" />
        </View>
      )}

      {/* Edit Button */}
      {canEdit && (
        <View
          style={[styles.actionButton, { backgroundColor: theme.backgroundTertiary }]}
          // @ts-ignore - Web-only
          onClick={onEdit}
          title="Редактировать"
          onMouseEnter={(e: any) => e.currentTarget?.style && (e.currentTarget.style.backgroundColor = theme.border)}
          onMouseLeave={(e: any) => e.currentTarget?.style && (e.currentTarget.style.backgroundColor = theme.backgroundTertiary)}
        >
          <Ionicons name="create-outline" size={14} color={theme.text} />
        </View>
      )}

      {/* Delete Button */}
      {canDeleteOrClose && (
        <View
          style={[styles.deleteButton, { backgroundColor: theme.backgroundTertiary }]}
          // @ts-ignore - Web-only
          onClick={isDeleting ? undefined : onDelete}
          title="Удалить"
          onMouseEnter={(e: any) => !isDeleting && e.currentTarget?.style && (e.currentTarget.style.backgroundColor = '#FEE2E2')}
          onMouseLeave={(e: any) => e.currentTarget?.style && (e.currentTarget.style.backgroundColor = theme.backgroundTertiary)}
        >
          {isDeleting ? (
            <ActivityIndicator size="small" color="#EF4444" />
          ) : (
            <Ionicons name="trash-outline" size={14} color="#EF4444" />
          )}
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
  actionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
    borderRadius: 6,
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
  } as any,
  deleteButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
    borderRadius: 6,
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
  } as any,
});
