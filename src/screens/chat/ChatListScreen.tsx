/**
 * Chat List Screen
 * Экран списка чатов
 */

import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, TextInput, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { ChatStackParamList } from '@navigation/types';
import { useChatStore } from '@store/chatStore';
import { Loading } from '@components/common/Loading';
import { ChatItem } from '@components/chat/ChatItem';
import { ConnectionStatus } from '@components/common/ConnectionStatus';
import { useTheme } from '@hooks/useTheme';
import { Chat } from '../../types/chat.types';
import { websocketService } from '@services/websocket.service';

type ChatListNavigationProp = NativeStackNavigationProp<ChatStackParamList, 'ChatList'>;

const ChatListScreen: React.FC = () => {
  const navigation = useNavigation<ChatListNavigationProp>();
  const { chats, isLoading, loadChats: fetchChats, createChat, deleteChat, updateChat, leaveChat } = useChatStore();
  const { theme } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [isConnected, setIsConnected] = useState(websocketService.isConnected());

  useEffect(() => {
    loadChats();
  }, []);

  // Проверяем статус подключения каждую секунду
  useEffect(() => {
    const interval = setInterval(() => {
      setIsConnected(websocketService.isConnected());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // ИСПРАВЛЕНО: НЕ нужно joinChat для всех чатов в списке
  // WebSocket соединение глобальное, обновления last_message приходят автоматически
  // Пользователь должен быть подписан только на чат, который он открыл (в ChatScreen)
  // useFocusEffect(
  //   React.useCallback(() => {
  //     chats.forEach((chat) => {
  //       websocketService.joinChat(chat.id);
  //     });
  //     return () => {
  //       chats.forEach((chat) => {
  //         websocketService.leaveChat(chat.id);
  //       });
  //     };
  //   }, [chats])
  // );

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

  const handleDeleteChat = async (chatId: number) => {
    try {
      await deleteChat(chatId);
      console.log(`✅ Chat ${chatId} deleted`);
    } catch (error) {
      console.error('Failed to delete chat:', error);
    }
  };

  const handleRenameChat = async (chatId: number, newName: string) => {
    try {
      await updateChat(chatId, newName);
      console.log(`✅ Chat ${chatId} renamed to "${newName}"`);
    } catch (error) {
      console.error('Failed to rename chat:', error);
    }
  };

  const handleLeaveChat = async (chatId: number) => {
    try {
      await leaveChat(chatId);
      console.log(`✅ Left chat ${chatId}`);
    } catch (error) {
      console.error('Failed to leave chat:', error);
    }
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

  const dynamicStyles = StyleSheet.create({
    container: {
      backgroundColor: theme.background,
    },
    header: {
      backgroundColor: theme.backgroundSecondary,
      borderBottomColor: theme.border,
    },
    title: {
      color: theme.text,
    },
    searchContainer: {
      backgroundColor: theme.input,
    },
    searchInput: {
      color: theme.text,
    },
    emptyTitle: {
      color: theme.textSecondary,
    },
    emptySubtitle: {
      color: theme.textTertiary,
    },
  });

  return (
    <SafeAreaView style={dynamicStyles.container} edges={['top', 'left', 'right']}>
    <View style={[styles.container, dynamicStyles.container]}>
      
      <View style={[styles.header, dynamicStyles.header]}>
        <View style={styles.headerTop}>
          {/* Левая кнопка - Изменить */}
          <TouchableOpacity
            onPress={() => setIsEditMode(!isEditMode)}
            style={styles.editButton}
          >
            <Ionicons
              name={isEditMode ? "checkmark-outline" : "create-outline"}
              size={24}
              color={isEditMode ? theme.success || theme.primary : theme.textSecondary}
            />
          </TouchableOpacity>

          {/* Центр - Заголовок или статус подключения */}
          <View style={styles.centerContent}>
            {isConnected ? (
              <Text style={[styles.title, dynamicStyles.title]}>Чаты</Text>
            ) : (
              <ConnectionStatus />
            )}
          </View>

          {/* Правая кнопка - Добавить */}
          {!isEditMode && (
            <TouchableOpacity onPress={handleNewChat} style={styles.newChatButton}>
              <Ionicons name="add-outline" size={28} color={theme.primary} />
            </TouchableOpacity>
          )}
          {isEditMode && <View style={styles.newChatButton} />}
        </View>

        <View style={[styles.searchContainer, dynamicStyles.searchContainer]}>
          <Ionicons name="search" size={20} color={theme.textTertiary} />
          <TextInput
            style={[styles.searchInput, dynamicStyles.searchInput]}
            placeholder="Поиск чатов..."
            placeholderTextColor={theme.inputPlaceholder}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={theme.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {filteredChats.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="chatbubbles-outline" size={64} color={theme.borderLight} />
          <Text style={[styles.emptyTitle, dynamicStyles.emptyTitle]}>
            {searchQuery ? 'Чаты не найдены' : 'Нет чатов'}
          </Text>
          <Text style={[styles.emptySubtitle, dynamicStyles.emptySubtitle]}>
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
            <ChatItem
              chat={item}
              onPress={handleChatPress}
              onDelete={isEditMode ? handleDeleteChat : undefined}
              onRename={isEditMode ? handleRenameChat : undefined}
              onLeave={isEditMode ? handleLeaveChat : undefined}
            />
          )}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        />
      )}
    </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    minHeight: 32,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  editButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newChatButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
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
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
});

export default ChatListScreen;
