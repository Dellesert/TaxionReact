import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '@shared/hooks/useTheme';

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

interface ReactionBarProps {
  onSelectEmoji: (emoji: string) => void;
  existingReactions?: string[];
}

const ReactionBarComponent: React.FC<ReactionBarProps> = ({
  onSelectEmoji,
  existingReactions = [],
}) => {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {QUICK_EMOJIS.map((emoji) => {
        const isActive = existingReactions.includes(emoji);
        return (
          <TouchableOpacity
            key={emoji}
            activeOpacity={0.6}
            onPress={() => onSelectEmoji(emoji)}
            style={[
              styles.emojiButton,
              isActive && { backgroundColor: theme.primary + '20' },
            ]}
          >
            <Text style={styles.emojiText}>{emoji}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  emojiButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiText: {
    fontSize: 24,
  },
});

export const ReactionBar = React.memo(ReactionBarComponent);
