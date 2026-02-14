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
import { FormattingToolbar, FormatMarker } from './FormattingToolbar';
import {
  parseFormatting,
  preProcessEscapes,
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
  inputAccessoryViewID,
}) => {
  const { theme } = useTheme();
  const [message, setMessage] = useState('');
  const [inputHeight, setInputHeight] = useState(42); // Начальная высота инпута
  const [hasSelection, setHasSelection] = useState(false);
  const selectionRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 });
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<AutoCorrectedTextInputRef>(null);

  // Парсим форматирование для overlay
  const formattingTree = useMemo(() => {
    if (!message) return null;
    return parseFormatting(preProcessEscapes(message));
  }, [message]);

  const hasFormatting = useMemo(() => {
    if (!formattingTree) return false;
    return formattingTree.some(node => node.type === 'formatted');
  }, [formattingTree]);

  // Рендер ноды для overlay (маркеры прозрачные, текст стилизован)
  const renderOverlayNode = (node: FormattingNode, key: string): React.ReactNode => {
    if (node.type === 'text') {
      return <Text key={key}>{node.text}</Text>;
    }
    const markers = FORMAT_MARKERS[node.formatType];
    const formatStyle = getInputFormatStyle(node.formatType);
    return (
      <React.Fragment key={key}>
        <Text style={{ color: 'transparent' }}>{markers.open}</Text>
        <Text style={formatStyle}>
          {node.children.map((child, i) => renderOverlayNode(child, `${key}-${i}`))}
        </Text>
        <Text style={{ color: 'transparent' }}>{markers.close}</Text>
      </React.Fragment>
    );
  };

  // При установке editingMessage заполняем поле ввода
  useEffect(() => {
    if (editingMessage) {
      setMessage(editingMessage.content || '');
    }
  }, [editingMessage]);

  const handleChangeText = (text: string) => {
    setMessage(text);

    // Send typing indicator
    if (onTyping) {
      onTyping(true);

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Stop typing after 2 seconds of inactivity
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
        // Allow sending if either message has content OR files are selected
        if (currentMessage.trim() || selectedFileIds.length > 0) {
          // Clear typing timeout
          if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
          }

          // Stop typing indicator
          if (onTyping) {
            onTyping(false);
          }

          // Если редактируем, добавим префикс с ID сообщения
          if (editingMessage) {
            onSend(`EDIT:${editingMessage.id}:${currentMessage.trim()}`);
            if (onCancelEdit) onCancelEdit();
          } else {
            // Отправляем сообщение с reply_to_id если отвечаем
            onSend(currentMessage.trim(), replyingToMessage?.id);
            if (onCancelReply) onCancelReply();
          }

          return '';
        }
        return currentMessage;
      });
    }, 10);
  };

  const handleCancelEdit = () => {
    setMessage('');
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
      const selected = start !== end;
      setHasSelection(prev => prev !== selected ? selected : prev);
    },
    []
  );

  // Применяем форматирование к выделенному тексту или вставляем маркеры на курсор
  const handleFormat = useCallback(
    (marker: FormatMarker) => {
      const { start, end } = selectionRef.current;
      const before = message.substring(0, start);
      const selected = message.substring(start, end);
      const after = message.substring(end);

      const newMessage = before + marker.open + selected + marker.close + after;
      setMessage(newMessage);

      // Ставим курсор после вставленного текста (или между маркерами если нет выделения)
      const newCursorPos = start + marker.open.length + selected.length;
      setTimeout(() => {
        inputRef.current?.setSelection(newCursorPos, newCursorPos);
      }, 50);
    },
    [message]
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
              <Text style={[styles.replyText, { color: theme.textSecondary }]} numberOfLines={1}>
                {replyingToMessage.content}
              </Text>
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
              // Удаляем все файлы
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

      {/* Тулбар форматирования — показываем при выделении текста, позиционируем абсолютно чтобы не смещать инпут */}
      {hasSelection && Platform.OS === 'web' && (
        <View style={styles.formattingToolbarWeb}>
          <FormattingToolbar onFormat={handleFormat} />
        </View>
      )}
      {hasSelection && Platform.OS !== 'web' && (
        <FormattingToolbar onFormat={handleFormat} />
      )}

      <View style={[styles.container, dynamicStyles.container]}>
        {onFilesSelected && !editingMessage && (
          <FileAttachmentPicker
            onFilesSelected={onFilesSelected}
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
          {hasFormatting && formattingTree && (
            <View style={styles.inputOverlay} pointerEvents="none">
              <Text style={[styles.inputOverlayText, { color: theme.text }]}>
                {formattingTree.map((node, i) => renderOverlayNode(node, `o-${i}`))}
              </Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[styles.sendButton, dynamicStyles.sendButton, (!message.trim() && selectedFileIds.length === 0) && dynamicStyles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={disabled || (!message.trim() && selectedFileIds.length === 0)}
        >
          <Ionicons
            name="send"
            size={16}
            color={(message.trim() || selectedFileIds.length > 0) ? '#FFFFFF' : theme.textTertiary}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end', // Выравнивание по нижнему краю для кнопок
    paddingHorizontal: 16,
    paddingBottom: 12, // Уменьшен, т.к. safe area padding добавляется в родительском компоненте
    paddingTop: 8,
    borderTopWidth: 1,
  },
  attachButton: {
    width: 42,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    flexShrink: 0, // Не сжимать кнопку
    // Тени
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
    flexShrink: 0, // Не сжимать кнопку
    // Тени
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
