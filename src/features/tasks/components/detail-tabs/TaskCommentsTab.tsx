import React, { useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TaskComment } from '../../types/task.types';
import { Avatar } from '@shared/components/common/Avatar';
import { useTheme } from '@shared/hooks/useTheme';
import { getUserDisplayName } from '../../utils/taskHelpers';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { AutoCorrectedTextInput, AutoCorrectedTextInputRef } from '@shared/components/ui/AutoCorrectedTextInput';

// Компонент для редактирования комментария с поддержкой iOS автокоррекции
const EditCommentInput: React.FC<{
  editingCommentText: string;
  setEditingCommentText: (text: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  theme: any;
}> = ({ editingCommentText, setEditingCommentText, onSaveEdit, onCancelEdit, theme }) => {
  const inputRef = useRef<AutoCorrectedTextInputRef>(null);

  const handleSave = () => {
    inputRef.current?.commitAutocorrection();
    setTimeout(() => {
      onSaveEdit();
    }, 10);
  };

  return (
    <View style={{ marginTop: 8 }}>
      <AutoCorrectedTextInput
        ref={inputRef}
        style={[
          styles.commentInput,
          {
            backgroundColor: theme.input,
            color: theme.text,
            borderColor: theme.border,
            marginBottom: 8,
          },
        ]}
        value={editingCommentText}
        onChangeText={setEditingCommentText}
        multiline
        maxLength={1000}
        autoFocus
      />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.primary, flex: 1 }]}
          onPress={handleSave}
        >
          <Text style={styles.buttonText}>Сохранить</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.button,
            {
              backgroundColor: theme.backgroundSecondary,
              borderWidth: 1,
              borderColor: theme.border,
              flex: 1,
            },
          ]}
          onPress={onCancelEdit}
        >
          <Text style={[styles.buttonText, { color: theme.text }]}>Отмена</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

interface TaskCommentsTabProps {
  comments: TaskComment[];
  hasMoreComments: boolean;
  isLoadingMore: boolean;
  editingCommentId: number | null;
  editingCommentText: string;
  currentUserId?: number;
  onLoadMore: () => void;
  onEditComment: (comment: TaskComment) => void;
  onSaveEdit: (commentId: number) => void;
  onCancelEdit: () => void;
  onDeleteComment: (commentId: number) => void;
  onUserPress: (userId: number) => void;
  setEditingCommentText: (text: string) => void;
}

export const TaskCommentsTab: React.FC<TaskCommentsTabProps> = ({
  comments,
  hasMoreComments,
  isLoadingMore,
  editingCommentId,
  editingCommentText,
  currentUserId,
  onLoadMore,
  onEditComment,
  onSaveEdit,
  onCancelEdit,
  onDeleteComment,
  onUserPress,
  setEditingCommentText,
}) => {
  const { theme } = useTheme();

  if (comments.length === 0) {
    return (
      <View style={styles.emptyStateContainer}>
        <Ionicons name="chatbubbles-outline" size={48} color={theme.textTertiary} />
        <Text style={[styles.emptyStateText, { color: theme.textTertiary }]}>
          Будьте первым, кто оставит комментарий
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Comments List */}
      {comments.map((comment) => {
        const isMyComment = currentUserId === comment.user_id;
        const isEditing = editingCommentId === comment.id;

        return (
          <View key={comment.id} style={styles.commentItem}>
            <TouchableOpacity
              onPress={() => comment.user && onUserPress(comment.user.id)}
              activeOpacity={0.7}
            >
              <Avatar
                name={comment.user?.name || 'User'}
                imageUrl={comment.user?.avatar}
                size={36}
              />
            </TouchableOpacity>
            <View style={styles.commentContent}>
              <View style={styles.commentHeader}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <TouchableOpacity
                    onPress={() => comment.user && onUserPress(comment.user.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.commentAuthor, { color: theme.text }]} numberOfLines={1}>
                      {comment.user
                        ? getUserDisplayName(comment.user.name, comment.user.id, currentUserId)
                        : 'Пользователь'}
                    </Text>
                  </TouchableOpacity>
                  <Text style={[styles.commentDate, { color: theme.textTertiary }]}>
                    {format(new Date(comment.created_at), 'dd MMM, HH:mm', { locale: ru })}
                  </Text>
                </View>
                {isMyComment && !isEditing && (
                  <View style={{ flexDirection: 'row', gap: 4, marginLeft: 8 }}>
                    <TouchableOpacity onPress={() => onEditComment(comment)} style={{ padding: 4 }}>
                      <Ionicons name="create-outline" size={16} color={theme.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => onDeleteComment(comment.id)}
                      style={{ padding: 4 }}
                    >
                      <Ionicons name="trash-outline" size={16} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
              {isEditing ? (
                <EditCommentInput
                  editingCommentText={editingCommentText}
                  setEditingCommentText={setEditingCommentText}
                  onSaveEdit={() => onSaveEdit(comment.id)}
                  onCancelEdit={onCancelEdit}
                  theme={theme}
                />
              ) : (
                <Text style={[styles.commentText, { color: theme.textSecondary }]}>
                  {comment.content}
                </Text>
              )}
            </View>
          </View>
        );
      })}

      {/* Load More Button */}
      {hasMoreComments && (
        <TouchableOpacity
          style={styles.loadMore}
          onPress={onLoadMore}
          disabled={isLoadingMore}
        >
          {isLoadingMore ? (
            <ActivityIndicator size="small" color={theme.primary} />
          ) : (
            <Text style={[styles.loadMoreText, { color: theme.primary }]}>Загрузить еще</Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 15,
    marginTop: 12,
    textAlign: 'center',
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 12,
  },
  commentContent: {
    flex: 1,
    minWidth: 0,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  commentAuthor: {
    fontSize: 14,
    fontWeight: '600',
    flexShrink: 1,
  },
  commentDate: {
    fontSize: 12,
    flexShrink: 0,
  },
  commentText: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 2,
  },
  commentInput: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    minHeight: 44,
    maxHeight: 100,
    borderWidth: 1,
  },
  button: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  loadMore: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  loadMoreText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
