import React from 'react';
import { View, Text, TouchableOpacity, TextInput, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@hooks/useTheme';
import { Poll } from '@/types/poll.types';

interface PollActionButtonsProps {
  poll: Poll;
  canDeleteOrClose: boolean;
  isCreatorOrAdmin: boolean;
  isRevoting: boolean;
  isVoting: boolean;
  isPublishing: boolean;
  showResults: boolean;
  comment: string;
  onCommentChange: (text: string) => void;
  onVote: () => void;
  onRevote: () => void;
  onCancelRevote: () => void;
  onToggleResults: () => void;
  onPublish: () => void;
  onClose: () => void;
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
  onCommentChange,
  onVote,
  onRevote,
  onCancelRevote,
  onToggleResults,
  onPublish,
  onClose,
}) => {
  const { theme } = useTheme();

  return (
    <View>
      {/* Draft warning and publish button */}
      {poll.status === 'draft' && (
        <>
          <View style={styles.draftWarning}>
            <Ionicons name="information-circle" size={24} color="#F59E0B" />
            <Text style={styles.draftWarningText}>
              Это черновик. Опрос еще не опубликован и недоступен для голосования другим
              пользователям.
            </Text>
          </View>
          {canDeleteOrClose && (
            <TouchableOpacity
              style={[styles.publishButton, { backgroundColor: '#10B981' }]}
              onPress={onPublish}
              disabled={isPublishing}
            >
              {isPublishing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="rocket" size={20} color="#FFFFFF" />
                  <Text style={styles.publishButtonText}>Опубликовать опрос</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </>
      )}

      {/* Close poll button for active polls */}
      {poll.status === 'active' && canDeleteOrClose && (
        <TouchableOpacity
          style={[
            styles.publishButton,
            { backgroundColor: '#F59E0B', marginTop: 0 },
          ]}
          onPress={onClose}
          disabled={isPublishing}
        >
          {isPublishing ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="lock-closed" size={20} color="#FFFFFF" />
              <Text style={styles.publishButtonText}>Завершить опрос</Text>
            </>
          )}
        </TouchableOpacity>
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
                { color: theme.text, borderColor: theme.border },
              ]}
              placeholder="Добавьте комментарий..."
              placeholderTextColor="#9CA3AF"
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
                style={[styles.voteButton, { backgroundColor: theme.primary }]}
                onPress={onVote}
                disabled={isVoting}
              >
                {isVoting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.voteButtonText}>
                    {isRevoting ? 'Изменить голос' : 'Проголосовать'}
                  </Text>
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

      {/* Revote button for users who already voted (not for admins/creators) */}
      {poll.user_has_voted &&
        !isRevoting &&
        poll.status === 'active' &&
        !isCreatorOrAdmin && (
          <TouchableOpacity
            style={[
              styles.revoteButton,
              {
                backgroundColor: theme.backgroundSecondary,
                borderColor: theme.primary,
              },
            ]}
            onPress={onRevote}
          >
            <Ionicons name="refresh" size={20} color={theme.primary} />
            <Text style={[styles.revoteButtonText, { color: theme.primary }]}>
              Переголосовать
            </Text>
          </TouchableOpacity>
        )}

      {/* Toggle button to show/hide results for polls that allow viewing before voting */}
      {poll.show_results &&
        !poll.show_results_after &&
        !poll.user_has_voted &&
        !isCreatorOrAdmin && (
          <TouchableOpacity
            style={[
              styles.toggleResultsButton,
              {
                backgroundColor: theme.backgroundSecondary,
                borderColor: theme.border,
              },
            ]}
            onPress={onToggleResults}
          >
            <Ionicons
              name={showResults ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={theme.primary}
            />
            <Text style={[styles.toggleResultsText, { color: theme.text }]}>
              {showResults ? 'Скрыть результаты' : 'Посмотреть результаты'}
            </Text>
          </TouchableOpacity>
        )}
    </View>
  );
};

const styles = StyleSheet.create({
  draftWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    margin: 16,
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F59E0B',
    gap: 12,
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
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginTop: 24,
  },
  publishButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  commentContainer: {
    padding: 16,
    paddingTop: 0,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  voteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 12,
    gap: 8,
    marginTop: 24,
  },
  voteButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  revoteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    gap: 8,
    marginTop: 24,
  },
  revoteButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  cancelRevoteButton: {
    marginHorizontal: 16,
    marginTop: -8,
    marginBottom: 16,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelRevoteButtonText: {
    fontSize: 15,
    fontWeight: '500',
  },
  toggleResultsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 8,
  },
  toggleResultsText: {
    fontSize: 15,
    fontWeight: '500',
  },
});
