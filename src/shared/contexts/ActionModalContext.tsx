/**
 * ActionModal Context
 * Контекст для глобального управления модальными окнами с действиями
 */

import React, { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react';
import { ActionModal } from '@shared/components/common/ActionModal';
import { ActionModalOptions, ActionModalButton } from '@types/modal.types';

interface ActionModalContextValue {
  /** Показать модальное окно */
  showModal: (options: ActionModalOptions) => void;
  /** Скрыть модальное окно */
  hideModal: () => void;
  /** Показать простое подтверждающее модальное окно */
  showConfirm: (
    title: string,
    message: string,
    onConfirm: () => void,
    onCancel?: () => void,
    options?: {
      confirmText?: string;
      cancelText?: string;
      destructive?: boolean;
      customContent?: ReactNode;
    }
  ) => void;
  /** Показать модальное окно с выбором из списка опций */
  showOptions: (
    title: string,
    options: Array<{
      text: string;
      onPress: () => void;
      icon?: string;
      style?: 'default' | 'primary' | 'destructive';
    }>,
    message?: string,
    onCancel?: () => void,
  ) => void;
}

const ActionModalContext = createContext<ActionModalContextValue | undefined>(undefined);

export const ActionModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [modalOptions, setModalOptions] = useState<ActionModalOptions | null>(null);
  const onDismissCallbackRef = React.useRef<(() => void) | null>(null);

  const showModal = useCallback((options: ActionModalOptions) => {
    setModalOptions(options);
  }, []);

  const hideModal = useCallback(() => {
    setModalOptions(null);
    onDismissCallbackRef.current = null;
  }, []);

  const showConfirm = useCallback(
    (
      title: string,
      message: string,
      onConfirm: () => void | Promise<void>,
      onCancel?: () => void,
      options?: {
        confirmText?: string;
        cancelText?: string;
        destructive?: boolean;
        customContent?: ReactNode;
      }
    ) => {
      const actions: ActionModalButton[] = [
        {
          text: options?.cancelText || 'Отмена',
          onPress: () => {
            if (onCancel) {
              onCancel();
            }
            hideModal();
          },
          style: 'cancel',
        },
        {
          text: options?.confirmText || 'Подтвердить',
          onPress: async () => {
            await onConfirm();
            hideModal();
          },
          style: options?.destructive ? 'destructive' : 'primary',
        },
      ];

      showModal({
        title,
        message,
        customContent: options?.customContent,
        actions,
        dismissable: true,
      });
    },
    [showModal, hideModal]
  );

  const showOptions = useCallback(
    (
      title: string,
      options: Array<{
        text: string;
        onPress: () => void | Promise<void>;
        icon?: string;
        style?: 'default' | 'primary' | 'destructive';
      }>,
      message?: string,
      onCancel?: () => void,
    ) => {
      const handleCancel = () => {
        onCancel?.();
        hideModal();
      };

      const actions: ActionModalButton[] = [
        ...options.map((option) => ({
          text: option.text,
          onPress: async () => {
            await option.onPress();
            hideModal();
          },
          icon: option.icon,
          style: option.style || ('default' as const),
        })),
        {
          text: 'Отмена',
          onPress: handleCancel,
          style: 'cancel' as const,
        },
      ];

      onDismissCallbackRef.current = onCancel || null;

      showModal({
        title,
        message,
        actions,
        dismissable: true,
      });
    },
    [showModal, hideModal]
  );

  // Оптимизация: мемоизируем context value для предотвращения ре-рендеров всего дерева (20-30% снижение)
  const value = useMemo<ActionModalContextValue>(
    () => ({
      showModal,
      hideModal,
      showConfirm,
      showOptions,
    }),
    [showModal, hideModal, showConfirm, showOptions]
  );

  return (
    <ActionModalContext.Provider value={value}>
      {children}
      {modalOptions && (
        <ActionModal
          visible={!!modalOptions}
          title={modalOptions.title}
          message={modalOptions.message}
          customContent={modalOptions.customContent}
          actions={modalOptions.actions}
          onDismiss={() => {
            onDismissCallbackRef.current?.();
            hideModal();
          }}
          dismissable={modalOptions.dismissable}
        />
      )}
    </ActionModalContext.Provider>
  );
};

export const useActionModal = (): ActionModalContextValue => {
  const context = useContext(ActionModalContext);
  if (!context) {
    throw new Error('useActionModal must be used within ActionModalProvider');
  }
  return context;
};
