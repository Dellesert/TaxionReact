/**
 * Chat List Screen
 * Экран списка чатов
 */

import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, TextInput, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { ChatStackParamList } from '@navigation/types';
import { useChatStore } from '@store/chatStore';
import { useAuthStore } from '@store/authStore';
import { Loading } from '@components/common/Loading';
import { ChatItem } from '@components/chat/ChatItem';
import { ConnectionStatus } from '@components/common/ConnectionStatus';
import { useTheme } from '@hooks/useTheme';
import { Chat, ChatType } from '../../types/chat.types';
import { websocketService } from '@services/websocket.service';

type ChatListNavigationProp = NativeStackNavigationProp<ChatStackParamList, 'ChatList'>;

type ChatFilter = 'all' | 'group' | 'private' | 'favorite';

const ChatListScreen: React.FC = () => {
  const navigation = useNavigation<ChatListNavigationProp>();

  // Используем селектор с пользовательской функцией сравнения для отслеживания изменений статуса пользователей в чатах
  // Это гарантирует, что компонент перерисуется при изменении статуса через WebSocket
  const chats = useChatStore(
    (state) => state.chats,
    (a, b) => {
      // Сравниваем массивы чатов
      if (a.length !== b.length) return false;

      // Сравниваем каждый чат, особенно статусы участников и read_by в last_message
      return a.every((chatA, i) => {
        const chatB = b[i];
        if (!chatA || !chatB) return false;
        if (chatA.id !== chatB.id) return false;

        // Проверяем изменения в статусах участников для личных чатов
        if (chatA.type === 'private' && chatA.members && chatB.members) {
          const membersMatch = chatA.members.every((memberA, j) => {
            const memberB = chatB.members![j];
            return memberA?.user?.status === memberB?.user?.status &&
                   (memberA?.user as any)?.last_active_at === (memberB?.user as any)?.last_active_at;
          });
          if (!membersMatch) return false;
        }

        // Проверяем изменения в read_by для last_message
        const readByA = chatA.last_message?.read_by || [];
        const readByB = chatB.last_message?.read_by || [];
        if (readByA.length !== readByB.length) return false;
        if (!readByA.every((id, idx) => id === readByB[idx])) return false;

        return true;
      });
    }
  );

  const { isLoading, loadChats: fetchChats, createChat, deleteChat, updateChat, leaveChat, pinChat, unpinChat, markChatAsRead, toggleFavorite } = useChatStore();
  const currentUser = useAuthStore((state) => state.user);
  const { theme } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedChats, setSelectedChats] = useState<number[]>([]);
  const [isConnected, setIsConnected] = useState(websocketService.isConnected());
  const [chatFilter, setChatFilter] = useState<ChatFilter>('all');

  useEffect(() => {
    loadChats();
  }, []);

  // Логируем изменения в чатах для отладки статусов
  useEffect(() => {
    console.log('📋 ChatList: chats updated, total:', chats.length);
    const privateChats = chats.filter(c => c.type === 'private');
    privateChats.forEach(chat => {
      const companion = chat.members?.find(m => m.user_id !== currentUser?.id);
      if (companion?.user) {
        console.log(`  - Chat ${chat.id}: companion ${companion.user.name || companion.user.email} status = ${companion.user.status}`);
      }
    });
  }, [chats]);

  // Подписываемся на изменения статуса подключения WebSocket
  useEffect(() => {
    // Устанавливаем начальный статус
    setIsConnected(websocketService.isConnected());

    // Подписываемся на события подключения/отключения
    const handleConnect = () => {
      console.log('✅ WebSocket подключен');
      setIsConnected(true);
    };

    const handleDisconnect = () => {
      console.log('❌ WebSocket отключен');
      setIsConnected(false);
    };

    // Добавляем слушатели событий (если они доступны)
    // Если websocketService не поддерживает события, используем опрос с большим интервалом
    const checkInterval = setInterval(() => {
      const currentStatus = websocketService.isConnected();
      setIsConnected(prev => {
        // Обновляем только если статус действительно изменился
        if (prev !== currentStatus) {
          if (currentStatus) {
            console.log('✅ WebSocket переподключен');
          } else {
            console.log('❌ WebSocket соединение потеряно');
          }
          return currentStatus;
        }
        return prev;
      });
    }, 5000); // Проверяем каждые 5 секунд вместо 1 секунды

    return () => {
      clearInterval(checkInterval);
    };
  }, []);

  // Сброс выбора при выходе из режима редактирования
  useEffect(() => {
    if (!isEditMode) {
      setSelectedChats([]);
    }
  }, [isEditMode]);

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
    if (isEditMode) {
      // В режиме редактирования - выбираем чат
      toggleChatSelection(chat.id);
    } else {
      // Обычный режим - открываем чат
      navigation.navigate('Chat', {
        chatId: chat.id,
        chatName: chat.name,
      });
    }
  };

  const toggleChatSelection = (chatId: number) => {
    setSelectedChats(prev =>
      prev.includes(chatId)
        ? prev.filter(id => id !== chatId)
        : [...prev, chatId]
    );
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

  const handleDeleteSelectedChats = async () => {
    if (selectedChats.length === 0) return;

    Alert.alert(
      'Удалить чаты',
      `Удалить выбранные чаты (${selectedChats.length})?`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            try {
              await Promise.all(selectedChats.map(id => deleteChat(id)));
              setSelectedChats([]);
              setIsEditMode(false);
            } catch (error) {
              console.error('Failed to delete chats:', error);
            }
          },
        },
      ]
    );
  };

  const handleMarkSelectedAsRead = async () => {
    if (selectedChats.length === 0) return;

    try {
      await Promise.all(selectedChats.map(id => markChatAsRead(id)));
      setSelectedChats([]);
      setIsEditMode(false);
    } catch (error) {
      console.error('Failed to mark chats as read:', error);
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

  const handleTogglePinned = async (chatId: number) => {
    try {
      const chat = chats.find(c => c.id === chatId);
      if (!chat) return;

      if (chat.is_pinned) {
        await unpinChat(chatId);
      } else {
        await pinChat(chatId);
      }
    } catch (error) {
      console.error('Failed to toggle pin:', error);
    }
  };

  const handleMarkAsRead = async (chatId: number) => {
    try {
      await markChatAsRead(chatId);
    } catch (error) {
      console.error('Failed to mark chat as read:', error);
    }
  };

  const handleToggleFavorite = async (chatId: number) => {
    try {
      await toggleFavorite(chatId);
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  const filteredChats = chats
    .filter((chat) => {
      // Фильтр по типу
      if (chatFilter === 'group' && chat.type !== 'group') return false;
      if (chatFilter === 'private' && chat.type !== 'private') return false;
      if (chatFilter === 'favorite' && !chat.is_favorite) return false;

      // Фильтр по поиску
      if (!searchQuery) return true;
      const chatName = chat.name || '';
      const searchText = chatName.toLowerCase();
      return searchText.includes(searchQuery.toLowerCase());
    })
    .sort((a, b) => {
      // Закрепленные чаты всегда вверху
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;

      // Затем сортируем по времени последнего сообщения
      const timeA = a.last_message?.created_at || a.created_at || '';
      const timeB = b.last_message?.created_at || b.created_at || '';
      return new Date(timeB).getTime() - new Date(timeA).getTime();
    });

  if (isLoading && chats.length === 0) {
    return <Loading text="Загрузка чатов..." fullScreen />;
  }

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      backgroundColor: theme.background,
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
    editButton: {
      paddingHorizontal: 4,
    },
    editButtonText: {
      fontSize: 16,
      fontWeight: '400',
      color: theme.error,
    },
    addButtonText: {
      fontSize: 38,
      fontWeight: '200',
      color: theme.primary,
      lineHeight: 38,
    },
  });

  return (
    <SafeAreaView style={dynamicStyles.container} edges={['top', 'left', 'right']}>

      <View style={[styles.header, dynamicStyles.header]}>
        <View style={styles.headerTop}>
          {/* Левая кнопка - Изменить / Готово */}
          <TouchableOpacity
            onPress={() => setIsEditMode(!isEditMode)}
            style={dynamicStyles.editButton}
          >
            <Text style={dynamicStyles.editButtonText}>{isEditMode ? "Готово" : "Изм."}</Text>
          </TouchableOpacity>

          {/* Центр - Заголовок или статус подключения */}
          <View style={styles.centerContent}>
            {isConnected ? (
              <Text style={[styles.title, dynamicStyles.title]}>Чаты</Text>
            ) : (
              <ConnectionStatus />
            )}
          </View>

          {/* Правая кнопка - Добавить / пусто */}
          {!isEditMode ? (
            <TouchableOpacity onPress={handleNewChat} style={styles.newChatButton}>
              <Text style={dynamicStyles.addButtonText}>+</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.newChatButton} />
          )}
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

      {/* Фильтры типов чатов */}
      <View style={[styles.filterContainer, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={[
            styles.filterTab,
            chatFilter === 'all' && { borderBottomColor: theme.primary, borderBottomWidth: 2 }
          ]}
          onPress={() => setChatFilter('all')}
        >
          <Text style={[
            styles.filterText,
            { color: chatFilter === 'all' ? theme.primary : theme.textSecondary }
          ]}>
            Все
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterTab,
            chatFilter === 'private' && { borderBottomColor: theme.primary, borderBottomWidth: 2 }
          ]}
          onPress={() => setChatFilter('private')}
        >
          <Text style={[
            styles.filterText,
            { color: chatFilter === 'private' ? theme.primary : theme.textSecondary }
          ]}>
            Чаты
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterTab,
            chatFilter === 'group' && { borderBottomColor: theme.primary, borderBottomWidth: 2 }
          ]}
          onPress={() => setChatFilter('group')}
        >
          <Text style={[
            styles.filterText,
            { color: chatFilter === 'group' ? theme.primary : theme.textSecondary }
          ]}>
            Группы
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterTab,
            chatFilter === 'favorite' && { borderBottomColor: theme.primary, borderBottomWidth: 2 }
          ]}
          onPress={() => setChatFilter('favorite')}
        >
          <Text style={[
            styles.filterText,
            { color: chatFilter === 'favorite' ? theme.primary : theme.textSecondary }
          ]}>
            Избранное
          </Text>
        </TouchableOpacity>
      </View>

      {/* Кнопки действий в режиме редактирования */}
      {isEditMode && selectedChats.length > 0 && (
        <View style={[styles.actionBar, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.backgroundTertiary }]}
            onPress={handleMarkSelectedAsRead}
          >
            <Ionicons name="checkmark-done" size={20} color={theme.text} />
            <Text style={[styles.actionButtonText, { color: theme.text }]}>
              Прочитано ({selectedChats.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.error + '15' }]}
            onPress={handleDeleteSelectedChats}
          >
            <Ionicons name="trash" size={20} color={theme.error} />
            <Text style={[styles.actionButtonText, { color: theme.error }]}>
              Удалить ({selectedChats.length})
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {filteredChats.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="chatbubbles-outline" size={64} color={theme.borderLight} />
          <Text style={[styles.emptyTitle, dynamicStyles.emptyTitle]}>
            {searchQuery ? 'Чаты не найдены' : chatFilter === 'favorite' ? 'Нет избранных чатов' : 'Нет чатов'}
          </Text>
          <Text style={[styles.emptySubtitle, dynamicStyles.emptySubtitle]}>
            {searchQuery
              ? 'Попробуйте изменить поисковый запрос'
              : chatFilter === 'favorite'
              ? 'Добавьте чаты в избранное через контекстное меню'
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
              onDelete={handleDeleteChat}
              onLeave={handleLeaveChat}
              onTogglePinned={handleTogglePinned}
              onMarkAsRead={handleMarkAsRead}
              onToggleFavorite={handleToggleFavorite}
              isEditMode={isEditMode}
              isSelected={selectedChats.includes(item.id)}
            />
          )}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        />
      )}
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
    fontSize: 28,
    fontWeight: '700',
  },
  newChatButton: {
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
  },
  actionBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
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
