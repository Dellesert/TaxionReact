import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@hooks/useTheme';

interface MessageInputProps {
  onSend: (message: string, replyToId?: number) => void;
  onTyping?: (isTyping: boolean) => void;
  disabled?: boolean;
  editingMessage?: any | null;
  onCancelEdit?: () => void;
  replyingToMessage?: any | null;
  onCancelReply?: () => void;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  onSend,
  onTyping,
  disabled = false,
  editingMessage,
  onCancelEdit,
  replyingToMessage,
  onCancelReply,
}) => {
  const { theme } = useTheme();
  const [message, setMessage] = useState('');
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // При установке editingMessage заполняем поле ввода
  useEffect(() => {
    if (editingMessage) {
      setMessage(editingMessage.content || '');
    }
  }, [editingMessage]);

  const handleChangeText = (text: string) => {
    setMessage(text);

    // Send typing indicator
    if (onTyping) {
      onTyping(true);

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Stop typing after 2 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        onTyping(false);
      }, 2000);
    }
  };

  const handleSend = () => {
    if (message.trim()) {
      // Clear typing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Stop typing indicator
      if (onTyping) {
        onTyping(false);
      }

      // Если редактируем, добавим префикс с ID сообщения
      if (editingMessage) {
        onSend(`EDIT:${editingMessage.id}:${message.trim()}`);
        if (onCancelEdit) onCancelEdit();
      } else {
        // Отправляем сообщение с reply_to_id если отвечаем
        onSend(message.trim(), replyingToMessage?.id);
        if (onCancelReply) onCancelReply();
      }

      setMessage('');
    }
  };

  const handleCancelEdit = () => {
    setMessage('');
    if (onCancelEdit) onCancelEdit();
  };

  const handleCancelReply = () => {
    if (onCancelReply) onCancelReply();
  };

  const dynamicStyles = StyleSheet.create({
    container: {
      backgroundColor: theme.backgroundSecondary,
      borderTopColor: theme.border,
    },
    attachButton: {
      backgroundColor: theme.backgroundTertiary,
    },
    input: {
      backgroundColor: theme.input,
      color: theme.text,
    },
    sendButton: {
      backgroundColor: theme.primary,
    },
    sendButtonDisabled: {
      backgroundColor: theme.backgroundTertiary,
    },
  });

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Индикатор редактирования */}
      {editingMessage && (
        <View style={[styles.editIndicator, { backgroundColor: theme.backgroundTertiary, borderTopColor: theme.border }]}>
          <View style={styles.editInfo}>
            <Ionicons name="create-outline" size={16} color={theme.primary} />
            <Text style={[styles.editText, { color: theme.text }]} numberOfLines={1}>
              Редактирование: {editingMessage.content}
            </Text>
          </View>
          <TouchableOpacity onPress={handleCancelEdit} style={styles.cancelButton}>
            <Ionicons name="close" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>
      )}

      {/* Индикатор ответа */}
      {replyingToMessage && !editingMessage && (
        <View style={[styles.replyIndicator, { backgroundColor: theme.backgroundTertiary, borderTopColor: theme.border, borderLeftColor: theme.primary }]}>
          <View style={styles.replyInfo}>
            <Ionicons name="return-down-forward-outline" size={16} color={theme.primary} />
            <View style={styles.replyTextContainer}>
              <Text style={[styles.replyLabel, { color: theme.primary }]}>
                Ответ на сообщение
              </Text>
              <Text style={[styles.replyText, { color: theme.textSecondary }]} numberOfLines={1}>
                {replyingToMessage.content}
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={handleCancelReply} style={styles.cancelButton}>
            <Ionicons name="close" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>
      )}

      <View style={[styles.container, dynamicStyles.container]}>
        <TouchableOpacity style={[styles.attachButton, dynamicStyles.attachButton]} disabled={disabled}>
          <Ionicons name="attach" size={26} color={theme.textTertiary} />
        </TouchableOpacity>

        <TextInput
          style={[styles.input, dynamicStyles.input]}
          placeholder="Сообщение"
          placeholderTextColor={theme.inputPlaceholder}
          value={message}
          onChangeText={handleChangeText}
          multiline
          maxLength={4000}
          editable={!disabled}
          onSubmitEditing={handleSend}
        />

        <TouchableOpacity
          style={[styles.sendButton, dynamicStyles.sendButton, !message.trim() && dynamicStyles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={disabled || !message.trim()}
        >
          <Ionicons
            name="send"
            size={16}
            color={message.trim() ? '#FFFFFF' : theme.textTertiary}
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 8,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  attachButton: {
    width: 40,
    height: 42,
    padding: 8,
    marginRight: 5,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  input: {
    flex: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingTop: 10,
    // paddingVertical: 10,
    fontSize: 15,
    maxHeight: 42,
  },
  sendButton: {
    width: 48,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  editIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  editInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  editText: {
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  cancelButton: {
    padding: 4,
  },
  replyIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderLeftWidth: 3,
  },
  replyInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    marginRight: 8,
  },
  replyTextContainer: {
    marginLeft: 8,
    flex: 1,
  },
  replyLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  replyText: {
    fontSize: 13,
  },
});

export default MessageInput;
