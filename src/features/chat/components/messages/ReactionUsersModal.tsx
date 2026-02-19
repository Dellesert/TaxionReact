import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
  Platform,
  Dimensions,
} from 'react-native';
import { useTheme } from '@shared/hooks/useTheme';
import { useAnimationType } from '@shared/hooks/useAnimationType';
import { Reaction } from '../../types/chat.types';

interface ReactionUsersModalProps {
  visible: boolean;
  emoji: string;
  reactions: Reaction[];
  onClose: () => void;
  clickPosition?: { x: number; y: number } | null;
}

const ReactionUsersModalComponent: React.FC<ReactionUsersModalProps> = ({
  visible,
  emoji,
  reactions,
  onClose,
  clickPosition,
}) => {
  const { theme } = useTheme();
  const animationType = useAnimationType('fade');

  // Фильтруем реакции только для выбранного эмодзи
  const usersWithReaction = reactions.filter((r) => r.emoji === emoji);

  // Проверяем, desktop ли это (web или electron)
  const isDesktop = Platform.OS === 'web' || Platform.OS === 'windows' || Platform.OS === 'macos';

  // Рассчитываем позицию модального окна
  const getModalPosition = () => {
    if (!isDesktop || !clickPosition) {
      // Центрируем на мобильных или если нет координат клика
      return {};
    }

    const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
    const modalWidth = 400; // Из styles.modalContent maxWidth
    const modalHeight = 400; // Примерная высота модального окна
    const offset = 10; // Небольшой отступ от курсора

    // Рассчитываем позицию с учетом границ экрана
    let top = clickPosition.y + offset;
    let left = clickPosition.x + offset;

    // Проверяем, не выходит ли окно за правую границу
    if (left + modalWidth > screenWidth - 20) {
      left = screenWidth - modalWidth - 20;
    }

    // Проверяем, не выходит ли окно за нижнюю границу
    if (top + modalHeight > screenHeight - 20) {
      top = screenHeight - modalHeight - 20;
    }

    // Не даем окну выйти за верхнюю и левую границы
    top = Math.max(20, top);
    left = Math.max(20, left);

    return {
      position: 'absolute' as const,
      top,
      left,
    };
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType={animationType}
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          style={[
            styles.modalContent,
            { backgroundColor: theme.card },
            getModalPosition(),
          ]}
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Заголовок */}
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <Text style={styles.emojiTitle}>{emoji}</Text>
            <Text style={[styles.title, { color: theme.text }]}>
              Реакции ({usersWithReaction.length})
            </Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={[styles.closeText, { color: theme.textSecondary }]}>
                ✕
              </Text>
            </TouchableOpacity>
          </View>

          {/* Список пользователей */}
          <ScrollView style={styles.scrollView}>
            {usersWithReaction.map((reaction) => {
              const user = reaction.user;

              // Если нет данных пользователя, показываем хотя бы ID
              const displayName = user?.name || `Пользователь #${reaction.user_id}`;
              const displayInitial = user?.name?.charAt(0).toUpperCase() || '?';

              return (
                <View
                  key={reaction.id}
                  style={[
                    styles.userItem,
                    {
                      borderBottomColor: theme.border,
                    },
                  ]}
                >
                  {/* Аватарка */}
                  <View style={styles.avatarContainer}>
                    {user?.avatar || user?.avatar_thumbnail ? (
                      <Image
                        source={{ uri: user.avatar_thumbnail || user.avatar }}
                        style={styles.avatar}
                      />
                    ) : (
                      <View
                        style={[
                          styles.avatarPlaceholder,
                          { backgroundColor: theme.primary + '30' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.avatarPlaceholderText,
                            { color: theme.primary },
                          ]}
                        >
                          {displayInitial}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Имя пользователя */}
                  <View style={styles.userInfo}>
                    <Text style={[styles.userName, { color: theme.text }]}>
                      {displayName}
                    </Text>
                    {user?.position && (
                      <Text
                        style={[styles.userPosition, { color: theme.textSecondary }]}
                      >
                        {user.position}
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '70%',
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  emojiTitle: {
    fontSize: 24,
    marginRight: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  closeText: {
    fontSize: 24,
    fontWeight: '300',
  },
  scrollView: {
    maxHeight: 400,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPlaceholderText: {
    fontSize: 18,
    fontWeight: '600',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  userPosition: {
    fontSize: 13,
  },
});

export const ReactionUsersModal = React.memo(ReactionUsersModalComponent);
