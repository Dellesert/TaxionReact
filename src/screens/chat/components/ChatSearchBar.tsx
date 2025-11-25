import React, { useEffect, useRef } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, Animated as RNAnimated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@hooks/useTheme';

interface ChatSearchBarProps {
  isVisible: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export const ChatSearchBar: React.FC<ChatSearchBarProps> = ({
  isVisible,
  searchQuery,
  onSearchChange,
}) => {
  const { theme } = useTheme();
  const searchAnimation = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    RNAnimated.timing(searchAnimation, {
      toValue: isVisible ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [isVisible]);

  return (
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
          onChangeText={onSearchChange}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => onSearchChange('')}>
            <Ionicons name="close-circle" size={20} color={theme.textTertiary} />
          </TouchableOpacity>
        )}
      </View>
    </RNAnimated.View>
  );
};

const styles = StyleSheet.create({
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
});
