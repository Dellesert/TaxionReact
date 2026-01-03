import React from 'react';
import { Text, StyleProp, TextStyle, Linking } from 'react-native';
import { useTheme } from '@shared/hooks/useTheme';
import { useNotification } from '@shared/contexts/NotificationContext';

interface LinkifiedTextProps {
  text: string;
  style?: StyleProp<TextStyle>;
  searchQuery?: string;
}

type LinkType = 'url' | 'email' | 'phone' | 'text';

interface TextPart {
  text: string;
  type: LinkType;
  isSearchMatch?: boolean;
}

/**
 * Компонент для отображения текста с кликабельными ссылками
 * Поддерживает URL-адреса (http, https), email и телефонные номера
 */
export const LinkifiedText: React.FC<LinkifiedTextProps> = ({ text, style, searchQuery }) => {
  const { theme } = useTheme();
  const { showError } = useNotification();

  // Регулярные выражения для различных типов ссылок
  const urlRegex = /(https?:\/\/[^\s]+)/gi;
  const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi;
  const phoneRegex = /(\+?\d{1,3}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9})/g;

  // Функция для разбиения текста по поисковому запросу
  const applySearchHighlight = (parts: TextPart[], query: string): TextPart[] => {
    if (!query || query.trim().length === 0) {
      return parts;
    }

    const result: TextPart[] = [];
    const lowerQuery = query.toLowerCase();

    for (const part of parts) {
      const lowerText = part.text.toLowerCase();
      let lastIdx = 0;
      let searchIdx = lowerText.indexOf(lowerQuery, lastIdx);

      if (searchIdx === -1) {
        // Нет совпадений в этой части
        result.push(part);
        continue;
      }

      // Разбиваем часть на подчасти с выделением
      while (searchIdx !== -1) {
        // Текст до совпадения
        if (searchIdx > lastIdx) {
          result.push({
            text: part.text.substring(lastIdx, searchIdx),
            type: part.type,
            isSearchMatch: false,
          });
        }

        // Само совпадение (сохраняем оригинальный регистр)
        result.push({
          text: part.text.substring(searchIdx, searchIdx + query.length),
          type: part.type,
          isSearchMatch: true,
        });

        lastIdx = searchIdx + query.length;
        searchIdx = lowerText.indexOf(lowerQuery, lastIdx);
      }

      // Оставшийся текст после последнего совпадения
      if (lastIdx < part.text.length) {
        result.push({
          text: part.text.substring(lastIdx),
          type: part.type,
          isSearchMatch: false,
        });
      }
    }

    return result;
  };

  const parseText = (inputText: string): TextPart[] => {
    const parts: TextPart[] = [];

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

    const baseParts = parts.length > 0 ? parts : [{ text: inputText, type: 'text' as LinkType }];

    // Применяем подсветку поиска
    return applySearchHighlight(baseParts, searchQuery || '');
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

  // Стиль для подсветки найденного текста
  const searchHighlightStyle = {
    backgroundColor: '#FFEB3B',
    color: '#000',
    borderRadius: 2,
  };

  return (
    <Text style={style}>
      {parts.map((part, index) => {
        // Базовый стиль для ссылок
        const linkStyle = part.type !== 'text' ? {
          color: theme.linkColor || '#4A9EFF',
          textDecorationLine: 'underline' as const,
        } : {};

        // Добавляем подсветку поиска если нужно
        const highlightStyle = part.isSearchMatch ? searchHighlightStyle : {};

        if (part.type !== 'text') {
          return (
            <Text
              key={index}
              style={[linkStyle, highlightStyle]}
              onPress={() => handleLinkPress(part.text, part.type)}
            >
              {part.text}
            </Text>
          );
        }

        // Для обычного текста проверяем нужна ли подсветка
        if (part.isSearchMatch) {
          return (
            <Text key={index} style={highlightStyle}>
              {part.text}
            </Text>
          );
        }

        return <Text key={index}>{part.text}</Text>;
      })}
    </Text>
  );
};
