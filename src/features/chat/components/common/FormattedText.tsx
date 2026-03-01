import React, { useMemo } from 'react';
import { Text, View, StyleSheet, StyleProp, TextStyle, Linking, Platform } from 'react-native';
import { useTheme } from '@shared/hooks/useTheme';
import { useNotification } from '@shared/contexts/NotificationContext';
import {
  parseFormatting,
  preProcessEscapes,
  postProcessEscapes,
  FormattingNode,
  FormatType,
} from '../../utils/formatting';
import { SpoilerText } from './SpoilerText';

// ─── Types ──────────────────────────────────────────────────────────────────

interface FormattedTextProps {
  text: string;
  style?: StyleProp<TextStyle>;
  searchQuery?: string;
  numberOfLines?: number;
}

type LinkType = 'url' | 'email' | 'phone' | 'text';

interface TextPart {
  text: string;
  type: LinkType;
  isSearchMatch?: boolean;
}

// ─── Regexes ────────────────────────────────────────────────────────────────

const urlRegex = /(https?:\/\/[^\s]+)/gi;
const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi;
const phoneRegex = /(\+?\d{1,3}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9})/g;

// ─── Link detection (extracted from LinkifiedText) ──────────────────────────

function parseLinkSegments(inputText: string): TextPart[] {
  const allMatches: { index: number; text: string; type: LinkType }[] = [];

  let match;

  // URL
  urlRegex.lastIndex = 0;
  while ((match = urlRegex.exec(inputText)) !== null) {
    allMatches.push({ index: match.index, text: match[0], type: 'url' });
  }

  // Email (skip if inside URL)
  emailRegex.lastIndex = 0;
  while ((match = emailRegex.exec(inputText)) !== null) {
    const isPartOfUrl = allMatches.some(
      m => m.type === 'url' && m.index <= match!.index && match!.index < m.index + m.text.length
    );
    if (!isPartOfUrl) {
      allMatches.push({ index: match.index, text: match[0], type: 'email' });
    }
  }

  // Phone (минимум 7 цифр)
  phoneRegex.lastIndex = 0;
  while ((match = phoneRegex.exec(inputText)) !== null) {
    const digitCount = match[0].replace(/\D/g, '').length;
    if (digitCount >= 7) {
      allMatches.push({ index: match.index, text: match[0], type: 'phone' });
    }
  }

  allMatches.sort((a, b) => a.index - b.index);

  const parts: TextPart[] = [];
  let lastIndex = 0;

  for (const m of allMatches) {
    if (m.index < lastIndex) continue; // skip overlapping
    if (m.index > lastIndex) {
      parts.push({ text: inputText.substring(lastIndex, m.index), type: 'text' });
    }
    parts.push({ text: m.text, type: m.type });
    lastIndex = m.index + m.text.length;
  }

  if (lastIndex < inputText.length) {
    parts.push({ text: inputText.substring(lastIndex), type: 'text' });
  }

  return parts.length > 0 ? parts : [{ text: inputText, type: 'text' }];
}

// ─── Search highlighting ────────────────────────────────────────────────────

function applySearchHighlight(parts: TextPart[], query: string): TextPart[] {
  if (!query || query.trim().length === 0) return parts;

  const result: TextPart[] = [];
  const lowerQuery = query.toLowerCase();

  for (const part of parts) {
    const lowerText = part.text.toLowerCase();
    let lastIdx = 0;
    let searchIdx = lowerText.indexOf(lowerQuery, lastIdx);

    if (searchIdx === -1) {
      result.push(part);
      continue;
    }

    while (searchIdx !== -1) {
      if (searchIdx > lastIdx) {
        result.push({ text: part.text.substring(lastIdx, searchIdx), type: part.type, isSearchMatch: false });
      }
      result.push({ text: part.text.substring(searchIdx, searchIdx + query.length), type: part.type, isSearchMatch: true });
      lastIdx = searchIdx + query.length;
      searchIdx = lowerText.indexOf(lowerQuery, lastIdx);
    }

    if (lastIdx < part.text.length) {
      result.push({ text: part.text.substring(lastIdx), type: part.type, isSearchMatch: false });
    }
  }

  return result;
}

// ─── Format styles ──────────────────────────────────────────────────────────

function getFormatStyle(formatType: FormatType, isDark: boolean): TextStyle {
  switch (formatType) {
    case 'bold':
      return { fontWeight: 'bold' };
    case 'italic':
      return { fontStyle: 'italic' };
    case 'strikethrough':
      return { textDecorationLine: 'line-through' };
    case 'code':
      return {
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        fontSize: 14,
      };
    default:
      return {};
  }
}

