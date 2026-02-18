import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useTheme } from '@shared/hooks/useTheme';
import { Reaction } from '../../types/chat.types';
import { ReactionUsersModal } from './ReactionUsersModal';
import { isElectron } from '@shared/utils/platform';

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
  const [hoveredEmoji, setHoveredEmoji] = useState<string | null>(null);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isDesktopApp = useMemo(() => isElectron(), []);

  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    };
  }, []);

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

  const handleMouseEnter = useCallback((emoji: string) => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = setTimeout(() => {
      setHoveredEmoji(emoji);
    }, 300);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    setHoveredEmoji(null);
  }, []);

  const hoveredUsers = useMemo(() => {
    if (!hoveredEmoji) return [];
    return reactions.filter(r => r.emoji === hoveredEmoji);
  }, [hoveredEmoji, reactions]);

  if (groups.length === 0) return null;

  return (
    <>
      <View style={styles.container}>
        {groups.map((group) => {
          const badgeStyle = [
            styles.badge,
            {
              backgroundColor: group.userReacted
                ? theme.primary + '20'
                : theme.background,
              borderColor: group.userReacted
                ? theme.primary
                : theme.border,
            },
          ];

          const badgeContent = (
            <>
              <Text style={styles.emoji}>{group.emoji}</Text>
              <Text style={[
                styles.count,
                { color: group.userReacted ? theme.primary : theme.textSecondary },
              ]}>
                {group.count}
              </Text>
            </>
          );

          if (isDesktopApp) {
            return (
              <View
                key={group.emoji}
                {...{
                  onMouseEnter: () => handleMouseEnter(group.emoji),
                  onMouseLeave: handleMouseLeave,
                } as any}
              >
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => onReactionPress(group.emoji)}
                  style={badgeStyle}
                >
                  {badgeContent}
                </TouchableOpacity>
                {hoveredEmoji === group.emoji && hoveredUsers.length > 0 && (
                  <View style={[
                    styles.tooltip,
                    {
                      backgroundColor: theme.card,
                      borderColor: theme.border,
                    },
                  ]}>
                    {hoveredUsers.map((r) => {
                      const user = r.user;
                      const displayName = user?.name || `Пользователь #${r.user_id}`;
                      const displayInitial = user?.name?.charAt(0).toUpperCase() || '?';

                      return (
                        <View key={r.id} style={styles.tooltipRow}>
                          {user?.avatar || user?.avatar_thumbnail ? (
                            <Image
                              source={{ uri: user.avatar_thumbnail || user.avatar }}
                              style={styles.tooltipAvatar}
                            />
                          ) : (
                            <View style={[
                              styles.tooltipAvatarPlaceholder,
                              { backgroundColor: theme.primary + '30' },
                            ]}>
                              <Text style={[styles.tooltipAvatarText, { color: theme.primary }]}>
                                {displayInitial}
                              </Text>
                            </View>
                          )}
                          <Text
                            style={[styles.tooltipText, { color: theme.text }]}
                            numberOfLines={1}
                          >
                            {displayName}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            );
          }

          return (
            <TouchableOpacity
              key={group.emoji}
              activeOpacity={0.7}
              onPress={() => onReactionPress(group.emoji)}
              onLongPress={(event) => handleLongPress(group.emoji, event)}
              style={badgeStyle}
            >
              {badgeContent}
            </TouchableOpacity>
          );
        })}
      </View>

      {!isDesktopApp && (
        <ReactionUsersModal
          visible={modalVisible}
          emoji={selectedEmoji}
          reactions={reactions}
          onClose={handleCloseModal}
          clickPosition={clickPosition}
        />
      )}
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
  tooltip: {
    position: 'absolute',
    bottom: '100%',
    left: 0,
    marginBottom: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 120,
    maxWidth: 220,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 1000,
  },
  tooltipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
  },
  tooltipAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 6,
  },
  tooltipAvatarPlaceholder: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tooltipAvatarText: {
    fontSize: 10,
    fontWeight: '600',
  },
  tooltipText: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
});

export const MessageReactions = React.memo(MessageReactionsComponent);
