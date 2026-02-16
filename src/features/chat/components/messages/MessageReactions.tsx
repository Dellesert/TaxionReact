import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '@shared/hooks/useTheme';
import { Reaction } from '../../types/chat.types';
import { ReactionUsersModal } from './ReactionUsersModal';

interface ReactionGroup {
  emoji: string;
  count: number;
  userReacted: boolean;
}

interface MessageReactionsProps {
  reactions: Reaction[];
  currentUserId?: number;
  isOwnMessage: boolean;
  onReactionPress: (emoji: string) => void;
}

const MessageReactionsComponent: React.FC<MessageReactionsProps> = ({
  reactions,
  currentUserId,
  isOwnMessage,
  onReactionPress,
}) => {
  const { theme } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedEmoji, setSelectedEmoji] = useState<string>('');
  const [clickPosition, setClickPosition] = useState<{ x: number; y: number } | null>(null);

  const groups = useMemo(() => {
    const map = new Map<string, ReactionGroup>();
    for (const r of reactions) {
      const existing = map.get(r.emoji);
      if (existing) {
        existing.count++;
        if (r.user_id === currentUserId) existing.userReacted = true;
      } else {
        map.set(r.emoji, {
          emoji: r.emoji,
          count: 1,
          userReacted: r.user_id === currentUserId,
        });
      }
    }
    return Array.from(map.values());
  }, [reactions, currentUserId]);

  const handleLongPress = (emoji: string, event: any) => {
    // Получаем координаты клика для desktop
    const nativeEvent = event?.nativeEvent;
    if (nativeEvent && (nativeEvent.pageX !== undefined || nativeEvent.locationX !== undefined)) {
      setClickPosition({
        x: nativeEvent.pageX ?? nativeEvent.locationX ?? 0,
        y: nativeEvent.pageY ?? nativeEvent.locationY ?? 0,
      });
    } else {
      setClickPosition(null);
    }

    setSelectedEmoji(emoji);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setSelectedEmoji('');
    setClickPosition(null);
  };

  if (groups.length === 0) return null;

  return (
    <>
      <View style={styles.container}>
        {groups.map((group) => (
          <TouchableOpacity
            key={group.emoji}
            activeOpacity={0.7}
            onPress={() => onReactionPress(group.emoji)}
            onLongPress={(event) => handleLongPress(group.emoji, event)}
            style={[
              styles.badge,
              {
                backgroundColor: group.userReacted
                  ? theme.primary + '20'
                  : theme.background,
                borderColor: group.userReacted
                  ? theme.primary
                  : theme.border,
              },
            ]}
          >
            <Text style={styles.emoji}>{group.emoji}</Text>
            <Text style={[
              styles.count,
              { color: group.userReacted ? theme.primary : theme.textSecondary },
            ]}>
              {group.count}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ReactionUsersModal
        visible={modalVisible}
        emoji={selectedEmoji}
        reactions={reactions}
        onClose={handleCloseModal}
        clickPosition={clickPosition}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    flexShrink: 1,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  emoji: {
    fontSize: 16,
    marginRight: 4,
  },
  count: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export const MessageReactions = React.memo(MessageReactionsComponent);
