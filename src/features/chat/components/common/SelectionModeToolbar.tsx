import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { ActionModal } from '@shared/components/common/ActionModal';

interface SelectionModeToolbarProps {
  selectedCount: number;
  onCancel: () => void;
  onDelete: (deleteFor: 'everyone' | 'me') => void;
  onForward: () => void;
  canDeleteForEveryone: boolean; // Может ли пользователь удалить выбранные сообщения для всех
}

/**
 * Панель инструментов для режима множественного выбора сообщений
 */
export const SelectionModeToolbar: React.FC<SelectionModeToolbarProps> = ({
  selectedCount,
  onCancel,
  onDelete,
  onForward,
  canDeleteForEveryone,
}) => {
  const { theme } = useTheme();
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleDeletePress = () => {
    if (selectedCount === 0) return;
    setShowDeleteModal(true);
  };

  const handleForwardPress = () => {
    if (selectedCount === 0) return;
    onForward();
  };

  const getMessageText = () => {
    if (selectedCount === 1) return '1 сообщение';
    if (selectedCount < 5) return `${selectedCount} сообщения`;
    return `${selectedCount} сообщений`;
  };

  return (
    <>
      <View style={[styles.container, { backgroundColor: theme.backgroundSecondary, borderTopColor: theme.border }]}>
        {/* Кнопка отмены */}
        <TouchableOpacity onPress={onCancel} style={styles.button} activeOpacity={0.7}>
          <Ionicons name="close" size={24} color={theme.text} />
        </TouchableOpacity>

        {/* Кнопка пересылки */}
        <TouchableOpacity
          onPress={handleForwardPress}
          style={styles.button}
          activeOpacity={0.7}
          disabled={selectedCount === 0}
        >
          <Ionicons name="arrow-redo-outline" size={24} color={selectedCount === 0 ? theme.textSecondary : theme.primary} />
        </TouchableOpacity>

        {/* Информация о выбранных сообщениях */}
        <View style={styles.info}>
          <Text style={[styles.infoText, { color: theme.text }]}>
            {selectedCount === 0 ? 'Выберите сообщения' : `Выбрано: ${selectedCount}`}
          </Text>
        </View>

        {/* Кнопка удаления */}
        <TouchableOpacity
          onPress={handleDeletePress}
          style={styles.button}
          activeOpacity={0.7}
          disabled={selectedCount === 0}
        >
          <Ionicons name="trash-outline" size={24} color={selectedCount === 0 ? theme.textSecondary : '#E94444'} />
        </TouchableOpacity>
      </View>

      {/* Модальное окно удаления */}
      <ActionModal
        visible={showDeleteModal}
        title="Удалить сообщения"
        message={`Вы уверены, что хотите удалить ${getMessageText()}?`}
        onDismiss={() => setShowDeleteModal(false)}
        actions={[
          // "Удалить для всех" - только если есть права
          ...(canDeleteForEveryone ? [{
            text: 'Удалить для всех',
            icon: 'trash-outline' as const,
            style: 'destructive' as const,
            onPress: async () => {
              setShowDeleteModal(false);
              onDelete('everyone');
            },
          }] : []),
          // "Удалить для меня" - всегда доступно
          {
            text: 'Удалить для меня',
            icon: 'trash-outline' as const,
            style: 'default' as const,
            onPress: async () => {
              setShowDeleteModal(false);
              onDelete('me');
            },
          },
          // Отмена
          {
            text: 'Отмена',
            style: 'cancel' as const,
            onPress: async () => {
              setShowDeleteModal(false);
            },
          },
        ]}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  buttonText: {
    fontSize: 16,
    marginLeft: 4,
    fontWeight: '500',
  },
  info: {
    flex: 1,
    alignItems: 'center',
  },
  infoText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
