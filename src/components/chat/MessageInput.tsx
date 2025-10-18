import React, { useState, useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@hooks/useTheme';

interface MessageInputProps {
  onSend: (message: string) => void;
  onTyping?: (isTyping: boolean) => void;
  disabled?: boolean;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  onSend,
  onTyping,
  disabled = false,
}) => {
  const { theme } = useTheme();
  const [message, setMessage] = useState('');
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

      onSend(message.trim());
      setMessage('');
    }
  };

  const dynamicStyles = StyleSheet.create({
    container: {
      backgroundColor: theme.backgroundSecondary,
      borderTopColor: theme.border,
    },
    attachButton: {
      // Icon color handled inline
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
      <View style={[styles.container, dynamicStyles.container]}>
        <TouchableOpacity style={styles.attachButton} disabled={disabled}>
          <Ionicons name="attach" size={24} color={theme.textTertiary} />
        </TouchableOpacity>

        <TextInput
          style={[styles.input, dynamicStyles.input]}
          placeholder="Введите сообщение..."
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
            size={20}
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
    padding: 8,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
});

export default MessageInput;
