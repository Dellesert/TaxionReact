# ActionModal - Примеры использования

Кастомное модальное окно с выбором действий для замены стандартных `Alert.alert()`.

## Импорт

```typescript
import { useActionModal } from '@contexts/ActionModalContext';
```

## Использование

### 1. Простое подтверждающее окно (замена Alert.alert с двумя кнопками)

```typescript
const { showConfirm } = useActionModal();

// Обычное подтверждение
showConfirm(
  'Удалить задачу?',
  'Вы уверены, что хотите удалить эту задачу? Это действие нельзя отменить.',
  () => {
    // Действие при подтверждении
    console.log('Задача удалена');
  },
  () => {
    // Действие при отмене (опционально)
    console.log('Отменено');
  }
);

// Подтверждение с деструктивным действием
showConfirm(
  'Удалить сообщение?',
  'Это действие нельзя отменить.',
  () => handleDelete(),
  undefined,
  {
    confirmText: 'Удалить',
    cancelText: 'Отмена',
    destructive: true, // Красная кнопка подтверждения
  }
);
```

### 2. Модальное окно с несколькими опциями

```typescript
const { showOptions } = useActionModal();

showOptions(
  'Действия с сообщением',
  [
    {
      text: 'Редактировать',
      icon: 'create-outline',
      style: 'default',
      onPress: () => handleEdit(),
    },
    {
      text: 'Переслать',
      icon: 'arrow-forward-outline',
      style: 'primary',
      onPress: () => handleForward(),
    },
    {
      text: 'Удалить',
      icon: 'trash-outline',
      style: 'destructive',
      onPress: () => handleDelete(),
    },
  ],
  'Выберите действие для этого сообщения'
);
```

### 3. Полностью кастомное модальное окно

```typescript
const { showModal } = useActionModal();

showModal({
  title: 'Выберите статус',
  message: 'Измените статус задачи',
  actions: [
    {
      text: 'В работе',
      icon: 'time-outline',
      onPress: () => updateStatus('in_progress'),
      style: 'default',
    },
    {
      text: 'Завершена',
      icon: 'checkmark-circle-outline',
      onPress: () => updateStatus('completed'),
      style: 'primary',
    },
    {
      text: 'Отменена',
      icon: 'close-circle-outline',
      onPress: () => updateStatus('cancelled'),
      style: 'destructive',
    },
    {
      text: 'Закрыть',
      onPress: () => {}, // Просто закрыть
      style: 'cancel',
    },
  ],
  dismissable: true, // Можно закрыть нажатием вне окна
});
```

### 4. Модальное окно без возможности закрыть (для критических действий)

```typescript
const { showModal } = useActionModal();

showModal({
  title: 'Критическая ошибка',
  message: 'Необходимо перезапустить приложение',
  actions: [
    {
      text: 'Перезапустить',
      onPress: () => RNRestart.Restart(),
      style: 'primary',
    },
  ],
  dismissable: false, // Нельзя закрыть
});
```

## Замена Alert.alert

### Было (Alert.alert):
```typescript
Alert.alert(
  'Удалить задачу?',
  'Вы уверены?',
  [
    { text: 'Отмена', style: 'cancel' },
    { text: 'Удалить', style: 'destructive', onPress: handleDelete },
  ]
);
```

### Стало (ActionModal):
```typescript
const { showConfirm } = useActionModal();

showConfirm(
  'Удалить задачу?',
  'Вы уверены?',
  handleDelete,
  undefined,
  { confirmText: 'Удалить', destructive: true }
);
```

## Стили кнопок

- `default` - Обычная кнопка (белая с рамкой)
- `primary` - Основная кнопка (синяя)
- `destructive` - Деструктивная кнопка (красная)
- `cancel` - Кнопка отмены (серая)

## Иконки

Можно использовать любые иконки из `@expo/vector-icons` (Ionicons):
- `create-outline` - Редактирование
- `trash-outline` - Удаление
- `arrow-forward-outline` - Пересылка
- `checkmark-circle-outline` - Подтверждение
- `close-circle-outline` - Отмена
- и многие другие...

## Преимущества перед Alert.alert

1. **Кастомизация** - Полный контроль над внешним видом
2. **Темы** - Автоматическая поддержка светлой/темной темы
3. **Иконки** - Можно добавлять иконки к кнопкам
4. **Множество опций** - Поддержка более 2-х кнопок
5. **Прокрутка** - Если много опций, появляется скролл
6. **Согласованность** - Единый стиль со всем приложением
