/**
 * MessageSearchOverlay Component
 * Overlay для поиска сообщений в чате
 */

import React, { useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated as RNAnimated,
  ActivityIndicator,
  FlatList,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { Message } from '../../types/chat.types';
import { formatTime } from '../../utils/message.utils';

interface SearchResult extends Message {
  // Можно добавить дополнительные поля для подсветки
}

interface MessageSearchOverlayProps {
  isVisible: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onClose: () => void;
  results: SearchResult[];
  total: number;
  currentIndex: number;
  isLoading: boolean;
  onResultPress: (messageId: number) => void;
  onNavigatePrev: () => void;
  onNavigateNext: () => void;
  hasMore: boolean;
  onLoadMore: () => void;
}

export const MessageSearchOverlay: React.FC<MessageSearchOverlayProps> = ({
  isVisible,
  searchQuery,
  onSearchChange,
  onClose,
  results,
  total,
  currentIndex,
  isLoading,
  onResultPress,
  onNavigatePrev,
  onNavigateNext,
  hasMore,
  onLoadMore,
}) => {
  const { theme } = useTheme();
  const slideAnimation = useRef(new RNAnimated.Value(0)).current;
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    RNAnimated.timing(slideAnimation, {
      toValue: isVisible ? 1 : 0,
      duration: 250,
      useNativeDriver: true,
    }).start();

    if (isVisible) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isVisible]);

  const handleClose = useCallback(() => {
    Keyboard.dismiss();
    onClose();
  }, [onClose]);

  const highlightMatch = (text: string, query: string) => {
    if (!query || query.length < 3) return text;

    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, index) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <Text key={index} style={{ backgroundColor: theme.warning + '40', fontWeight: '600' }}>
          {part}
        </Text>
      ) : (
        part
      )
    );
  };

  const renderResultItem = ({ item, index }: { item: SearchResult; index: number }) => {
    const isSelected = index === currentIndex;
    const senderName = item.sender?.first_name
      ? `${item.sender.first_name} ${item.sender.last_name || ''}`.trim()
      : 'Пользователь';

    return (
      <TouchableOpacity
        style={[
          styles.resultItem,
          {
            backgroundColor: isSelected ? theme.primary + '20' : theme.backgroundSecondary,
            borderLeftColor: isSelected ? theme.primary : 'transparent',
          },
        ]}
        onPress={() => onResultPress(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.resultHeader}>
          <Text style={[styles.senderName, { color: theme.primary }]} numberOfLines={1}>
            {senderName}
          </Text>
          <Text style={[styles.timestamp, { color: theme.textTertiary }]}>
            {formatTime(item.created_at)}
          </Text>
        </View>
        <Text style={[styles.messageContent, { color: theme.text }]} numberOfLines={2}>
          {highlightMatch(item.content || '', searchQuery)}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderFooter = () => {
    if (!hasMore) return null;
    return (
      <TouchableOpacity
        style={[styles.loadMoreButton, { backgroundColor: theme.backgroundTertiary }]}
        onPress={onLoadMore}
      >
        <Text style={[styles.loadMoreText, { color: theme.primary }]}>
          Загрузить ещё
        </Text>
      </TouchableOpacity>
    );
  };

  if (!isVisible) return null;

  return (
    <RNAnimated.View
      style={[
        styles.container,
        {
          backgroundColor: theme.background,
          transform: [
            {
              translateY: slideAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: [-400, 0],
              }),
            },
          ],
          opacity: slideAnimation,
        },
      ]}
    >
      {/* Search Input */}
      <View style={[styles.searchBar, { backgroundColor: theme.backgroundSecondary }]}>
        <Ionicons name="search" size={20} color={theme.textTertiary} />
        <TextInput
          ref={inputRef}
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Поиск сообщений..."
          placeholderTextColor={theme.inputPlaceholder}
          value={searchQuery}
          onChangeText={onSearchChange}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => onSearchChange('')} style={styles.clearButton}>
            <Ionicons name="close-circle" size={20} color={theme.textTertiary} />
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color={theme.text} />
        </TouchableOpacity>
      </View>

      {/* Results Counter & Navigation */}
      {searchQuery.length >= 3 && (
        <View style={[styles.navigationBar, { borderBottomColor: theme.border }]}>
          <Text style={[styles.resultsCount, { color: theme.textSecondary }]}>
            {isLoading ? (
              'Поиск...'
            ) : total > 0 ? (
              `${currentIndex + 1} из ${total}`
            ) : (
              'Ничего не найдено'
            )}
          </Text>

          {total > 0 && (
            <View style={styles.navigationButtons}>
              <TouchableOpacity
                onPress={onNavigatePrev}
                style={[
                  styles.navButton,
                  { backgroundColor: theme.backgroundTertiary },
                  currentIndex === 0 && styles.navButtonDisabled,
                ]}
                disabled={currentIndex === 0}
              >
                <Ionicons
                  name="chevron-up"
                  size={20}
                  color={currentIndex === 0 ? theme.textTertiary : theme.text}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onNavigateNext}
                style={[
                  styles.navButton,
                  { backgroundColor: theme.backgroundTertiary },
                  currentIndex === total - 1 && styles.navButtonDisabled,
                ]}
                disabled={currentIndex === total - 1}
              >
                <Ionicons
                  name="chevron-down"
                  size={20}
                  color={currentIndex === total - 1 ? theme.textTertiary : theme.text}
                />
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Results List */}
      {searchQuery.length >= 3 && (
        <View style={styles.resultsContainer}>
          {isLoading && results.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={theme.primary} />
            </View>
          ) : results.length > 0 ? (
            <FlatList
              data={results}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderResultItem}
              ListFooterComponent={renderFooter}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.listContent}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="search-outline" size={48} color={theme.textTertiary} />
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                Сообщения не найдены
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Hint for minimum characters */}
      {searchQuery.length > 0 && searchQuery.length < 3 && (
        <View style={styles.hintContainer}>
          <Text style={[styles.hintText, { color: theme.textTertiary }]}>
            Введите минимум 3 символа для поиска
          </Text>
        </View>
      )}
    </RNAnimated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    maxHeight: '70%',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 100,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
    outlineStyle: 'none',
  } as any,
  clearButton: {
    padding: 4,
  },
  closeButton: {
    padding: 4,
    marginLeft: 4,
  },
  navigationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  resultsCount: {
    fontSize: 14,
  },
  navigationButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  resultsContainer: {
    flex: 1,
    minHeight: 100,
    maxHeight: 300,
  },
  listContent: {
    paddingBottom: 8,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  resultItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderLeftWidth: 3,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  senderName: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  timestamp: {
    fontSize: 12,
    marginLeft: 8,
  },
  messageContent: {
    fontSize: 14,
    lineHeight: 20,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
  },
  hintContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  hintText: {
    fontSize: 14,
  },
  loadMoreButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
  },
  loadMoreText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
