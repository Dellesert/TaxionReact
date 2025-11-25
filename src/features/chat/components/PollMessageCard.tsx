/**
 * PollMessageCard
 * Компонент для отображения опроса в чате
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { MessagePollData } from '../types/chat.types';

interface PollMessageCardProps {
  pollData: MessagePollData;
  onPress?: () => void; // Теперь необязательный, так как не используется
}

const PollMessageCard: React.FC<PollMessageCardProps> = ({ pollData, onPress }) => {
  console.log('🎴 PollMessageCard rendering with pollData:', pollData);
  const { theme, isDark } = useTheme();

  // Определяем иконку в зависимости от типа опроса
  const getPollIcon = () => {
    switch (pollData.poll_type) {
      case 'single_choice':
        return 'radio-button-on';
      case 'multiple_choice':
        return 'checkmark-circle';
      case 'rating':
        return 'star';
      case 'open_text':
        return 'chatbox-ellipses';
      default:
        return 'stats-chart';
    }
  };

  // Определяем иконку статуса
  const getStatusIcon = () => {
    if (pollData.poll_status) {
      switch (pollData.poll_status) {
        case 'active':
          return 'checkmark-circle';
        case 'closed':
          return 'close-circle';
        case 'archived':
          return 'archive';
        case 'cancelled':
          return 'ban';
        case 'draft':
          return 'create';
        default:
          return 'checkmark-circle';
      }
    }
    return 'checkmark-circle';
  };

  const isEnded = pollData.poll_status === 'closed' || pollData.poll_status === 'archived' || pollData.poll_status === 'cancelled';

  const styles = StyleSheet.create({
    container: {
      backgroundColor: isDark ? 'rgba(99, 102, 241, 0.15)' : '#EEF2FF',
      borderLeftWidth: 4,
      borderLeftColor: theme.primary,
      borderRadius: 12,
      padding: 12,
      marginVertical: 2,
      maxWidth: '100%',
      minWidth: 280,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 8,
    },
    iconContainer: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: isDark ? 'rgba(99, 102, 241, 0.25)' : theme.primary + '20',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
      flexShrink: 0,
    },
    headerText: {
      flex: 1,
      minWidth: 0,
    },
    pollBadge: {
      fontSize: 10,
      fontWeight: '700',
      color: theme.primary,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginBottom: 4,
    },
    title: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.text,
      lineHeight: 20,
      flexWrap: 'wrap',
    },
    question: {
      fontSize: 13,
      color: theme.textSecondary,
      marginBottom: 12,
      lineHeight: 18,
      marginLeft: 46,
    },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
    },
    footerRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    footerItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    footerText: {
      fontSize: 13,
      fontWeight: '500',
      color: theme.textSecondary,
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Ionicons name={getPollIcon()} size={18} color={theme.primary} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.pollBadge}>Опрос</Text>
          <Text style={styles.title} numberOfLines={2}>
            {pollData.poll_title}
          </Text>
        </View>
      </View>

      {pollData.poll_question && (
        <Text style={styles.question} numberOfLines={3}>
          {pollData.poll_question}
        </Text>
      )}

      <View style={styles.footer}>
        <View style={styles.footerRight}>
          {/* Иконка статуса */}
          <View style={styles.footerItem}>
            <Ionicons name={getStatusIcon()} size={16} color={theme.textSecondary} />
          </View>

          {/* Количество голосов */}
          {pollData.total_votes !== undefined && (
            <View style={styles.footerItem}>
              <Ionicons name="people" size={16} color={theme.textSecondary} />
              <Text style={styles.footerText}>{pollData.total_votes}</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

export default PollMessageCard;
