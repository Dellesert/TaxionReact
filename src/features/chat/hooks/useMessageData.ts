import { useEffect, useState } from 'react';
import { User } from '@/types/user.types';
import { Message } from '../types/chat.types';
import { useUserCache } from '@shared/store/userCache';

/**
 * Хук для загрузки данных отправителя сообщения и отправителя цитируемого сообщения
 *
 * ОПТИМИЗАЦИЯ: Использует глобальный кэш для предотвращения дублирования запросов
 * Вместо 50 запросов для 50 сообщений - используется кэш
 */
export const useMessageData = (message: Message) => {
  const [sender, setSender] = useState<User | null>(null);
  const [replySender, setReplySender] = useState<User | null>(null);

  // Получаем функции из кэша
  const fetchUser = useUserCache((state) => state.fetchUser);
  const getCachedUser = useUserCache((state) => state.getUser);

  // Fetch sender
  useEffect(() => {
    if (message.sender) {
      // Если sender уже есть в сообщении - используем его
      setSender(message.sender);
    } else if (message.sender_id) {
      // Сначала проверяем кэш
      const cached = getCachedUser(message.sender_id);
      if (cached) {
        setSender(cached);
      } else {
        // Если нет в кэше - загружаем
        fetchUser(message.sender_id)
          .then((user) => {
            setSender(user);
          })
          .catch((error) => {
            // Silent error handling - не показываем ошибку пользователю
          });
      }
    }
  }, [message.id, message.sender, message.sender_id, fetchUser, getCachedUser]);

  // Fetch reply sender
  useEffect(() => {
    if (message.reply_to && message.reply_to.sender_id) {
      if (message.reply_to.sender) {
        // Если sender уже есть в reply_to - используем его
        setReplySender(message.reply_to.sender);
      } else {
        // Сначала проверяем кэш
        const cached = getCachedUser(message.reply_to.sender_id);
        if (cached) {
          setReplySender(cached);
        } else {
          // Если нет в кэше - загружаем
          fetchUser(message.reply_to.sender_id)
            .then((user) => {
              setReplySender(user);
            })
            .catch((error) => {
              // Silent error handling
            });
        }
      }
    }
  }, [message.reply_to?.id, message.reply_to?.sender_id, message.reply_to?.sender, fetchUser, getCachedUser]);

  return { sender, setSender, replySender };
};