// ─── Component ──────────────────────────────────────────────────────────────

export const FormattedText: React.FC<FormattedTextProps> = ({ text, style, searchQuery, numberOfLines }) => {
  const { theme, isDark } = useTheme();
  const { showError } = useNotification();

  // Парсим дерево форматирования (мемоизировано)
  const tree = useMemo(() => {
    const escaped = preProcessEscapes(text);
    return parseFormatting(escaped);
  }, [text]);

  const handleLinkPress = async (linkText: string, type: LinkType) => {
    try {
      let url = linkText;
      if (type === 'email') url = `mailto:${linkText}`;
      else if (type === 'phone') url = `tel:${linkText.replace(/[^\d+]/g, '')}`;

      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        showError('Невозможно открыть эту ссылку');
      }
    } catch {
      showError('Не удалось открыть ссылку');
    }
  };

  const searchHighlightStyle: TextStyle = {
    backgroundColor: '#FFEB3B',
    color: '#000',
    borderRadius: 2,
  };

  // Рендерим leaf-текст (с link detection + search highlight + escape postprocess)
  const renderLeafText = (rawText: string, inheritedStyle: StyleProp<TextStyle>, keyPrefix: string): React.ReactNode => {
    const cleanText = postProcessEscapes(rawText);
    const linkParts = parseLinkSegments(cleanText);
    const highlighted = applySearchHighlight(linkParts, searchQuery || '');

    return highlighted.map((part, i) => {
      const linkStyle = part.type !== 'text'
        ? { color: theme.linkColor || '#4A9EFF', textDecorationLine: 'underline' as const }
        : {};
      const hlStyle = part.isSearchMatch ? searchHighlightStyle : {};

      if (part.type !== 'text') {
        return (
          <Text
            key={`${keyPrefix}-${i}`}
            style={[inheritedStyle, linkStyle, hlStyle]}
            onPress={() => handleLinkPress(part.text, part.type)}
          >
            {part.text}
          </Text>
        );
      }

      if (part.isSearchMatch) {
        return (
          <Text key={`${keyPrefix}-${i}`} style={[inheritedStyle, hlStyle]}>
            {part.text}
          </Text>
        );
      }

      return <Text key={`${keyPrefix}-${i}`}>{part.text}</Text>;
    });
  };

  // Рекурсивный рендер дерева
  const renderNode = (node: FormattingNode, keyPrefix: string): React.ReactNode => {
    if (node.type === 'text') {
      return renderLeafText(node.text, undefined, keyPrefix);
    }

    // Formatted node
    const formatStyle = getFormatStyle(node.formatType, isDark);

    // Спойлер — отдельный компонент
    if (node.formatType === 'spoiler') {
      return (
        <SpoilerText key={keyPrefix} style={formatStyle}>
          {node.children.map((child, i) => renderNode(child, `${keyPrefix}-${i}`))}
        </SpoilerText>
      );
    }

    // Код/цитата — View-обёртка с кавычками, скруглением и падингом
    if (node.formatType === 'code') {
      const codeBg = isDark
        ? `${theme.primary}18`
        : `${theme.primary}12`;
      const quoteColor = isDark
        ? `${theme.primary}88`
        : `${theme.primary}99`;
      const borderColor = isDark
        ? `${theme.primary}30`
        : `${theme.primary}25`;
      return (
        <View
          key={keyPrefix}
          style={{
            backgroundColor: codeBg,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: borderColor,
            paddingHorizontal: 10,
            paddingVertical: 6,
            marginHorizontal: 2,
            marginVertical: 4,
            ...(Platform.OS === 'web'
              ? { display: 'inline-flex' as any, verticalAlign: 'baseline' as any }
              : {}),
          }}
        >
          <Text style={{ color: quoteColor, fontSize: 18, lineHeight: 18, fontFamily: 'Georgia', marginBottom: 2 }}>
            {'\u201C'}
          </Text>
          <Text style={[formatStyle, { color: theme.text }]}>
            {node.children.map((child, i) => renderNode(child, `${keyPrefix}-${i}`))}
          </Text>
          <Text style={{ color: quoteColor, fontSize: 18, lineHeight: 18, fontFamily: 'Georgia', textAlign: 'right', marginTop: 2 }}>
            {'\u201D'}
          </Text>
        </View>
      );
    }

    return (
      <Text key={keyPrefix} style={formatStyle}>
        {node.children.map((child, i) => renderNode(child, `${keyPrefix}-${i}`))}
      </Text>
    );
  };

  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {tree.map((node, i) => renderNode(node, `f-${i}`))}
    </Text>
  );
};
