import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Modal,
  Pressable,
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

// Компонент меню действий для комментария
const CommentActionMenu: React.FC<{
  visible: boolean;
  position: { x: number; y: number } | null;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  theme: any;
}> = ({ visible, position, onClose, onEdit, onDelete, theme }) => {
  if (!position) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.menuOverlay} onPress={onClose}>
        <View
          style={[
            styles.menuContainer,
            {
              backgroundColor: theme.card,
              position: 'absolute',
              top: position.y,
              right: 16,
            },
          ]}
        >
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              onClose();
              onEdit();
            }}
          >
            <Ionicons name="create-outline" size={20} color={theme.primary} />
            <Text style={[styles.menuItemText, { color: theme.text }]}>Редактировать</Text>
          </TouchableOpacity>
          <View style={[styles.menuDivider, { backgroundColor: theme.border }]} />
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              onClose();
              onDelete();
            }}
          >
            <Ionicons name="trash-outline" size={20} color="#ef4444" />
            <Text style={[styles.menuItemText, { color: '#ef4444' }]}>Удалить</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
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
  const [menuState, setMenuState] = useState<{
    commentId: number;
    position: { x: number; y: number };
  } | null>(null);
  const buttonRefs = useRef<{ [key: number]: TouchableOpacity | null }>({});

  const openMenu = (commentId: number) => {
    const buttonRef = buttonRefs.current[commentId];
    if (buttonRef) {
      buttonRef.measure((_x, _y, _width, height, _pageX, pageY) => {
        setMenuState({
          commentId,
          position: { x: 0, y: pageY + height + 4 },
        });
      });
    }
  };

  const closeMenu = () => setMenuState(null);

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
                  <TouchableOpacity
                    ref={(ref) => { buttonRefs.current[comment.id] = ref; }}
                    onPress={() => openMenu(comment.id)}
                    style={styles.menuButton}
                  >
                    <Ionicons name="ellipsis-horizontal" size={18} color={theme.textSecondary} />
                  </TouchableOpacity>
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

      {/* Comment Action Menu */}
      {menuState !== null && (
        <CommentActionMenu
          visible={true}
          position={menuState.position}
          onClose={closeMenu}
          onEdit={() => {
            const comment = comments.find(c => c.id === menuState.commentId);
            if (comment) onEditComment(comment);
          }}
          onDelete={() => {
            onDeleteComment(menuState.commentId);
          }}
          theme={theme}
        />
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
  menuButton: {
    padding: 4,
    marginLeft: 8,
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  menuContainer: {
    borderRadius: 12,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '500',
  },
  menuDivider: {
    height: 1,
    marginHorizontal: 16,
  },
});
