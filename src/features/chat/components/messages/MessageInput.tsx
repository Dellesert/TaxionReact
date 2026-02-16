import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  NativeSyntheticEvent,
  TextInputSelectionChangeEventData,
  TextStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { FileAttachmentPicker } from '../attachments/FileAttachmentPicker';
import { AutoCorrectedTextInput, AutoCorrectedTextInputRef } from '@shared/components/ui/AutoCorrectedTextInput';
import { FormattingToolbar, FormatMarker, FormatButtonType } from './FormattingToolbar';
import { stripFormatting } from '../../utils/formatting';
import { isImageFile, isVideoFile } from '../../utils/message.utils';
import {
  parseFormatting,
  preProcessEscapes,
  postProcessEscapes,
  FormattingNode,
  FormatType,
} from '../../utils/formatting';

const FORMAT_MARKERS: Record<FormatType, { open: string; close: string }> = {
  bold: { open: '*', close: '*' },
  italic: { open: '_', close: '_' },
  strikethrough: { open: '~', close: '~' },
  code: { open: '`', close: '`' },
  spoiler: { open: '||', close: '||' },
};

function getInputFormatStyle(formatType: FormatType): TextStyle {
  switch (formatType) {
    case 'bold':
      return { fontWeight: 'bold' };
    case 'italic':
      return { fontStyle: 'italic' };
    case 'strikethrough':
      return { textDecorationLine: 'line-through' };
    case 'code':
      return { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' };
    default:
      return {};
  }
}

// ─── Metadata-based formatting helpers ──────────────────────────────────────

interface FormatRange {
  start: number;
  end: number;
  type: FormatType;
}

function markerToFormatType(marker: FormatMarker): FormatType {
  if (marker.open === '*') return 'bold';
  if (marker.open === '_') return 'italic';
  if (marker.open === '~') return 'strikethrough';
  if (marker.open === '`') return 'code';
  if (marker.open === '||') return 'spoiler';
  return 'bold';
}

/** Разбирает текст с маркерами (напр. `*hello*`) в чистый текст + диапазоны */
function parseMarkedText(markedText: string): { text: string; ranges: FormatRange[] } {
  const tree = parseFormatting(preProcessEscapes(markedText));
  const ranges: FormatRange[] = [];
  let plainText = '';

  function walk(nodes: FormattingNode[]) {
    for (const node of nodes) {
      if (node.type === 'text') {
        plainText += postProcessEscapes(node.text);
      } else {
        const start = plainText.length;
        walk(node.children);
        const end = plainText.length;
        if (end > start) {
          ranges.push({ start, end, type: node.formatType });
        }
      }
    }
  }

  walk(tree);
  return { text: plainText, ranges };
}

/** Приоритет формата: чем меньше число — тем раньше парсер его обрабатывает (внешний маркер) */
const FORMAT_PRIORITY: Record<FormatType, number> = {
  code: 0,
  spoiler: 1,
  bold: 2,
  strikethrough: 3,
  italic: 4,
};

/** Собирает чистый текст + диапазоны обратно в текст с маркерами для отправки */
function buildMarkedText(text: string, ranges: FormatRange[]): string {
  if (!ranges.length) return text;

  const events: { pos: number; marker: string; isClose: boolean; rangeLen: number; priority: number }[] = [];
  for (const range of ranges) {
    const markers = FORMAT_MARKERS[range.type];
    const priority = FORMAT_PRIORITY[range.type];
    events.push({ pos: range.start, marker: markers.open, isClose: false, rangeLen: range.end - range.start, priority });
    events.push({ pos: range.end, marker: markers.close, isClose: true, rangeLen: range.end - range.start, priority });
  }

  // Сортировка: по позиции, закрывающие перед открывающими, внутренние перед внешними.
  // При одинаковой длине диапазона — тайбрейкер по приоритету формата,
  // чтобы маркеры с высоким приоритетом парсера (bold) были внешними.
  events.sort((a, b) => {
    if (a.pos !== b.pos) return a.pos - b.pos;
    if (a.isClose !== b.isClose) return a.isClose ? -1 : 1;
    if (a.isClose) return a.rangeLen !== b.rangeLen ? a.rangeLen - b.rangeLen : b.priority - a.priority;
    return a.rangeLen !== b.rangeLen ? b.rangeLen - a.rangeLen : a.priority - b.priority;
  });

  // Вставляем маркеры с конца чтобы не сбивать позиции
  let result = text;
  for (let i = events.length - 1; i >= 0; i--) {
    const ev = events[i];
    result = result.substring(0, ev.pos) + ev.marker + result.substring(ev.pos);
  }

  return result;
}

// ─── Component ──────────────────────────────────────────────────────────────

interface MessageInputProps {
  onSend: (message: string, replyToId?: number) => void;
  onTyping?: (isTyping: boolean) => void;
  disabled?: boolean;
  editingMessage?: any | null;
  onCancelEdit?: () => void;
  replyingToMessage?: any | null;
  onCancelReply?: () => void;
  onFilesSelected?: (fileIds: number[]) => void;
  selectedFileIds?: number[];
  onRemoveFile?: (fileId: number) => void;
  onPendingVideoFiles?: (files: import('../../types/chat.types').PendingVideoFile[]) => void;
  pendingVideoFiles?: import('../../types/chat.types').PendingVideoFile[];
  onRemovePendingVideo?: (index: number) => void;
  inputAccessoryViewID?: string;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  onSend,
  onTyping,
  disabled = false,
  editingMessage,
  onCancelEdit,
  replyingToMessage,
  onCancelReply,
  onFilesSelected,
  selectedFileIds = [],
  onRemoveFile,
  onPendingVideoFiles,
  pendingVideoFiles = [],
  onRemovePendingVideo,
  inputAccessoryViewID,
}) => {
  const { theme } = useTheme();
  const [message, setMessage] = useState('');
  const [inputHeight, setInputHeight] = useState(42);
  const [hasSelection, setHasSelection] = useState(false);
  const [selection, setSelection] = useState<{ start: number; end: number }>({ start: 0, end: 0 });
  const selectionRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 });
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<AutoCorrectedTextInputRef>(null);

  // Форматирование хранится отдельно от текста (без маркеров в строке)
  const [formatRanges, setFormatRanges] = useState<FormatRange[]>([]);
  const formatRangesRef = useRef<FormatRange[]>([]);
  useEffect(() => { formatRangesRef.current = formatRanges; }, [formatRanges]);

  const hasFormatting = formatRanges.length > 0;

  // Overlay: разбиваем текст на сегменты по границам форматирования
  const formattedOverlay = useMemo(() => {
    if (!formatRanges.length || !message) return null;

    const points = new Set<number>();
    points.add(0);
    points.add(message.length);
    for (const range of formatRanges) {
      points.add(Math.max(0, range.start));
      points.add(Math.min(message.length, range.end));
    }
    const sorted = [...points].sort((a, b) => a - b);

    const elements: React.ReactNode[] = [];
    for (let i = 0; i < sorted.length - 1; i++) {
      const segStart = sorted[i];
      const segEnd = sorted[i + 1];
      if (segStart >= segEnd) continue;

      const segText = message.substring(segStart, segEnd);
      const activeFormats: FormatType[] = [];
      for (const range of formatRanges) {
        if (range.start <= segStart && range.end >= segEnd) {
          activeFormats.push(range.type);
        }
      }

      if (activeFormats.length === 0) {
        elements.push(<Text key={`s-${i}`}>{segText}</Text>);
      } else {
        const style: TextStyle = {};
        for (const fmt of activeFormats) {
          Object.assign(style, getInputFormatStyle(fmt));
        }
        elements.push(<Text key={`s-${i}`} style={style}>{segText}</Text>);
      }
    }

    return elements;
  }, [message, formatRanges]);

  // При установке editingMessage заполняем поле ввода и разбираем форматирование
  useEffect(() => {
    if (editingMessage) {
      const content = editingMessage.content || '';
      const { text, ranges } = parseMarkedText(content);
      setMessage(text);
      setFormatRanges(ranges);
    }
  }, [editingMessage]);

  const handleChangeText = (newText: string) => {
    // Корректируем диапазоны форматирования при изменении текста
    if (formatRanges.length > 0) {
      const oldText = message;
      let prefixLen = 0;
      const minLen = Math.min(oldText.length, newText.length);
      while (prefixLen < minLen && oldText[prefixLen] === newText[prefixLen]) {
        prefixLen++;
      }
      let suffixLen = 0;
      while (
        suffixLen < minLen - prefixLen &&
        oldText[oldText.length - 1 - suffixLen] === newText[newText.length - 1 - suffixLen]
      ) {
        suffixLen++;
      }
      const changeStart = prefixLen;
      const oldChangeEnd = oldText.length - suffixLen;
      const newChangeEnd = newText.length - suffixLen;
      const delta = newChangeEnd - oldChangeEnd;

      setFormatRanges(prev =>
        prev
          .map(range => {
            // Диапазон целиком до изменения
            if (range.end <= changeStart) return range;
            // Диапазон целиком после изменения
            if (range.start >= oldChangeEnd) {
              return { ...range, start: range.start + delta, end: range.end + delta };
            }
            // Изменение внутри диапазона (или совпадает по границам)
            if (range.start <= changeStart && range.end >= oldChangeEnd) {
              return { ...range, end: range.end + delta };
            }
            // Диапазон строго внутри изменения — удаляем
            if (range.start >= changeStart && range.end <= oldChangeEnd) {
              return null;
            }
            // Частичное перекрытие: диапазон начинается до, заканчивается в изменении
            if (range.start < changeStart) {
              return { ...range, end: changeStart };
            }
            // Частичное перекрытие: диапазон начинается в изменении, заканчивается после
            return { ...range, start: newChangeEnd, end: range.end + delta };
          })
          .filter((r): r is FormatRange => r !== null && r.start < r.end)
      );
    }

    setMessage(newText);

    // Send typing indicator
    if (onTyping) {
      onTyping(true);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        onTyping(false);
      }, 2000);
    }
  };

  const handleSend = () => {
    // Применяем iOS автокоррекцию перед отправкой
    inputRef.current?.commitAutocorrection();

    // Даём время на обновление state после автокоррекции
    setTimeout(() => {
      setMessage((currentMessage) => {
        // Allow sending if either message has content OR files/videos are selected
        if (currentMessage.trim() || selectedFileIds.length > 0 || pendingVideoFiles.length > 0) {
          // Clear typing timeout
          if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
          }

          // Stop typing indicator
          if (onTyping) {
            onTyping(false);
          }

          // Собираем текст с маркерами для отправки
          const ranges = formatRangesRef.current;
          const markedText = ranges.length > 0
            ? buildMarkedText(currentMessage, ranges).trim()
            : currentMessage.trim();

          // Если редактируем, добавим префикс с ID сообщения
          if (editingMessage) {
            onSend(`EDIT:${editingMessage.id}:${markedText}`);
            if (onCancelEdit) onCancelEdit();
          } else {
            // Отправляем сообщение с reply_to_id если отвечаем
            onSend(markedText, replyingToMessage?.id);
            if (onCancelReply) onCancelReply();
          }

          return '';
        }
        return currentMessage;
      });
      setFormatRanges([]);
    }, 10);
  };

  const handleCancelEdit = () => {
    setMessage('');
    setFormatRanges([]);
    if (onCancelEdit) onCancelEdit();
  };

  const handleCancelReply = () => {
    if (onCancelReply) onCancelReply();
  };

  // Обработчик изменения размера инпута на основе контента
  const handleContentSizeChange = (event: any) => {
    if (Platform.OS === 'web') {
      const { contentSize } = event.nativeEvent;
      const newHeight = Math.min(Math.max(42, contentSize.height), 120);
      setInputHeight(newHeight);
    }
  };

  // Отслеживаем выделение текста
  const handleSelectionChange = useCallback(
    (e: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => {
      const { start, end } = e.nativeEvent.selection;
      selectionRef.current = { start, end };
      setSelection({ start, end });
      const selected = start !== end;
      setHasSelection(prev => prev !== selected ? selected : prev);
    },
    []
  );

  // Активные форматы для текущего выделения (для подсветки кнопок тулбара)
  const activeFormats = useMemo(() => {
    const result = new Set<FormatButtonType>();
    if (!hasSelection) return result;
    const { start, end } = selection;
    for (const range of formatRanges) {
      if (range.start === start && range.end === end) {
        result.add(range.type);
      }
    }
    return result;
  }, [formatRanges, selection, hasSelection]);

  // Форматы, несовместимые с code (code не поддерживает вложенное форматирование)
  const TEXT_STYLE_TYPES: FormatType[] = ['bold', 'italic', 'strikethrough'];

  // Закрыть тулбар форматирования (снимаем выделение)
  const handleCloseFormattingToolbar = useCallback(() => {
    const pos = selectionRef.current.end;
    setSelection({ start: pos, end: pos });
    setHasSelection(false);
    inputRef.current?.blur();
  }, []);

  // Применяем форматирование к выделенному тексту (добавляем диапазон)
  const handleFormat = useCallback(
    (marker: FormatMarker) => {
      const { start, end } = selectionRef.current;
      if (start === end) return;

      const type = markerToFormatType(marker);
      setFormatRanges(prev => {
        // Если точно такой же диапазон с тем же типом уже есть — снимаем (toggle)
        const existing = prev.findIndex(
          r => r.type === type && r.start === start && r.end === end
        );
        if (existing >= 0) {
          return prev.filter((_, i) => i !== existing);
        }

        let next = prev;

        // Code несовместим с bold/italic/strikethrough — убираем их
        if (type === 'code') {
          next = next.filter(
            r => !(TEXT_STYLE_TYPES.includes(r.type) && r.start === start && r.end === end)
          );
        }
        // И наоборот: при выборе текстового стиля убираем code на том же диапазоне
        if (TEXT_STYLE_TYPES.includes(type)) {
          next = next.filter(
            r => !(r.type === 'code' && r.start === start && r.end === end)
          );
        }

        return [...next, { start, end, type }];
      });
    },
    []
  );

  // Обработчик клавиш для веба: Enter - отправка, Ctrl+Enter - новая строка, форматирование
  const handleKeyPress = (e: any) => {
    if (Platform.OS === 'web') {
      const { key, ctrlKey, metaKey, shiftKey } = e.nativeEvent;
      const mod = ctrlKey || metaKey;

      // Шорткаты форматирования
      if (mod && !shiftKey) {
        if (key === 'b' || key === 'B') {
          e.preventDefault();
          handleFormat({ open: '*', close: '*' });
          return;
        }
        if (key === 'i' || key === 'I') {
          e.preventDefault();
          handleFormat({ open: '_', close: '_' });
          return;
        }
        if (key === 'e' || key === 'E') {
          e.preventDefault();
          handleFormat({ open: '`', close: '`' });
          return;
        }
      }
      if (mod && shiftKey) {
        if (key === 'x' || key === 'X') {
          e.preventDefault();
          handleFormat({ open: '~', close: '~' });
          return;
        }
        if (key === 'p' || key === 'P') {
          e.preventDefault();
          handleFormat({ open: '||', close: '||' });
          return;
        }
      }

      if (key === 'Enter') {
        // Ctrl+Enter или Cmd+Enter - новая строка
        if (mod) {
          e.preventDefault();
          const target = e.target as HTMLTextAreaElement;
          const start = target.selectionStart || 0;
          const end = target.selectionEnd || 0;
          const newMessage = message.substring(0, start) + '\n' + message.substring(end);
          setMessage(newMessage);
          setTimeout(() => {
            target.selectionStart = target.selectionEnd = start + 1;
          }, 0);
          return;
        }
        // Enter без модификаторов - отправка сообщения
        e.preventDefault();
        handleSend();
      }
    }
  };

  const dynamicStyles = StyleSheet.create({
    container: {
      backgroundColor: 'transparent',
      borderTopColor: 'transparent',
    },
    attachButton: {
      backgroundColor: theme.backgroundTertiary,
    },
    input: {
      backgroundColor: theme.input,
      color: theme.text,
    },
    sendButton: {
      backgroundColor: theme.primary,
    },
    sendButtonDisabled: {
      backgroundColor: theme.backgroundTertiary,
    },
  });

  return (
    <View style={Platform.OS === 'web' ? styles.rootWeb : undefined}>
      {/* Индикатор редактирования */}
      {editingMessage && (
        <View style={[styles.editIndicator, { backgroundColor: theme.backgroundTertiary, borderTopColor: theme.border }]}>
          <View style={styles.editInfo}>
            <Ionicons name="create-outline" size={16} color={theme.primary} />
            <Text style={[styles.editText, { color: theme.text }]} numberOfLines={1}>
              Редактирование: {editingMessage.content}
            </Text>
          </View>
          <TouchableOpacity onPress={handleCancelEdit} style={styles.cancelButton}>
            <Ionicons name="close" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>
      )}

      {/* Индикатор ответа */}
      {replyingToMessage && !editingMessage && (
        <View style={[styles.replyIndicator, { backgroundColor: theme.backgroundTertiary, borderTopColor: theme.border, borderLeftColor: theme.primary }]}>
          <View style={styles.replyInfo}>
            <Ionicons name="return-down-forward-outline" size={16} color={theme.primary} />
            <View style={styles.replyTextContainer}>
              <Text style={[styles.replyLabel, { color: theme.primary }]}>
                Ответ на сообщение
              </Text>
              {replyingToMessage.content && replyingToMessage.content.trim().length > 0 ? (
                <Text style={[styles.replyText, { color: theme.textSecondary }]} numberOfLines={1}>
                  {stripFormatting(replyingToMessage.content)}
                </Text>
              ) : replyingToMessage.attachments && replyingToMessage.attachments.length > 0 ? (
                <View style={styles.replyMediaRow}>
                  {(() => {
                    const att = replyingToMessage.attachments[0];
                    const mt = att.mime_type || att.file_type || '';
                    const isImage = isImageFile(mt);
                    const isVideo = isVideoFile(mt);
                    const count = replyingToMessage.attachments.length;
                    const label = isVideo ? 'Видео' : isImage ? 'Фото' : att.file_name;
                    const extra = count > 1 ? ` и ещё ${count - 1}` : '';
                    return (
                      <>
                        <Ionicons
                          name={isVideo ? 'videocam' : isImage ? 'image' : 'document'}
                          size={14}
                          color={theme.textSecondary}
                          style={{ marginRight: 4 }}
                        />
                        <Text style={[styles.replyText, { color: theme.textSecondary }]} numberOfLines={1}>
                          {label}{extra}
                        </Text>
                      </>
                    );
                  })()}
                </View>
              ) : (
                <Text style={[styles.replyText, { color: theme.textSecondary }]} numberOfLines={1}>
                  Сообщение
                </Text>
              )}
            </View>
          </View>
          <TouchableOpacity onPress={handleCancelReply} style={styles.cancelButton}>
            <Ionicons name="close" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>
      )}

      {/* Selected files preview */}
      {selectedFileIds.length > 0 && (
        <View style={[styles.selectedFilesContainer, { backgroundColor: theme.backgroundTertiary, borderTopColor: theme.border }]}>
          <View style={styles.selectedFilesInfo}>
            <Ionicons name="attach" size={16} color={theme.primary} />
            <Text style={[styles.selectedFilesText, { color: theme.text }]}>
              {selectedFileIds.length} {selectedFileIds.length === 1 ? 'файл' : 'файлов'}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              selectedFileIds.forEach(fileId => {
                onRemoveFile?.(fileId);
              });
            }}
            style={styles.removeAllButton}
          >
            <Ionicons name="close-circle" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>
      )}

      {/* Pending video files preview */}
      {pendingVideoFiles.length > 0 && (
        <View style={[styles.selectedFilesContainer, { backgroundColor: theme.backgroundTertiary, borderTopColor: theme.border }]}>
          <View style={styles.selectedFilesInfo}>
            <Ionicons name={pendingVideoFiles.some(f => f.mimeType.startsWith('video/')) ? "videocam" : "image"} size={16} color={theme.primary} />
            <Text style={[styles.selectedFilesText, { color: theme.text }]} numberOfLines={1}>
              {pendingVideoFiles.map(f => f.fileName).join(', ')}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              pendingVideoFiles.forEach((_, i) => {
                onRemovePendingVideo?.(i);
              });
            }}
            style={styles.removeAllButton}
          >
            <Ionicons name="close-circle" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>
      )}

      {/* Тулбар форматирования — показываем при выделении текста, позиционируем абсолютно чтобы не смещать инпут */}
      {hasSelection && Platform.OS === 'web' && (
        <View style={styles.formattingToolbarWeb}>
          <FormattingToolbar onFormat={handleFormat} activeFormats={activeFormats} onClose={handleCloseFormattingToolbar} />
        </View>
      )}
      {hasSelection && Platform.OS !== 'web' && (
        <FormattingToolbar onFormat={handleFormat} activeFormats={activeFormats} onClose={handleCloseFormattingToolbar} />
      )}

      <View style={[styles.container, dynamicStyles.container]}>
        {onFilesSelected && !editingMessage && (
          <FileAttachmentPicker
            onFilesSelected={onFilesSelected}
            onPendingVideoFiles={onPendingVideoFiles}
            onError={(error) => console.error('File upload error:', error)}
          />
        )}
        {(!onFilesSelected || editingMessage) && (
          <TouchableOpacity style={[styles.attachButton, dynamicStyles.attachButton]} disabled={true}>
            <Ionicons name="attach" size={26} color={theme.textTertiary} />
          </TouchableOpacity>
        )}

        <View style={styles.inputWrapper}>
          <AutoCorrectedTextInput
            ref={inputRef}
            style={[
              styles.input,
              dynamicStyles.input,
              hasFormatting && { color: 'transparent' },
              Platform.OS === 'web' && { height: inputHeight }
            ]}
            placeholder="Сообщение"
            placeholderTextColor={theme.inputPlaceholder}
            value={message}
            onChangeText={handleChangeText}
            onContentSizeChange={handleContentSizeChange}
            onSelectionChange={handleSelectionChange}
            multiline
            maxLength={4000}
            editable={!disabled}
            onSubmitEditing={handleSend}
            onKeyPress={handleKeyPress}
            autoCorrect={true}
            autoCapitalize="sentences"
            keyboardType="default"
            returnKeyType="default"
            inputAccessoryViewID={inputAccessoryViewID}
            selectionColor={theme.primary}
          />
          {hasFormatting && formattedOverlay && (
            <View style={styles.inputOverlay} pointerEvents="none">
              <Text style={[styles.inputOverlayText, { color: theme.text }]}>
                {formattedOverlay}
              </Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[styles.sendButton, dynamicStyles.sendButton, (!message.trim() && selectedFileIds.length === 0 && pendingVideoFiles.length === 0) && dynamicStyles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={disabled || (!message.trim() && selectedFileIds.length === 0 && pendingVideoFiles.length === 0)}
        >
          <Ionicons
            name="send"
            size={16}
            color={(message.trim() || selectedFileIds.length > 0 || pendingVideoFiles.length > 0) ? '#FFFFFF' : theme.textTertiary}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 12,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  attachButton: {
    width: 42,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    flexShrink: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inputWrapper: {
    flex: 1,
    marginHorizontal: 8,
  },
  input: {
    minHeight: 42,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'web' ? 11 : 13,
    paddingBottom: Platform.OS === 'web' ? 11 : 12,
    fontSize: 15,
    lineHeight: 20,
    maxHeight: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      },
    }),
  },
  inputOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'web' ? 11 : 13,
    paddingBottom: Platform.OS === 'web' ? 11 : 12,
  },
  inputOverlayText: {
    fontSize: 15,
    lineHeight: 20,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  editIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  editInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  editText: {
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  cancelButton: {
    padding: 4,
  },
  replyIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderLeftWidth: 3,
  },
  replyInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    marginRight: 8,
  },
  replyTextContainer: {
    marginLeft: 8,
    flex: 1,
  },
  replyLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  replyText: {
    fontSize: 13,
  },
  replyMediaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedFilesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  selectedFilesInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectedFilesText: {
    fontSize: 14,
  },
  removeAllButton: {
    padding: 4,
  },
  rootWeb: {
    position: 'relative' as const,
    overflow: 'visible' as const,
  },
  formattingToolbarWeb: {
    position: 'absolute' as const,
    bottom: '100%',
    left: 0,
    right: 0,
    zIndex: 10,
  },
});

export default MessageInput;
