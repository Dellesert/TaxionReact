/**
 * Chat Detail Header Component
 * Шапка экрана деталей чата
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Avatar from '@components/common/Avatar';
import { useTheme } from '@hooks/useTheme';

interface Chat {
  id: number;
  name: string;
  type: 'private' | 'group';
  avatar?: string;
  member_count?: number;
}

interface ChatDetailHeaderProps {
  chat: Chat;
  typingUsers: string[];
}

export const ChatDetailHeader: React.FC<ChatDetailHeaderProps> = ({ chat, typingUsers }) => {
  const { theme } = useTheme();
  const navigation = useNavigation();

  const handleBack = () => {
    navigation.goBack();
  };

  const handleHeaderPress = () => {
    // Navigate to chat settings if needed
    console.log('Navigate to chat settings:', chat.id);
  };

  const getSubtitleText = (): string => {
    if (typingUsers.length > 0) {
      return 'печатает...';
    }

    if (chat.type === 'group' && chat.member_count) {
      return `${chat.member_count} участников`;
    }

    return '';
  };

  const dynamicStyles = StyleSheet.create({
    container: {
      backgroundColor: theme.card,
      borderBottomColor: theme.border,
    },
    title: {
      color: theme.text,
    },
    subtitle: {
      color: typingUsers.length > 0 ? theme.primary : theme.textSecondary,
    },
  });

  return (
    <View style={[styles.container, dynamicStyles.container]}>
      <TouchableOpacity
        onPress={handleBack}
        style={styles.backButton}
        activeOpacity={0.7}
      >
        <Ionicons name="chevron-back" size={28} color={theme.primary} />
      </TouchableOpacity>

      <TouchableOpacity
        onPress={handleHeaderPress}
        activeOpacity={0.7}
        style={styles.centerContainer}
      >
        <View style={styles.titleContainer}>
          <Text style={[styles.title, dynamicStyles.title]} numberOfLines={1}>
            {chat.name}
          </Text>
          {getSubtitleText() && (
            <Text
              style={[styles.subtitle, dynamicStyles.subtitle]}
              numberOfLines={1}
            >
              {getSubtitleText()}
            </Text>
          )}
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={handleHeaderPress}
        activeOpacity={0.7}
        style={styles.avatarButton}
      >
        <Avatar
          imageUrl={chat.avatar}
          name={chat.name}
          size={36}
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  backButton: {
    marginRight: 8,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  titleContainer: {
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  avatarButton: {
    marginLeft: 8,
  },
});
