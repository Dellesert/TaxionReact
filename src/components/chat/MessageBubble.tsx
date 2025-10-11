import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Message, Reaction } from '@types/chat.types';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

interface MessageBubbleProps {
  message: Message;
  isOwnMessage: boolean;
  onReact?: (messageId: string, emoji: string) => void;
  onLongPress?: (message: Message) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isOwnMessage,
  onReact,
  onLongPress,
}) => {
  const renderAttachments = () => {
    if (!message.attachments || message.attachments.length === 0) return null;

    return (
      <View className="mt-2 space-y-1">
        {message.attachments.map((attachment) => (
          <View
            key={attachment.id}
            className="flex-row items-center bg-gray-100 p-2 rounded"
          >
            <Ionicons
              name={
                attachment.type === 'image'
                  ? 'image'
                  : attachment.type === 'video'
                  ? 'videocam'
                  : 'document'
              }
              size={20}
              color="#666"
            />
            <Text className="ml-2 text-sm text-gray-700 flex-1" numberOfLines={1}>
              {attachment.name}
            </Text>
            <Text className="text-xs text-gray-500">
              {(attachment.size / 1024).toFixed(1)} KB
            </Text>
          </View>
        ))}
      </View>
    );
  };

  const renderReactions = () => {
    if (!message.reactions || message.reactions.length === 0) return null;

    const reactionCounts: Record<string, { count: number; userIds: string[] }> = {};
    message.reactions.forEach((reaction) => {
      if (!reactionCounts[reaction.emoji]) {
        reactionCounts[reaction.emoji] = { count: 0, userIds: [] };
      }
      reactionCounts[reaction.emoji].count++;
      reactionCounts[reaction.emoji].userIds.push(reaction.user_id);
    });

    return (
      <View className="flex-row flex-wrap mt-1">
        {Object.entries(reactionCounts).map(([emoji, data]) => (
          <TouchableOpacity
            key={emoji}
            className="bg-gray-100 rounded-full px-2 py-1 mr-1 mb-1 flex-row items-center"
            onPress={() => onReact?.(message.id, emoji)}
          >
            <Text className="text-sm">{emoji}</Text>
            <Text className="text-xs text-gray-600 ml-1">{data.count}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <View
      className={`mb-3 ${isOwnMessage ? 'items-end' : 'items-start'}`}
    >
      <TouchableOpacity
        onLongPress={() => onLongPress?.(message)}
        activeOpacity={0.8}
        className={`max-w-[80%] px-4 py-2 rounded-2xl ${
          isOwnMessage
            ? 'bg-blue-500 rounded-br-sm'
            : 'bg-gray-200 rounded-bl-sm'
        }`}
      >
        {!isOwnMessage && (
          <Text className="text-xs font-semibold text-gray-700 mb-1">
            {message.sender?.full_name || 'Unknown'}
          </Text>
        )}

        {message.reply_to && (
          <View className="bg-black/10 p-2 rounded mb-2 border-l-2 border-gray-400">
            <Text className="text-xs opacity-70" numberOfLines={2}>
              {message.reply_to.content}
            </Text>
          </View>
        )}

        <Text className={`text-base ${isOwnMessage ? 'text-white' : 'text-gray-900'}`}>
          {message.content}
        </Text>

        {renderAttachments()}

        <View className="flex-row items-center justify-end mt-1 space-x-1">
          <Text className={`text-xs ${isOwnMessage ? 'text-white/70' : 'text-gray-500'}`}>
            {formatDistanceToNow(new Date(message.created_at), {
              addSuffix: true,
              locale: ru,
            })}
          </Text>
          {isOwnMessage && (
            <Ionicons
              name={
                message.read_by && message.read_by.length > 0
                  ? 'checkmark-done'
                  : 'checkmark'
              }
              size={14}
              color={message.read_by && message.read_by.length > 0 ? '#60A5FA' : 'white'}
            />
          )}
        </View>
      </TouchableOpacity>

      {renderReactions()}
    </View>
  );
};
