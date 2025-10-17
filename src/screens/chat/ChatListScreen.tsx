/**
 * Chat List Screen
 * Экран списка чатов
 */

import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, TextInput, StyleSheet } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { ChatStackParamList } from '@navigation/types';
import { useChatStore } from '@store/chatStore';
import { Loading } from '@components/common/Loading';
import { ChatItem } from '@components/chat/ChatItem';
import { Chat } from '@types/chat.types';
import { websocketService } from '@services/websocket.service';

type ChatListNavigationProp = NativeStackNavigationProp<ChatStackParamList, 'ChatList'>;

const ChatListScreen: React.FC = () => {
  const navigation = useNavigation<ChatListNavigationProp>();
  const { chats, isLoading, loadChats: fetchChats, createChat } = useChatStore();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadChats();
  }, []);

  // Subscribe to all chats when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      // Join all chats to receive WebSocket events
      chats.forEach((chat) => {
        websocketService.joinChat(chat.id);
      });

      // Cleanup: leave chats when screen loses focus
      return () => {
        chats.forEach((chat) => {
          websocketService.leaveChat(chat.id);
        });
      };
    }, [chats])
  );

  const loadChats = async () => {
    try {
      await fetchChats();
    } catch (error) {
      console.error('Failed to load chats:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadChats();
    setRefreshing(false);
  };

  const handleChatPress = (chat: Chat) => {
    navigation.navigate('Chat', {
      chatId: chat.id,
      chatName: chat.name,
    });
  };

  const handleNewChat = () => {
    navigation.navigate('CreateChat');
  };

  const filteredChats = chats.filter((chat) => {
    if (!searchQuery) return true;
    const chatName = chat.name || '';
    const searchText = chatName.toLowerCase();
    return searchText.includes(searchQuery.toLowerCase());
  });

  if (isLoading && chats.length === 0) {
    return <Loading text="Загрузка чатов..." fullScreen />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>Чаты</Text>
          <TouchableOpacity onPress={handleNewChat} style={styles.newChatButton}>
            <Ionicons name="create-outline" size={24} color="#ff0000ff" />
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Поиск чатов..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {filteredChats.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="chatbubbles-outline" size={64} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>
            {searchQuery ? 'Чаты не найдены' : 'Нет чатов'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {searchQuery
              ? 'Попробуйте изменить поисковый запрос'
              : 'Начните новый разговор или присоединитесь к группе'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredChats}
          keyExtractor={(item) => `chat-${item.id}`}
          renderItem={({ item }) => (
            <ChatItem chat={item} onPress={handleChatPress} />
          )}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  newChatButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#111827',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 8,
  },
});

export default ChatListScreen;
