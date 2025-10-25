import { useEffect, useState } from 'react';
import { User } from '../types/user.types';
import { Message } from '../types/chat.types';
import { getUser } from '@api/user.api';

/**
 * Хук для загрузки данных отправителя сообщения и отправителя цитируемого сообщения
 */
export const useMessageData = (message: Message) => {
  const [sender, setSender] = useState<User | null>(null);
  const [replySender, setReplySender] = useState<User | null>(null);

  // Fetch sender
  useEffect(() => {
    if (message.sender) {
      setSender(message.sender);
    } else if (message.sender_id) {
      getUser(message.sender_id)
        .then((user) => {
          setSender(user);
        })
        .catch((error) => {
          // Silent error handling
        });
    }
  }, [message.id, message.sender, message.sender_id]);

  // Fetch reply sender
  useEffect(() => {
    if (message.reply_to && message.reply_to.sender_id) {
      if (message.reply_to.sender) {
        setReplySender(message.reply_to.sender);
      } else {
        getUser(message.reply_to.sender_id)
          .then((user) => {
            setReplySender(user);
          })
          .catch((error) => {
            // Silent error handling
          });
      }
    }
  }, [message.reply_to?.id, message.reply_to?.sender_id, message.reply_to?.sender]);

  return { sender, setSender, replySender };
};
