import React from 'react';
import { View, Text, TouchableOpacity, TextInput, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { Poll } from '../../types/poll.types';
import { spacing, shadows } from '@shared/constants/design-system.constants';

interface PollActionButtonsProps {
  poll: Poll;
  canDeleteOrClose: boolean;
  isCreatorOrAdmin: boolean;
  isRevoting: boolean;
  isVoting: boolean;
  isPublishing: boolean;
  showResults: boolean;
  comment: string;
  isDesktop?: boolean;
  onCommentChange: (text: string) => void;
  onVote: () => void;
  onRevote: () => void;
  onCancelRevote: () => void;
  onToggleResults: () => void;
  onPublish: () => void;
}

export const PollActionButtons: React.FC<PollActionButtonsProps> = ({
  poll,
  canDeleteOrClose,
  isCreatorOrAdmin,
  isRevoting,
  isVoting,
  isPublishing,
  showResults,
  comment,
  isDesktop = false,
  onCommentChange,
  onVote,
  onRevote,
  onCancelRevote,
  onToggleResults,
  onPublish,
}) => {
  const { theme } = useTheme();

  return (
    <View>
      {/* Draft warning and publish button */}
      {poll.status === 'draft' && (
        <>
          <View style={[styles.draftWarning, { borderColor: theme.warning }]}>
            <Ionicons name="information-circle" size={18} color={theme.warning} />
            <Text style={styles.draftWarningText}>
              Это черновик. Опрос еще не опубликован и недоступен для голосования другим
              пользователям.
            </Text>
          </View>
          {canDeleteOrClose && (
            <TouchableOpacity
              style={[styles.publishButton, { backgroundColor: theme.success }]}
              onPress={onPublish}
              disabled={isPublishing}
              activeOpacity={0.8}
            >
              {isPublishing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="rocket" size={18} color="#FFFFFF" />
                  <Text style={styles.publishButtonText}>Опубликовать опрос</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </>
      )}

      {/* Comment input */}
      {poll.require_comment &&
        (!poll.user_has_voted || isRevoting) &&
        poll.status === 'active' && (
          <View style={styles.commentContainer}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Комментарий:
            </Text>
            <TextInput
              style={[
                styles.textInput,
                {
                  color: theme.text,
                  borderColor: theme.border,
                  backgroundColor: theme.backgroundSecondary,
                },
              ]}
              placeholder="Добавьте комментарий..."
              placeholderTextColor={theme.inputPlaceholder}
              value={comment}
              onChangeText={onCommentChange}
              multiline
              numberOfLines={3}
            />
          </View>
        )}

      {/* Vote/Revote button - hide for admins/creators and when viewing results */}
      {!poll.user_has_voted || isRevoting
        ? poll.status === 'active' &&
          !isCreatorOrAdmin &&
          !showResults && (
            <>
              <TouchableOpacity
                style={[styles.voteButton, { backgroundColor: theme.primary }, shadows.md]}
                onPress={onVote}
                disabled={isVoting}
                activeOpacity={0.8}
              >
                {isVoting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                    <Text style={styles.voteButtonText}>
                      {isRevoting ? 'Изменить голос' : 'Проголосовать'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
              {isRevoting && (
                <TouchableOpacity
                  style={[
                    styles.cancelRevoteButton,
                    {
                      backgroundColor: theme.backgroundSecondary,
                      borderColor: theme.border,
                    },
                  ]}
                  onPress={onCancelRevote}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.cancelRevoteButtonText,
                      { color: theme.textSecondary },
                    ]}
                  >
                    Отмена
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )
        : null}
    </View>
  );
};

const styles = StyleSheet.create({
  draftWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.md,
    margin: spacing.md,
    backgroundColor: '#FEF3C7',
    borderRadius: 10,
    borderWidth: 1,
    gap: spacing.sm,
  },
  draftWarningText: {
    flex: 1,
    fontSize: 14,
    color: '#92400E',
    lineHeight: 20,
  },
  publishButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 6,
    marginTop: spacing.md,
    ...Platform.select({
      web: {
        // @ts-ignore
        cursor: 'pointer',
        transitionProperty: 'opacity',
        transitionDuration: '0.15s',
      },
    }),
    ...shadows.sm,
  },
  publishButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  commentContainer: {
    padding: spacing.md,
    paddingTop: 0,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: spacing.md,
    fontSize: 14,
    lineHeight: 20,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  voteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: spacing.sm,
    gap: 6,
    marginTop: spacing.md,
    ...Platform.select({
      web: {
        // @ts-ignore
        cursor: 'pointer',
        transitionProperty: 'opacity',
        transitionDuration: '0.15s',
      },
    }),
  },
  voteButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  cancelRevoteButton: {
    marginHorizontal: spacing.md,
    marginTop: -spacing.xs,
    marginBottom: spacing.md,
    minHeight: 40,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: {
        // @ts-ignore
        cursor: 'pointer',
        transitionProperty: 'opacity',
        transitionDuration: '0.15s',
      },
    }),
  },
  cancelRevoteButtonText: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
});
