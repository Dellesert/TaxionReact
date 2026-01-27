/**
 * TitleBarPollDetailControls
 * Компактные кнопки действий для деталей опроса в Electron TitleBar
 */

import React from 'react';
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
          style={[styles.button, { borderColor: theme.border }]}
          // @ts-ignore - Web-only event handlers
          onClick={isPublishing ? undefined : onPublish}
          onMouseEnter={(e: any) => {
            if (!isPublishing && e.currentTarget?.style) {
              e.currentTarget.style.backgroundColor = theme.backgroundTertiary;
            }
          }}
          onMouseLeave={(e: any) => {
            if (e.currentTarget?.style) {
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
        >
          {isPublishing ? (
            <ActivityIndicator size="small" color={theme.primary} />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={12} color={theme.primary} />
              <Text style={[styles.buttonText, { color: theme.primary }]}>Опубликовать</Text>
            </>
          )}
        </View>
      )}

      {/* Close Button (завершить опрос) */}
      {canDeleteOrClose && poll.status === 'active' && (
        <View
          style={[styles.button, { borderColor: theme.border }]}
          // @ts-ignore - Web-only event handlers
          onClick={onClose}
          onMouseEnter={(e: any) => {
            if (e.currentTarget?.style) {
              e.currentTarget.style.backgroundColor = theme.backgroundTertiary;
            }
          }}
          onMouseLeave={(e: any) => {
            if (e.currentTarget?.style) {
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
        >
          <Ionicons name="lock-closed-outline" size={12} color="#F59E0B" />
          <Text style={[styles.buttonText, { color: '#F59E0B' }]}>Завершить</Text>
        </View>
      )}

      {/* Edit Button */}
      {canEdit && (
        <View
          style={[styles.button, { borderColor: theme.border }]}
          // @ts-ignore - Web-only event handlers
          onClick={onEdit}
          onMouseEnter={(e: any) => {
            if (e.currentTarget?.style) {
              e.currentTarget.style.backgroundColor = theme.backgroundTertiary;
            }
          }}
          onMouseLeave={(e: any) => {
            if (e.currentTarget?.style) {
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
        >
          <Ionicons name="create-outline" size={12} color={theme.text} />
          <Text style={[styles.buttonText, { color: theme.text }]}>Редактировать</Text>
        </View>
      )}

      {/* Delete Button */}
      {canDeleteOrClose && (
        <View
          style={[styles.deleteButton, { borderColor: '#FEE2E2' }]}
          // @ts-ignore - Web-only event handlers
          onClick={isDeleting ? undefined : onDelete}
          onMouseEnter={(e: any) => {
            if (!isDeleting && e.currentTarget?.style) {
              e.currentTarget.style.backgroundColor = '#FEE2E2';
            }
          }}
          onMouseLeave={(e: any) => {
            if (e.currentTarget?.style) {
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
        >
          {isDeleting ? (
            <ActivityIndicator size="small" color="#EF4444" />
          ) : (
            <>
              <Ionicons name="trash-outline" size={12} color="#EF4444" />
              <Text style={[styles.buttonText, { color: '#EF4444' }]}>Удалить</Text>
            </>
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
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
  } as any,
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
  } as any,
  buttonText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
