import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, Text, TextInput, ActivityIndicator, StyleSheet, Keyboard, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Task } from '../../types/task.types';
import { useTheme } from '@shared/hooks/useTheme';
import { getActionButtonText } from '../../utils/taskHelpers';

interface TaskActionButtonsProps {
  task: Task;
  activeTab: 'overview' | 'attachments' | 'comments' | 'history';
  isCreator: boolean;
  allSubtasksCompleted: boolean;
  allChecklistItemsCompleted: boolean;
  isDelegatedByMe: boolean;
  canChangeStatus: boolean;
  // For comments tab
  newComment?: string;
  isSendingComment?: boolean;
  onNewCommentChange?: (text: string) => void;
  onSendComment?: () => void;
  // For overview tab
  onTaskAction?: () => void;
  onStatusChange?: (status: Task['status']) => void;
  bottomInset: number;
}

export const TaskActionButtons: React.FC<TaskActionButtonsProps> = ({
  task,
  activeTab,
  isCreator,
  allSubtasksCompleted,
  allChecklistItemsCompleted,
  isDelegatedByMe,
  canChangeStatus,
  newComment,
  isSendingComment,
  onNewCommentChange,
  onSendComment,
  onTaskAction,
  onStatusChange,
  bottomInset,
}) => {
  const { theme } = useTheme();
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSubscription = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  // Calculate bottom position based on keyboard
  const bottomPosition = keyboardHeight > 0 ? keyboardHeight : bottomInset + 80;

  // Comments tab: show comment input
  if (activeTab === 'comments' && !isDelegatedByMe && task.status !== 'done') {
    return (
      <View
        style={[
          styles.fixedCommentInputContainer,
          {
            backgroundColor: theme.background,
            borderTopColor: theme.border,
            bottom: bottomPosition,
          },
        ]}
      >
        <TextInput
          style={[
            styles.commentInput,
            {
              backgroundColor: theme.input,
              color: theme.text,
            },
          ]}
          placeholder="Написать комментарий..."
          placeholderTextColor={theme.textTertiary}
          value={newComment}
          onChangeText={onNewCommentChange}
          multiline
          maxLength={1000}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            { backgroundColor: newComment?.trim() ? theme.primary : theme.backgroundTertiary },
          ]}
          onPress={onSendComment}
          disabled={!newComment?.trim() || isSendingComment}
        >
          {isSendingComment ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons
              name="send"
              size={16}
              color={newComment?.trim() ? '#FFFFFF' : theme.textTertiary}
            />
          )}
        </TouchableOpacity>
      </View>
    );
  }

  // Overview tab: show action buttons
  if (
    activeTab === 'overview' &&
    !isDelegatedByMe &&
    task.status !== 'done' &&
    canChangeStatus
  ) {
    return (
      <View style={[styles.fixedActionsContainer, { bottom: bottomInset + 80 }]}>
        {/* Start/Submit Button - for new or in_progress tasks */}
        {(task.status === 'new' || task.status === 'in_progress') && (
          <TouchableOpacity
            style={[
              styles.fixedActionButton,
              styles.primaryFixedButton,
              {
                backgroundColor: theme.primary,
                shadowColor: theme.primary,
              },
              task.status === 'in_progress' &&
                (!allSubtasksCompleted || !allChecklistItemsCompleted) &&
                styles.disabledButton,
            ]}
            onPress={onTaskAction}
            disabled={
              task.status === 'in_progress' &&
              (!allSubtasksCompleted || !allChecklistItemsCompleted)
            }
          >
            <Ionicons
              name={
                task.status === 'in_progress' &&
                (!allSubtasksCompleted || !allChecklistItemsCompleted)
                  ? 'alert-circle-outline'
                  : 'play-circle-outline'
              }
              size={20}
              color="#FFFFFF"
            />
            <Text style={[styles.fixedActionButtonText, styles.primaryFixedButtonText]}>
              {getActionButtonText(task, isCreator, allSubtasksCompleted, allChecklistItemsCompleted)}
            </Text>
          </TouchableOpacity>
        )}

        {/* Review Buttons - for creator when task is in review */}
        {task.status === 'review' && isCreator && (
          <>
            <TouchableOpacity
              style={[
                styles.fixedActionButton,
                styles.secondaryFixedButton,
                {
                  backgroundColor: theme.backgroundSecondary,
                  borderColor: theme.border,
                },
              ]}
              onPress={() => onStatusChange?.('in_progress')}
            >
              <Ionicons name="arrow-back-circle-outline" size={20} color={theme.text} />
              <Text style={[styles.fixedActionButtonText, { color: theme.text }]}>Вернуть</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.fixedActionButton,
                styles.primaryFixedButton,
                {
                  backgroundColor: theme.primary,
                  shadowColor: theme.primary,
                },
                (!allSubtasksCompleted || !allChecklistItemsCompleted) && styles.disabledButton,
              ]}
              onPress={() => onStatusChange?.('done')}
              disabled={!allSubtasksCompleted || !allChecklistItemsCompleted}
            >
              <Ionicons
                name={
                  !allSubtasksCompleted || !allChecklistItemsCompleted
                    ? 'alert-circle-outline'
                    : 'checkmark-circle-outline'
                }
                size={20}
                color="#FFFFFF"
              />
              <Text style={[styles.fixedActionButtonText, styles.primaryFixedButtonText]}>
                {!allSubtasksCompleted
                  ? 'Завершите подзадачи'
                  : !allChecklistItemsCompleted
                  ? 'Завершите чек-листы'
                  : 'Принять'}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  fixedActionsContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    gap: 8,
  },
  fixedActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  primaryFixedButton: {
    shadowOpacity: 0.3,
  },
  secondaryFixedButton: {
    borderWidth: 1.5,
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
    opacity: 0.6,
  },
  fixedActionButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  primaryFixedButtonText: {
    color: '#FFFFFF',
  },
  fixedCommentInputContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  commentInput: {
    flex: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingTop: 11,
    paddingBottom: 11,
    fontSize: 15,
    lineHeight: 20,
    minHeight: 42,
    maxHeight: 120,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
