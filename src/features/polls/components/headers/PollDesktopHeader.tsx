/**
 * Poll Desktop Header
 * Заголовок для экрана деталей опроса на десктопе с кнопками действий
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import type { Poll } from '../../types/poll.types';

interface PollDesktopHeaderProps {
  poll: Poll;
  canEdit: boolean;
  canDeleteOrClose: boolean;
  isDeleting: boolean;
  isPublishing: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onPublish: () => void;
  onClose: () => void;
  onBack: () => void;
}

export const PollDesktopHeader: React.FC<PollDesktopHeaderProps> = ({
  poll,
  canEdit,
  canDeleteOrClose,
  isDeleting,
  isPublishing,
  onEdit,
  onDelete,
  onPublish,
  onClose,
  onBack,
}) => {
  const { theme } = useTheme();

  return (
    <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
      <View style={styles.headerContent}>
        {/* Left side - Back button and Title */}
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBack}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>
            Опрос
          </Text>
        </View>

        {/* Right side - Action Buttons */}
        <View style={styles.headerRight}>
          {/* Publish Button (только для черновиков) */}
          {poll.status === 'draft' && (
            <TouchableOpacity
              style={[styles.actionButton, { borderColor: theme.border }]}
              onPress={onPublish}
              disabled={isPublishing}
            >
              {isPublishing ? (
                <ActivityIndicator size="small" color={theme.primary} />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={20} color={theme.primary} />
                  <Text style={[styles.actionButtonText, { color: theme.primary }]}>
                    Опубликовать
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {/* Close Button (завершить опрос) */}
          {canDeleteOrClose && poll.status === 'active' && (
            <TouchableOpacity
              style={[styles.actionButton, { borderColor: theme.border }]}
              onPress={onClose}
            >
              <Ionicons name="lock-closed-outline" size={20} color="#F59E0B" />
              <Text style={[styles.actionButtonText, { color: '#F59E0B' }]}>
                Завершить
              </Text>
            </TouchableOpacity>
          )}

          {/* Edit Button */}
          {canEdit && (
            <TouchableOpacity
              style={[styles.actionButton, { borderColor: theme.border }]}
              onPress={onEdit}
            >
              <Ionicons name="create-outline" size={20} color={theme.text} />
              <Text style={[styles.actionButtonText, { color: theme.text }]}>
                Редактировать
              </Text>
            </TouchableOpacity>
          )}

          {/* Delete Button */}
          {canDeleteOrClose && (
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={onDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color="#EF4444" />
              ) : (
                <>
                  <Ionicons name="trash-outline" size={20} color="#EF4444" />
                  <Text style={[styles.actionButtonText, { color: '#EF4444' }]}>
                    Удалить
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
      },
    }),
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 24,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
    minWidth: 0,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transitionProperty: 'background-color',
        transitionDuration: '0.15s',
      },
    }),
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.4,
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexShrink: 0,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 2,
    gap: 8,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transitionProperty: 'background-color, border-color, transform',
        transitionDuration: '0.15s',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.06)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 1,
      },
    }),
  },
  deleteButton: {
    borderColor: '#FEE2E2',
    ...Platform.select({
      web: {
        '&:hover': {
          backgroundColor: '#FEE2E2',
        },
      },
    }),
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
});
