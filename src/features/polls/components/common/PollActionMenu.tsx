/**
 * Poll Action Menu
 * Меню действий для опроса (редактировать, завершить, удалить)
 */

import React, { useMemo } from 'react';
import { ActionMenu, ActionMenuItem } from '@shared/components/common/ActionMenu';
import { useTheme } from '@shared/hooks/useTheme';
import type { Poll } from '../../types/poll.types';

interface PollActionMenuProps {
  visible: boolean;
  poll: Poll;
  canEdit: boolean;
  canDeleteOrClose: boolean;
  canRevote?: boolean;
  canToggleResults?: boolean;
  showResults?: boolean;
  onClose: () => void;
  onEdit: () => void;
  onClosePoll: () => void;
  onDelete: () => void;
  onRevote?: () => void;
  onToggleResults?: () => void;
  isDesktop?: boolean;
  buttonPosition?: { x: number; y: number; width: number; height: number };
}

export const PollActionMenu: React.FC<PollActionMenuProps> = ({
  visible,
  poll,
  canEdit,
  canDeleteOrClose,
  canRevote = false,
  canToggleResults = false,
  showResults = false,
  onClose,
  onEdit,
  onClosePoll,
  onDelete,
  onRevote,
  onToggleResults,
  isDesktop = false,
  buttonPosition,
}) => {
  const { theme } = useTheme();

  const menuItems = useMemo(() => {
    const items: ActionMenuItem[] = [];

    // Toggle results option (for users who can view results before voting)
    if (canToggleResults && onToggleResults) {
      items.push({
        key: 'toggle-results',
        icon: showResults ? 'eye-off-outline' : 'eye-outline',
        label: showResults ? 'Скрыть результаты' : 'Посмотреть результаты',
        color: theme.text,
        onPress: onToggleResults,
      });
    }

    // Revote option (for users who already voted)
    if (canRevote && onRevote) {
      items.push({
        key: 'revote',
        icon: 'refresh',
        label: 'Переголосовать',
        color: theme.primary,
        onPress: onRevote,
      });
    }

    // Edit option
    if (canEdit) {
      items.push({
        key: 'edit',
        icon: 'create-outline',
        label: 'Редактировать',
        color: theme.text,
        onPress: onEdit,
      });
    }

    // Close poll option (only for active polls)
    if (canDeleteOrClose && poll.status === 'active') {
      items.push({
        key: 'close',
        icon: 'lock-closed-outline',
        label: 'Завершить опрос',
        color: '#F59E0B',
        onPress: onClosePoll,
      });
    }

    // Delete option
    if (canDeleteOrClose) {
      items.push({
        key: 'delete',
        icon: 'trash-outline',
        label: 'Удалить',
        color: '#EF4444',
        onPress: onDelete,
      });
    }

    return items;
  }, [canToggleResults, canRevote, canEdit, canDeleteOrClose, poll.status, showResults, theme.text, theme.primary, onToggleResults, onRevote, onEdit, onClosePoll, onDelete]);

  if (menuItems.length === 0) {
    return null;
  }

  return (
    <ActionMenu
      visible={visible}
      items={menuItems}
      onClose={onClose}
      isDesktop={isDesktop}
      buttonPosition={buttonPosition}
    />
  );
};
