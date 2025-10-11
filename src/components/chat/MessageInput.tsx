import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface MessageInputProps {
  onSend: (content: string) => Promise<void>;
  onTyping?: () => void;
  placeholder?: string;
  disabled?: boolean;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  onSend,
  onTyping,
  placeholder = 'Введите сообщение...',
  disabled = false,
}) => {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    if (!message.trim() || isSending) return;

    setIsSending(true);
    try {
      await onSend(message.trim());
      setMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleChangeText = (text: string) => {
    setMessage(text);
    onTyping?.();
  };

  return (
    <View className="flex-row items-center px-4 py-3 bg-white border-t border-gray-200">
      <TouchableOpacity
        className="mr-2"
        disabled={disabled}
        onPress={() => {
          // TODO: Implement file attachment
          console.log('Attach file');
        }}
      >
        <Ionicons name="add-circle-outline" size={28} color="#3B82F6" />
      </TouchableOpacity>

      <TextInput
        className="flex-1 bg-gray-100 rounded-full px-4 py-2 text-base"
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        value={message}
        onChangeText={handleChangeText}
        multiline
        maxLength={4000}
        editable={!disabled && !isSending}
      />

      <TouchableOpacity
        className="ml-2"
        onPress={handleSend}
        disabled={!message.trim() || disabled || isSending}
      >
        {isSending ? (
          <ActivityIndicator size="small" color="#3B82F6" />
        ) : (
          <Ionicons
            name="send"
            size={24}
            color={message.trim() ? '#3B82F6' : '#9CA3AF'}
          />
        )}
      </TouchableOpacity>
    </View>
  );
};
