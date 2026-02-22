import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@shared/hooks/useTheme';
import { Message, SystemMessageData } from '../../types/chat.types';

interface SystemMessageBannerProps {
  message: Message;
}

/**
 * Получить текст системного сообщения на русском языке.
 */
function getSystemMessageText(data: SystemMessageData): string {
  switch (data.action) {
    case 'member_added':
      return `${data.actor_name} добавил(а) ${data.target_name || 'участника'}`;
    case 'member_removed':
      return `${data.actor_name} удалил(а) ${data.target_name || 'участника'}`;
    case 'member_left':
      return `${data.actor_name} покинул(а) чат`;
    case 'member_joined':
      return `${data.actor_name} присоединился(-лась) к чату`;
    case 'chat_created':
      return `${data.actor_name} создал(а) группу`;
    case 'chat_name_changed':
      return `${data.actor_name} изменил(а) название на «${data.extra?.new_name || ''}»`;
    case 'chat_description_changed':
      return `${data.actor_name} изменил(а) описание группы`;
    case 'chat_avatar_changed':
      return `${data.actor_name} изменил(а) фото группы`;
    case 'message_pinned':
      return `${data.actor_name} закрепил(а) сообщение`;
    case 'message_unpinned':
      return `${data.actor_name} открепил(а) сообщение`;
    case 'member_role_changed': {
      const roleName = data.extra?.new_role === 'admin' ? 'администратором' : 'участником';
      return `${data.actor_name} назначил(а) ${data.target_name || 'участника'} ${roleName}`;
    }
    default:
      return 'Системное событие';
  }
}

/**
 * Получить краткий текст для превью в списке чатов.
 */
export function getSystemMessagePreview(message: Message): string {
  if (!message.system_data) return 'Системное событие';
  try {
    const data: SystemMessageData = JSON.parse(message.system_data);
    return getSystemMessageText(data);
  } catch {
    return 'Системное событие';
  }
}

const SystemMessageBannerComponent: React.FC<SystemMessageBannerProps> = ({ message }) => {
  const { theme } = useTheme();

  const text = useMemo(() => {
    if (!message.system_data) return message.content || 'Системное событие';
    try {
      const data: SystemMessageData = JSON.parse(message.system_data);
      return getSystemMessageText(data);
    } catch {
      return message.content || 'Системное событие';
    }
  }, [message.system_data, message.content]);

  return (
    <View style={styles.container}>
      <View style={[styles.banner, { backgroundColor: theme.backgroundTertiary }]}>
        <Text style={[styles.text, { color: theme.textTertiary }]}>
          {text}
        </Text>
      </View>
    </View>
  );
};

export const SystemMessageBanner = React.memo(SystemMessageBannerComponent, (prev, next) => {
  return prev.message.id === next.message.id && prev.message.system_data === next.message.system_data;
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 4,
    paddingHorizontal: 16,
  },
  banner: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    maxWidth: '80%',
  },
  text: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
});
