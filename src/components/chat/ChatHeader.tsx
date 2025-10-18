import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Avatar } from '@components/common/Avatar';
import { Chat } from '../../types/chat.types';

interface ChatHeaderProps {
  chat: Chat;
  typingUsers?: string[];
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({ chat, typingUsers = [] }) => {
  const navigation = useNavigation();

  const getChatName = () => {
    if (chat.name) return chat.name;
    if (chat.type === 'direct' && chat.participants.length > 0) {
      return chat.participants[0].full_name || 'Unnamed User';
    }
    return 'Unnamed Chat';
  };

  const getChatAvatar = () => {
    if (chat.avatar) return chat.avatar;
    if (chat.type === 'direct' && chat.participants.length > 0) {
      return chat.participants[0].avatar || undefined;
    }
    return undefined;
  };

  const getOnlineStatus = () => {
    if (chat.type !== 'direct') return null;
    const participant = chat.participants[0];
    if (!participant) return null;
    return participant.status || 'offline';
  };

  const renderSubtitle = () => {
    if (typingUsers.length > 0) {
      return (
        <Text className="text-xs text-blue-500 italic">
          {typingUsers.length === 1
            ? `${typingUsers[0]} печатает...`
            : `${typingUsers.length} человек печатают...`}
        </Text>
      );
    }

    if (chat.type === 'group' || chat.type === 'channel') {
      return (
        <Text className="text-xs text-gray-500">
          {chat.participants.length} участников
        </Text>
      );
    }

    const status = getOnlineStatus();
    if (status === 'online') {
      return <Text className="text-xs text-green-500">В сети</Text>;
    } else if (status === 'away') {
      return <Text className="text-xs text-yellow-500">Отошёл</Text>;
    } else if (status === 'busy') {
      return <Text className="text-xs text-red-500">Не беспокоить</Text>;
    }

    return <Text className="text-xs text-gray-500">Не в сети</Text>;
  };

  return (
    <View className="flex-row items-center bg-white px-4 py-3 border-b border-gray-200">
      <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3">
        <Ionicons name="arrow-back" size={24} color="#000" />
      </TouchableOpacity>

      <Avatar
        source={getChatAvatar()}
        name={getChatName()}
        size={40}
        status={chat.type === 'direct' ? getOnlineStatus() : undefined}
      />

      <View className="flex-1 ml-3">
        <Text className="text-base font-semibold" numberOfLines={1}>
          {getChatName()}
        </Text>
        {renderSubtitle()}
      </View>

      <View className="flex-row space-x-3">
        <TouchableOpacity>
          <Ionicons name="call-outline" size={24} color="#3B82F6" />
        </TouchableOpacity>
        <TouchableOpacity>
          <Ionicons name="videocam-outline" size={24} color="#3B82F6" />
        </TouchableOpacity>
        <TouchableOpacity>
          <Ionicons name="ellipsis-vertical" size={24} color="#3B82F6" />
        </TouchableOpacity>
      </View>
    </View>
  );
};
