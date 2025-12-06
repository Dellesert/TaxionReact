import React, { useRef, useEffect } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, Animated as RNAnimated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';

interface TaskSearchBarProps {
  isVisible: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export const TaskSearchBar: React.FC<TaskSearchBarProps> = ({
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
        styles.searchContainer,
        {
          maxHeight: searchAnimation.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 60],
          }),
          opacity: searchAnimation,
        },
      ]}
    >
      <View style={[styles.searchInputContainer, { backgroundColor: theme.backgroundTertiary }]}>
        <Ionicons name="search" size={20} color={theme.textTertiary} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Поиск..."
          placeholderTextColor={theme.inputPlaceholder}
          value={searchQuery}
          onChangeText={onSearchChange}
          autoFocus={isVisible}
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
  searchContainer: {
    overflow: 'hidden',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    marginTop: 12,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
});
