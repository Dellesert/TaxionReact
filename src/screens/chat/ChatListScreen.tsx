/**
 * Chat List Screen
 * Экран списка чатов
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, TextInput, StyleSheet, Modal, Platform, Animated as RNAnimated, Dimensions, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { ChatStackParamList } from '@navigation/types';
import { useChatStore } from '@store/chatStore';
import { useAuthStore } from '@store/authStore';
import { useActionModal } from '@contexts/ActionModalContext';
import { Loading } from '@components/common/Loading';
import { ChatItem } from '@components/chat/ChatItem';
import { ChatListSkeleton } from '@components/chat/ChatListSkeleton';
import { ConnectionStatus } from '@components/common/ConnectionStatus';
import { ScreenHeader } from '@components/common/ScreenHeader';
import { useTheme } from '@hooks/useTheme';
import { Chat, ChatType } from '../../types/chat.types';
import { websocketService } from '@services/websocket.service';

type ChatListNavigationProp = NativeStackNavigationProp<ChatStackParamList, 'ChatList'>;

type ChatFilter = 'all' | 'group' | 'private' | 'favorite';

const SCREEN_WIDTH = Dimensions.get('window').width;

const ChatListScreen: React.FC = () => {
  const navigation = useNavigation<ChatListNavigationProp>();
  const insets = useSafeAreaInsets();

  const { chats, isLoading, isLoadingMore, totalChats, hasMoreChats, error, tabs, loadTabData, switchTab: storeSwitchTab, refreshCurrentTab, loadMoreChats, loadUnreadCount, createChat, deleteChat, updateChat, leaveChat, pinChat, unpinChat, markChatAsRead, toggleFavorite } = useChatStore();
  const currentUser = useAuthStore((state) => state.user);
  const { theme } = useTheme();
  const { showConfirm } = useActionModal();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedChats, setSelectedChats] = useState<number[]>([]);
  const [isConnected, setIsConnected] = useState(websocketService.isConnected());
  const [chatFilter, setChatFilter] = useState<ChatFilter>('all');
  const [isCreateMenuVisible, setIsCreateMenuVisible] = useState(false);
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [canLoadMore, setCanLoadMore] = useState(false);

  // Store measured container width for accurate indicator positioning
  const [tabContainerWidth, setTabContainerWidth] = useState<number>(SCREEN_WIDTH);

  // Animation for search
  const searchAnimation = useRef(new RNAnimated.Value(0)).current;

  // Animation for tab transitions (slide with Reanimated)
  const translateX = useSharedValue(0);
  const isSwipingHorizontally = useSharedValue(false);
  const currentTabIndex = useSharedValue(0); // Track current tab index

  // Animated style for tab indicator
  const tabIndicatorStyle = useAnimatedStyle(() => {
    'worklet';

    let progress: number;

    if (Platform.OS === 'ios') {
      // On iOS: use swipe progress for smooth swipe animation
      progress = -translateX.value / SCREEN_WIDTH;
    } else {
      // On web/android: use currentTabIndex (which animates smoothly)
      progress = currentTabIndex.value;
    }

    const clampedProgress = Math.max(0, Math.min(3, progress));

    // Calculate position and width as percentage of container width
    const containerWidth = tabContainerWidth;
    const tabWidth = containerWidth / 4;
    const offset = tabWidth * clampedProgress;

    return {
      width: tabWidth,
      transform: [{ translateX: offset }],
    };
  }, [tabContainerWidth]);

  useEffect(() => {
    // Load all tabs on mount for instant switching
    const loadAllTabs = async () => {
      // Load current tab first (highest priority)
      await loadTabData('all');

      // Then load other tabs in background for instant switching
      // Use setTimeout to not block the UI
      setTimeout(() => {
        loadTabData('private');
      }, 100);

      setTimeout(() => {
        loadTabData('group');
      }, 200);

      setTimeout(() => {
        loadTabData('favorite');
      }, 300);
    };

    loadAllTabs();
  }, []);

  // Обновляем счетчик непрочитанных при возврате на экран
  // НЕ обновляем список чатов чтобы не перезаписать локальные изменения данными с сервера
  useFocusEffect(
    React.useCallback(() => {
      // Обновляем только общий счетчик непрочитанных
      loadUnreadCount();
    }, [loadUnreadCount])
  );

  useEffect(() => {
    RNAnimated.timing(searchAnimation, {
      toValue: isSearchVisible ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [isSearchVisible]);

  // Логируем изменения в чатах для отладки статусов
  useEffect(() => {
    const privateChats = chats.filter(c => c.type === 'private');
    privateChats.forEach(chat => {
      const companion = chat.members?.find(m => m.user_id !== currentUser?.id);
      if (companion?.user) {
      }
    });
  }, [chats]);

  // Подписываемся на изменения статуса подключения WebSocket
  useEffect(() => {
    // Проверяем статус сразу и быстрее
    const checkInterval = setInterval(() => {
      const currentStatus = websocketService.isConnected();
      setIsConnected(prev => {
        // Обновляем только если статус действительно изменился
        if (prev !== currentStatus) {
          return currentStatus;
        }
        return prev;
      });
    }, 500); // Проверяем каждые 500ms для быстрой реакции

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

  // Swipe gesture to switch tabs (iOS only)
  const filterTabsOrder: ChatFilter[] = ['all', 'private', 'group', 'favorite'];

  const switchToFilter = async (newFilter: ChatFilter) => {
    setChatFilter(newFilter);
    // Сбрасываем флаг при переключении табов, чтобы не было автозагрузки сразу
    setCanLoadMore(false);
    setTimeout(() => setCanLoadMore(true), 500);

    const newIndex = filterTabsOrder.indexOf(newFilter);

    // Animate tab index for smooth indicator transition (works on all platforms)
    currentTabIndex.value = withTiming(newIndex, { duration: 250 });

    // Animate to the new tab position on iOS
    if (Platform.OS === 'ios') {
      translateX.value = withTiming(-newIndex * SCREEN_WIDTH, { duration: 300 });
    }

    // Use the new store switchTab function - it will load data if needed
    storeSwitchTab(newFilter);

    // Preload adjacent tabs for smooth swipe on iOS
    if (Platform.OS === 'ios') {
      const currentIndex = filterTabsOrder.indexOf(newFilter);

      // Preload next tab
      if (currentIndex < filterTabsOrder.length - 1) {
        const nextTab = filterTabsOrder[currentIndex + 1];
        setTimeout(() => loadTabData(nextTab), 100);
      }

      // Preload previous tab
      if (currentIndex > 0) {
        const prevTab = filterTabsOrder[currentIndex - 1];
        setTimeout(() => loadTabData(prevTab), 100);
      }
    }
  };

  const resetSwipeFlag = () => {
    setTimeout(() => {
      isSwipingHorizontally.value = false;
    }, 100);
  };

  const handleFilterChange = async (newFilter: ChatFilter) => {
    setChatFilter(newFilter);
    // Сбрасываем флаг при переключении табов
    setCanLoadMore(false);
    setTimeout(() => setCanLoadMore(true), 500);
    // Use the new store switchTab function
    storeSwitchTab(newFilter);

    // Preload adjacent tabs for smooth swipe on iOS
    if (Platform.OS === 'ios') {
      const currentIndex = filterTabsOrder.indexOf(newFilter);

      // Preload next tab
      if (currentIndex < filterTabsOrder.length - 1) {
        const nextTab = filterTabsOrder[currentIndex + 1];
        setTimeout(() => loadTabData(nextTab), 100);
      }

      // Preload previous tab
      if (currentIndex > 0) {
        const prevTab = filterTabsOrder[currentIndex - 1];
        setTimeout(() => loadTabData(prevTab), 100);
      }
    }
  };

  // Initialize translateX based on active filter
  useEffect(() => {
    if (Platform.OS === 'ios') {
      const currentIndex = filterTabsOrder.indexOf(chatFilter);
      currentTabIndex.value = currentIndex;
      translateX.value = -currentIndex * SCREEN_WIDTH;
    }
  }, []);

  const swipeGesture = Gesture.Pan()
    .enabled(Platform.OS === 'ios')
    .maxPointers(1)
    .onBegin(() => {
      'worklet';
      isSwipingHorizontally.value = false;
    })
    .onUpdate((event) => {
      'worklet';
      const absX = Math.abs(event.translationX);
      const absY = Math.abs(event.translationY);

      if (absX > absY || absX > 3) {
        isSwipingHorizontally.value = true;
        const baseOffset = -currentTabIndex.value * SCREEN_WIDTH;
        translateX.value = baseOffset + event.translationX;
      }
    })
    .onEnd((event) => {
      'worklet';
      const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25; // Reduced threshold for faster response
      const VELOCITY_THRESHOLD = 400; // Reduced for easier swipes
      const currentIndex = currentTabIndex.value;

      const shouldSwitchTab = Math.abs(event.translationX) > SWIPE_THRESHOLD || Math.abs(event.velocityX) > VELOCITY_THRESHOLD;

      let targetIndex = currentIndex;

      if (shouldSwitchTab && event.translationX > 0 && currentIndex > 0) {
        targetIndex = currentIndex - 1;
      } else if (shouldSwitchTab && event.translationX < 0 && currentIndex < 3) {
        targetIndex = currentIndex + 1;
      }

      const targetOffset = -targetIndex * SCREEN_WIDTH;

      // Use spring animation for more natural feel
      translateX.value = withTiming(targetOffset, {
        duration: 200, // Faster animation
      }, () => {
        'worklet';
        currentTabIndex.value = targetIndex;
      });

      if (targetIndex !== currentIndex) {
        runOnJS(handleFilterChange)(filterTabsOrder[targetIndex]);
      }

      runOnJS(resetSwipeFlag)();
    });

  const animatedContentStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const handleRefresh = async () => {
    setRefreshing(true);
    setCanLoadMore(false); // Сбрасываем флаг при обновлении

    // Если WebSocket отключен, пытаемся переподключить
    if (!websocketService.isConnected()) {
      websocketService.reconnect();
    }

    // Refresh current tab data and unread count
    await Promise.all([
      refreshCurrentTab(),
      loadUnreadCount(),
    ]);

    setRefreshing(false);
    // Разрешаем подгрузку после обновления
    setTimeout(() => setCanLoadMore(true), 500);
  };

  const handleChatPress = (chat: Chat) => {
    // Block chat press if currently swiping horizontally
    if (isSwipingHorizontally.value) {
      return;
    }
    if (isEditMode) {
      // В режиме редактирования - выбираем чат
      toggleChatSelection(chat.id);
    } else {
      // Обычный режим - открываем чат
      navigation.navigate('Chat', {
        chatId: chat.id,
        chatName: chat.name,
        unreadCount: chat.unread_count || 0, // Передаем количество непрочитанных
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

  const toggleEditMode = () => {
    setIsEditMode(!isEditMode);
    if (isEditMode) {
      // При выходе из режима редактирования - очищаем выбранные чаты
      setSelectedChats([]);
    } else {
      // При входе в режим редактирования - скрываем поиск и очищаем запрос
      setIsSearchVisible(false);
      setSearchQuery('');
    }
  };

  const handleNewChat = () => {
    setIsCreateMenuVisible(true);
  };

  const handleCreateChatType = (chatType: ChatType) => {
    setIsCreateMenuVisible(false);
    // Навигируем на экран создания чата с предвыбранным типом
    navigation.navigate('CreateChat', { initialChatType: chatType });
  };

  const handleDeleteChat = async (chatId: number, clearHistory?: boolean) => {
    try {
      await deleteChat(chatId, clearHistory);
    } catch (error) {
      console.error('Failed to delete chat:', error);
    }
  };

  const handleDeleteSelectedChats = async () => {
    if (selectedChats.length === 0) return;

    showConfirm(
      'Удалить чаты',
      `Удалить выбранные чаты (${selectedChats.length})?`,
      async () => {
        try {
          await Promise.all(selectedChats.map(id => deleteChat(id)));
          setSelectedChats([]);
          setIsEditMode(false);
        } catch (error) {
          console.error('Failed to delete chats:', error);
        }
      },
      undefined,
      { confirmText: 'Удалить', cancelText: 'Отмена', destructive: true }
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
    } catch (error) {
      console.error('Failed to rename chat:', error);
    }
  };

  const handleLeaveChat = async (chatId: number) => {
    try {
      await leaveChat(chatId);
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

  // Memoized render item for better performance
  const renderChatItem = useCallback(({ item }: { item: Chat }) => (
    <ChatItem
      chat={item}
      onPress={handleChatPress}
      isSelected={selectedChats.includes(item.id)}
      isEditMode={isEditMode}
      onToggleFavorite={() => handleToggleFavorite(item.id)}
      onTogglePinned={() => handleTogglePinned(item.id)}
      onMarkAsRead={() => handleMarkAsRead(item.id)}
      onDelete={handleDeleteChat}
    />
  ), [isEditMode, selectedChats, handleChatPress, handleToggleFavorite, handleTogglePinned, handleMarkAsRead, handleDeleteChat]);

  // Render a single tab content
  const renderFilterContent = useCallback((filterKey: ChatFilter) => {
    // Get chats for this specific tab from store
    const tabData = tabs[filterKey];
    const tabChatsFromStore = [...tabData.pinnedChats, ...tabData.regularChats];

    // Backend now handles filtering and sorting
    // Here we only apply client-side search if a query is present
    const tabChats = tabChatsFromStore.filter((chat) => {
      if (!searchQuery) return true;
      const chatName = chat.name || '';
      const searchText = chatName.toLowerCase();
      return searchText.includes(searchQuery.toLowerCase());
    });

    return (
      <View key={filterKey} style={{ width: SCREEN_WIDTH, height: '100%' }}>
        {isLoading && !tabData.loaded ? (
          <ChatListSkeleton />
        ) : tabChats.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={64} color="#D1D5DB" />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>Нет чатов</Text>
          </View>
        ) : (
          <FlatList
            data={tabChats}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderChatItem}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
            contentContainerStyle={{ paddingBottom: 80 + insets.bottom }}
            onEndReached={() => {
              if (canLoadMore && hasMoreChats && !isLoadingMore) {
                loadMoreChats();
              }
            }}
            onEndReachedThreshold={0.3}
            ListFooterComponent={
              isLoadingMore && hasMoreChats ? (
                <View style={styles.loadMoreContainer}>
                  <ActivityIndicator size="small" color={theme.primary} />
                </View>
              ) : null
            }
            // Performance optimizations
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
            updateCellsBatchingPeriod={50}
            initialNumToRender={15}
            windowSize={5}
            getItemLayout={(data, index) => ({
              length: 80, // Примерная высота ChatItem
              offset: 80 * index,
              index,
            })}
          />
        )}
      </View>
    );
  }, [tabs, searchQuery, isLoading, refreshing, canLoadMore, hasMoreChats, isLoadingMore, theme, renderChatItem, handleRefresh, loadMoreChats]);

  // Show error state if there's an error and no chats loaded
  if (error && chats.length === 0 && !isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <ScreenHeader
          title="Чаты"
          showBackButton={false}
        />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color={theme.error} />
          <Text style={[styles.errorText, { color: theme.textSecondary }]}>{error}</Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: theme.error }]}
            onPress={() => {
              // Переподключаем WebSocket при повторной попытке
              if (!websocketService.isConnected()) {
                websocketService.reconnect();
              }
              // Reload current tab
              loadTabData(chatFilter);
            }}
          >
            <Text style={styles.retryButtonText}>Попробовать снова</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
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
    emptyTitle: {
      color: theme.textSecondary,
    },
    emptySubtitle: {
      color: theme.textTertiary,
    },
  });

  return (
    <SafeAreaView style={[dynamicStyles.container, { backgroundColor: theme.card }]} edges={['top', 'left', 'right']}>

      <ScreenHeader
        title="Чаты"
        customContent={
          <>
            {/* Header Row */}
            <View style={[styles.headerRow, { marginTop: isEditMode ? 10 : 0 },{marginBottom: isEditMode ? 6 : -4 }]}>
              {/* Левая кнопка - Изменить / Готово */}
              <TouchableOpacity
                onPress={toggleEditMode}
                style={styles.editButton}
              >
                <Text style={[styles.editButtonText, { color: theme.error }]}>{isEditMode ? "Готово" : "Изм."}</Text>
              </TouchableOpacity>

              {/* Центр - Заголовок или статус подключения */}
              {isConnected === false ? (
                <ConnectionStatus compact />
              ) : (
                <Text style={[styles.headerTitle, { color: theme.text }]}>Чаты</Text>
              )}

              {/* Правые кнопки - Поиск + Добавить */}
              <View style={[styles.headerRight, styles.headerActions]}>
                {!isEditMode ? (
                  <TouchableOpacity
                    onPress={() => setIsSearchVisible(!isSearchVisible)}
                    style={styles.iconButton}
                  >
                    <Ionicons name={isSearchVisible ? "close" : "search"} size={24} color={theme.error} />
                  </TouchableOpacity>
                ) : (
                  <View style={styles.iconButton} />
                )}
                {!isEditMode ? (
                  <TouchableOpacity onPress={handleNewChat} style={styles.addButton}>
                    <Ionicons name="add" size={30} color={theme.primary} />
                  </TouchableOpacity>
                ) : (
                  <View style={styles.addButton} />
                )}
              </View>
            </View>

            {/* Animated Search Bar */}
            <RNAnimated.View
              style={[
                styles.animatedSearchContainer,
                {
                  maxHeight: searchAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 60],
                  }),
                  opacity: searchAnimation,
                },
              ]}
            >
              <View style={[styles.searchContainer, { backgroundColor: theme.backgroundTertiary }]}>
                <Ionicons name="search" size={20} color={theme.textTertiary} />
                <TextInput
                  style={[styles.searchInput, { color: theme.text }]}
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
            </RNAnimated.View>

            {/* Фильтры типов чатов */}
            <View
              style={[styles.filterContainer, { borderTopColor: theme.border, borderBottomColor: theme.border }]}
              onLayout={(e) => {
                const { width } = e.nativeEvent.layout;
                setTabContainerWidth(width);
              }}
            >
              <TouchableOpacity
                style={styles.filterTab}
                onPress={() => switchToFilter('all')}
              >
                <Text
                  style={[
                    styles.filterText,
                    { color: chatFilter === 'all' ? theme.primary : theme.textSecondary }
                  ]}
                >
                  Все
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.filterTab}
                onPress={() => switchToFilter('private')}
              >
                <Text
                  style={[
                    styles.filterText,
                    { color: chatFilter === 'private' ? theme.primary : theme.textSecondary }
                  ]}
                >
                  Чаты
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.filterTab}
                onPress={() => switchToFilter('group')}
              >
                <Text
                  style={[
                    styles.filterText,
                    { color: chatFilter === 'group' ? theme.primary : theme.textSecondary }
                  ]}
                >
                  Группы
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.filterTab}
                onPress={() => switchToFilter('favorite')}
              >
                <Text
                  style={[
                    styles.filterText,
                    { color: chatFilter === 'favorite' ? theme.primary : theme.textSecondary }
                  ]}
                >
                  Избранное
                </Text>
              </TouchableOpacity>

              {/* Анимированный индикатор */}
              <Animated.View
                style={[
                  styles.tabIndicator,
                  { backgroundColor: theme.primary },
                  tabIndicatorStyle
                ]}
              />
            </View>
          </>
        }
      />

      {/* Content container with background */}
      <View style={{ flex: 1, backgroundColor: theme.background }}>
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

      {/* Content container with horizontal tabs (iOS) or single tab (Android) */}
      <View style={{ flex: 1, overflow: 'hidden' }}>
        <GestureDetector gesture={swipeGesture}>
          <Animated.View style={[styles.horizontalTabsContainer, animatedContentStyle]}>
            {Platform.OS === 'ios' ? (
              // Render all tabs side by side for iOS swipe
              filterTabsOrder.map((filterKey) => renderFilterContent(filterKey))
            ) : (
              // Render only active tab for Android
              renderFilterContent(chatFilter)
            )}
          </Animated.View>
        </GestureDetector>
      </View>

      {/* Модальное меню выбора типа чата */}
      <Modal
        visible={isCreateMenuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsCreateMenuVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsCreateMenuVisible(false)}
        >
          <View style={[styles.menuContainer, { backgroundColor: theme.card }]}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleCreateChatType('private')}
            >
              <Ionicons name="person" size={24} color={theme.primary} />
              <Text style={[styles.menuItemText, { color: theme.text }]}>Личный чат</Text>
            </TouchableOpacity>

            <View style={[styles.menuDivider, { backgroundColor: theme.border }]} />

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleCreateChatType('group')}
            >
              <Ionicons name="people" size={24} color={theme.primary} />
              <Text style={[styles.menuItemText, { color: theme.text }]}>Групповой чат</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  editButton: {
    width: 100,
    paddingHorizontal: 4,
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: '400',
  },
  addButton: {
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRight: {
    width: 100,
    justifyContent: 'flex-end',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconButton: {
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  animatedSearchContainer: {
    overflow: 'hidden',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  filterContainer: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 4,
    borderTopWidth: 1,
    borderBottomWidth: 0,
    position: 'relative',
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    height: 2,
    // Width is now dynamic, set by animated style
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  menuContainer: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 60 : 100,
    right: 16,
    width: 200,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 16,
  },
  menuItemText: {
    fontSize: 17,
    fontWeight: '500',
  },
  menuDivider: {
    height: 1,
    marginHorizontal: 16,
  },
  horizontalTabsContainer: {
    flexDirection: 'row',
    width: SCREEN_WIDTH * 4, // 4 tabs: all, group, private, favorite
    height: '100%',
  },
  loadMoreContainer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  loadMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    gap: 6,
  },
  loadMoreText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default ChatListScreen;
