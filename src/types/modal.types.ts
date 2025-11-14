/**
 * Modal Types
 * Типы для кастомных модальных окон
 */

export interface ActionModalButton {
  /** Текст кнопки */
  text: string;
  /** Обработчик нажатия */
  onPress: () => void | Promise<void>;
  /** Стиль кнопки */
  style?: 'default' | 'primary' | 'destructive' | 'cancel';
  /** Иконка (опционально) */
  icon?: string;
}

export interface ActionModalProps {
  /** Видимость модального окна */
  visible: boolean;
  /** Заголовок */
  title: string;
  /** Сообщение (опционально) */
  message?: string;
  /** Массив кнопок действий */
  actions: ActionModalButton[];
  /** Обработчик закрытия по нажатию вне окна */
  onDismiss?: () => void;
  /** Возможность закрыть по нажатию вне окна */
  dismissable?: boolean;
}

export interface ActionModalOptions {
  /** Заголовок */
  title: string;
  /** Сообщение (опционально) */
  message?: string;
  /** Массив кнопок действий */
  actions: ActionModalButton[];
  /** Возможность закрыть по нажатию вне окна */
  dismissable?: boolean;
}
