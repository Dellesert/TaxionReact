import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, Text, TextInput, ActivityIndicator, StyleSheet, Keyboard, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
  // Group task props
  isGroupTask?: boolean;
  isGroupAssigneeDone?: boolean;
  onMarkGroupDone?: () => void;
  onUnmarkGroupDone?: () => void;
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
  isGroupTask,
  isGroupAssigneeDone,
  onMarkGroupDone,
  onUnmarkGroupDone,
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

  // Transparent version of background for gradient
  const bgColor = theme.background;
  const bgTransparent = bgColor + '00';

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

  // Overview tab: group task assignee buttons
  if (
    activeTab === 'overview' &&
    !isDelegatedByMe &&
    task.status !== 'done' &&
    isGroupTask &&
    !isCreator
  ) {
    return (
      <View style={[styles.stickyBarWrapper, { bottom: bottomInset + 80 }]}>
        <LinearGradient
          colors={[bgTransparent, bgColor]}
          style={styles.gradientBackdrop}
          pointerEvents="none"
        />
        <View style={[styles.stickyBarContent, { backgroundColor: theme.background }]}>
          {isGroupAssigneeDone ? (
            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.secondaryButton,
                {
                  backgroundColor: theme.backgroundSecondary,
                  borderColor: theme.border,
                },
              ]}
              onPress={onUnmarkGroupDone}
              activeOpacity={0.7}
            >
              <Ionicons name="close-circle-outline" size={20} color={theme.text} />
              <Text style={[styles.actionButtonText, { color: theme.text }]}>
                Отменить выполнение
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.primaryButton,
                {
                  backgroundColor: '#10B981',
                  shadowColor: '#10B981',
                },
              ]}
              onPress={onMarkGroupDone}
              activeOpacity={0.7}
            >
              <Ionicons name="checkmark-circle-outline" size={22} color="#FFFFFF" />
              <Text style={[styles.actionButtonText, styles.primaryButtonText]}>
                Отметить выполненным
              </Text>
            </TouchableOpacity>
          )}
        </View>
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
      <View style={[styles.stickyBarWrapper, { bottom: bottomInset + 80 }]}>
        <LinearGradient
          colors={[bgTransparent, bgColor]}
          style={styles.gradientBackdrop}
          pointerEvents="none"
        />
        <View style={[styles.stickyBarContent, { backgroundColor: theme.background }]}>
          {/* Start/Submit Button - for new or in_progress tasks */}
          {(task.status === 'new' || task.status === 'in_progress') && (
            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.primaryButton,
                {
                  backgroundColor: task.status === 'new' ? theme.primary : '#10B981',
                  shadowColor: task.status === 'new' ? theme.primary : '#10B981',
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
              activeOpacity={0.7}
            >
              <Ionicons
                name={
                  task.status === 'in_progress' &&
                  (!allSubtasksCompleted || !allChecklistItemsCompleted)
                    ? 'alert-circle-outline'
                    : task.status === 'new'
                    ? 'play-circle-outline'
                    : 'checkmark-circle-outline'
                }
                size={22}
                color="#FFFFFF"
              />
              <Text style={[styles.actionButtonText, styles.primaryButtonText]}>
                {getActionButtonText(task, isCreator, allSubtasksCompleted, allChecklistItemsCompleted)}
              </Text>
            </TouchableOpacity>
          )}

          {/* Review Buttons - for creator when task is in review */}
          {task.status === 'review' && isCreator && (
            <View style={styles.reviewButtonsRow}>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  styles.secondaryButton,
                  {
                    backgroundColor: theme.backgroundSecondary,
                    borderColor: theme.border,
                    flex: 1,
                  },
                ]}
                onPress={() => onStatusChange?.('in_progress')}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-back-circle-outline" size={20} color={theme.text} />
                <Text style={[styles.actionButtonText, { color: theme.text }]}>Вернуть</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.actionButton,
                  styles.primaryButton,
                  {
                    backgroundColor: '#10B981',
                    shadowColor: '#10B981',
                    flex: 1.5,
                  },
                  (!allSubtasksCompleted || !allChecklistItemsCompleted) && styles.disabledButton,
                ]}
                onPress={() => onStatusChange?.('done')}
                disabled={!allSubtasksCompleted || !allChecklistItemsCompleted}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={
                    !allSubtasksCompleted || !allChecklistItemsCompleted
                      ? 'alert-circle-outline'
                      : 'checkmark-circle-outline'
                  }
                  size={22}
                  color="#FFFFFF"
                />
                <Text style={[styles.actionButtonText, styles.primaryButtonText]}>
                  {!allSubtasksCompleted
                    ? 'Завершите подзадачи'
                    : !allChecklistItemsCompleted
                    ? 'Завершите чек-листы'
                    : 'Принять'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  // Sticky bottom bar wrapper
  stickyBarWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  gradientBackdrop: {
    height: 32,
  },
  stickyBarContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },

  // Action buttons
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    gap: 10,
  },
  primaryButton: {
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  secondaryButton: {
    borderWidth: 1.5,
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
    opacity: 0.6,
    shadowOpacity: 0,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  primaryButtonText: {
    color: '#FFFFFF',
  },
  reviewButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },

  // Comment input (unchanged)
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
    paddingTop: 12,
    paddingBottom: 12,
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
