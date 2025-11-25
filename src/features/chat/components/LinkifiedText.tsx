import React from 'react';
import { Text, StyleProp, TextStyle, Linking } from 'react-native';
import { useTheme } from '@hooks/useTheme';
import { useNotification } from '@contexts/NotificationContext';

interface LinkifiedTextProps {
  text: string;
  style?: StyleProp<TextStyle>;
}

type LinkType = 'url' | 'email' | 'phone' | 'text';

interface TextPart {
  text: string;
  type: LinkType;
}

/**
 * Компонент для отображения текста с кликабельными ссылками
 * Поддерживает URL-адреса (http, https), email и телефонные номера
 */
export const LinkifiedText: React.FC<LinkifiedTextProps> = ({ text, style }) => {
  const { theme } = useTheme();
  const { showError } = useNotification();

  // Регулярные выражения для различных типов ссылок
  const urlRegex = /(https?:\/\/[^\s]+)/gi;
  const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi;
  const phoneRegex = /(\+?\d{1,3}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9})/g;

  const parseText = (inputText: string): TextPart[] => {
    const parts: TextPart[] = [];
    let remainingText = inputText;

    // Находим все совпадения для всех типов ссылок
    const allMatches: { index: number; text: string; type: LinkType }[] = [];

    // URL
    let match;
    while ((match = urlRegex.exec(inputText)) !== null) {
      allMatches.push({ index: match.index, text: match[0], type: 'url' });
    }

    // Email
    while ((match = emailRegex.exec(inputText)) !== null) {
      // Проверяем, что email не является частью URL
      const isPartOfUrl = allMatches.some(
        m => m.type === 'url' && m.index <= match!.index && match!.index < m.index + m.text.length
      );
      if (!isPartOfUrl) {
        allMatches.push({ index: match.index, text: match[0], type: 'email' });
      }
    }

    // Phone
    while ((match = phoneRegex.exec(inputText)) !== null) {
      allMatches.push({ index: match.index, text: match[0], type: 'phone' });
    }

    // Сортируем совпадения по индексу
    allMatches.sort((a, b) => a.index - b.index);

    let lastIndex = 0;
    for (const match of allMatches) {
      // Добавляем текст до совпадения
      if (match.index > lastIndex) {
        parts.push({
          text: inputText.substring(lastIndex, match.index),
          type: 'text'
        });
      }

      // Добавляем само совпадение
      parts.push({
        text: match.text,
        type: match.type
      });

      lastIndex = match.index + match.text.length;
    }

    // Добавляем оставшийся текст
    if (lastIndex < inputText.length) {
      parts.push({
        text: inputText.substring(lastIndex),
        type: 'text'
      });
    }

    return parts.length > 0 ? parts : [{ text: inputText, type: 'text' }];
  };

  const handleLinkPress = async (linkText: string, type: LinkType) => {
    try {
      let url = linkText;

      // Формируем правильный URL в зависимости от типа
      if (type === 'email') {
        url = `mailto:${linkText}`;
      } else if (type === 'phone') {
        url = `tel:${linkText.replace(/[^\d+]/g, '')}`;
      }

      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        showError('Невозможно открыть эту ссылку');
      }
    } catch (error) {
      console.error('Error opening URL:', error);
      showError('Не удалось открыть ссылку');
    }
  };

  const parts = parseText(text);

  return (
    <Text style={style}>
      {parts.map((part, index) => {
        if (part.type !== 'text') {
          return (
            <Text
              key={index}
              style={{
                color: theme.linkColor || '#4A9EFF',
                textDecorationLine: 'underline'
              }}
              onPress={() => handleLinkPress(part.text, part.type)}
            >
              {part.text}
            </Text>
          );
        }
        return <Text key={index}>{part.text}</Text>;
      })}
    </Text>
  );
};
