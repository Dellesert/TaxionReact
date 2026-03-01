# Сводка разработки мессенджера «Тахион»
## Период: декабрь 2025 — март 2026

**Общая статистика:** 1114 коммитов, 755 файлов изменено, +134 679 / −21 421 строк кода

| Месяц | Коммитов | Основные направления |
|-------|----------|----------------------|
| Декабрь 2025 | 288 | Electron-приложение, push-уведомления, десктопная адаптация |
| Январь 2026 | 208 | Расписания, отсутствия, бесконечный календарь, дашборд |
| Февраль 2026 | 611 | Треды, реакции, видео, DataTable, админ-панель, мультиаккаунт, passkey |
| Март 2026 | 7 | Notification Service Extension (аватары в push) |

---

## 1. Десктопное приложение (Electron) — новое

Создано полноценное десктопное приложение с нуля:

- Кастомный TitleBar с контролами для каждого раздела (чат, календарь, задачи, опросы, расписания, отсутствия, аналитика)
- Split-view архитектура (ChatSplitView, AdminSplitView, ProfileSplitView)
- Боковая навигация (SideNavBar)
- Глобальный поиск (GlobalSearchDropdown)
- Файловое кэширование, управление масштабом, настройки трея
- Сплэш-экран, автообновление (appUpdater.service.ts)
- Скрипты сборки для Windows

---

## 2. Мессенджер — расширение функциональности

### 2.1. Треды (ветви обсуждений)
Реализован полноценный экран тредов (ThreadScreen.tsx) с пагинацией сообщений, WebSocket-подпиской на обновления в реальном времени, реакциями и адаптацией для Electron.

### 2.2. Реакции на сообщения
Система реакций на сообщения: добавление, стилизация, обновление через WebSocket, модальное окно со списком пользователей, поставивших реакцию (ReactionUsersModal).

### 2.3. Видео в чатах
Поддержка видео: загрузка, кэширование, MediaViewer с pinch-to-zoom, полноэкранный режим в Electron, оптимистичная загрузка, отмена загрузки, миниатюры различных размеров, лимит до 20 файлов.

### 2.4. Форматированный текст
Стилизация текста сообщений: форматирование (FormattedText.tsx), спойлер-текст с размытием (SpoilerText.tsx), панель инструментов форматирования.

### 2.5. Каналы
Добавлен новый тип чата — каналы, с бейджем типа группы.

### 2.6. Мьют чатов
Мьют индивидуальных чатов через свайп и контекстное меню, мьют групповых чатов из настроек уведомлений.

### 2.7. Закреплённые сообщения
Баннер закреплённых сообщений (PinnedMessageBanner.tsx), прокрутка к закреплённому сообщению.

### 2.8. Системные сообщения
Баннер системных сообщений в чате (SystemMessageBanner.tsx).

### 2.9. Пересылка сообщений
Форматирование пересланных сообщений с отображением оригинального отправителя, модальное окно пересылки (ForwardMessageModal.tsx).

### 2.10. Контекстное меню сообщений
Контекстное меню по правому клику в Electron, контекстное меню даты/времени, утилиты для работы с сообщениями.

### 2.11. Индикатор набора текста
Индикатор набора в реальном времени в списке чатов и групповых чатах, индикатор типа медиа при загрузке.

### 2.12. Оптимизация прокрутки чата
Масштабная работа над хуком useChatScroll.ts (30+ коммитов): прокрутка к непрочитанным, переход к контексту сообщения, кнопка прокрутки вниз, пагинация по 20 сообщений, переход на FlatList.

### 2.13. Избранные и закреплённые чаты
Функциональность избранных чатов, закреплённые чаты в списке.

### 2.14. Удаление сообщений
Перманентное удаление сообщений, удаление постов в чате.

---

## 3. Модуль управления расписаниями — новый

Полностью новый модуль, реализованный с нуля:

- Экран списка расписаний (ScheduleListScreen.tsx), детальный экран (ScheduleDetailScreen.tsx)
- Создание, редактирование, удаление расписаний через модальные окна
- Сетка расписаний (ScheduleGridView.tsx) — основной визуальный компонент с редактированием и сохранением
- Импорт расписаний (ImportScheduleModal.tsx, ImportPreview.tsx)
- Черновики расписаний с кнопками публикации/сохранения
- Отображение отсутствий в сетке, предупреждения при конфликтах
- Выбор смен (ScheduleShiftsView.tsx, ShiftTypeBadge.tsx)
- Шаблоны записей (TemplateEntriesList.tsx)
- Store расписаний (scheduleStore.ts), кэш (scheduleCacheStore.ts)
- Разрешения расписаний
- Десктопная адаптация со скелетонами загрузки

---

## 4. Модуль управления отсутствиями — новый

Полностью новый модуль:

- Экран списка отсутствий (AbsenceListScreen.tsx) — более 20 коммитов доработки
- Создание и редактирование отсутствий через модальные окна
- Годовой календарь отсутствий (AbsenceYearCalendar.tsx), таймлайн (AbsenceTimeline.tsx)
- Замещения: раздел (SubstitutionsSection.tsx), добавление (AddSubstitutionModal.tsx), карточка (SubstitutionCard.tsx)
- Компонент выбора диапазона месяцев (MonthRangePicker.tsx — 540+ строк)
- Ролевые разрешения (useAbsencePermissions.ts)
- Сортировка, год-пикер для фильтрации
- Интеграция замещений с дашбордом
- Десктопная адаптация со скелетонами загрузки

---

## 5. Календарь и события — значительное расширение

### 5.1. Бесконечный календарь
Бесконечная прокрутка (InfiniteMonthCalendar.tsx), навигация по месяцам (MonthNavigator.tsx, MonthNavigationStrip.tsx), недельный таймлайн (WeekTimelineView.tsx).

### 5.2. Десктопное представление
Десктопный вид (CalendarDesktopView.tsx) с панелью статистики (CalendarStatsPanel.tsx), панелью деталей событий (EventDetailsPanel.tsx), карточкой предстоящих событий (UpcomingEventsCard.tsx), тулбаром навигации.

### 5.3. Праздники
API праздников, отображение в календаре, баннер праздника (HolidayBanner.tsx).

### 5.4. Дни рождения
Отображение дней рождения в календаре.

### 5.5. Создание и просмотр событий
Экран деталей события (EventDetailScreen.tsx), создание событий (CreateEventModal.tsx — 493 строки), модальное окно сводки за день (DayEventsSheet.tsx).

---

## 6. Опросы — расширение

- Табличное представление (PollTableView.tsx), переключатель представления (PollViewSwitcher.tsx)
- Десктопный layout (PollDesktopLayout.tsx)
- Создание и редактирование через модальные окна (CreatePollModal.tsx, EditPollModal.tsx)
- Результаты опросов (PollResults.tsx), голосование (PollVotingUI.tsx)
- Фильтрация (PollFilterMenu.tsx), шаринг (SharePollModal.tsx)
- Десктопные скелетоны загрузки

---

## 7. Задачи — расширение

### 7.1. Табличное представление
Компонент таблицы задач (TaskTableView.tsx), сортировка, подзадачи в таблице, вкладка обзора (TaskOverviewTab.tsx).

### 7.2. Канбан-доска
Десктопная адаптация канбан-доски (TaskKanbanBoard.tsx, TaskKanbanColumn.tsx).

### 7.3. Групповые задачи
Добавление групповых задач, расширение типов и API.

### 7.4. Десктопный макет
Десктопный layout (TaskDesktopLayout.tsx), модальные окна создания, редактирования и делегирования задач.

### 7.5. Комментарии, подзадачи, фильтрация
Кнопки действий (TaskActionButtons.tsx), комментарии (TaskCommentsTab.tsx), подзадачи (TaskSubtasksList.tsx, TaskChecklistsView.tsx), фильтрация (AdvancedTaskFilterMenu.tsx, BoardFilterMenu.tsx).

---

## 8. Административная панель — новая

- Управление пользователями (UsersDesktopContent.tsx) — скрытие, бейдж ролей (UserRoleBadge.tsx)
- Управление группами пользователей (UserGroupsDesktopContent.tsx, EditUserGroupScreen.tsx) — drag-and-drop сортировка
- Управление отделами (DepartmentsDesktopContent.tsx, EditDepartmentScreen.tsx)
- Аналитика и метрики (AnalyticsDesktopContent.tsx, MetricsDesktopContent.tsx, MetricsAnalyticsScreen.tsx)
- Split-view архитектура (AdminSplitView.tsx), боковая навигация (AdminSidebarNavigation.tsx)
- Десктопные скелетоны загрузки

---

## 9. Аутентификация и безопасность

### 9.1. Passkey (WebAuthn)
Поддержка passkey для Android (withAndroidPasskey.js), UI-компоненты: AddPasskeyButton, PasskeyCard, PasskeyInfoCard, PasskeyNameModal. Отключение passkey на Electron.

### 9.2. QR-аутентификация
QR-аутентификация для мультиустройства.

### 9.3. Мультиаккаунт
Переключатель аккаунтов (AccountSwitcherModal.tsx), store аккаунтов (accountStore.ts), удаление аккаунта в Electron.

### 9.4. Безопасность
Удаление секретов из репозитория (.env.production, release.keystore), обновление .gitignore, обработка потери сети, тихое обновление токенов.

### 9.5. Активные сессии
Контент активных сессий (ActiveSessionsContent.tsx), пользовательское имя сессии.

### 9.6. Смена пароля
Экран смены пароля (ChangePasswordScreen.tsx).

---

## 10. Push-уведомления — кроссплатформенные

### 10.1. iOS
FCM push-уведомления, сервис pushNotificationIOS.service.ts, навигация по push, конфиг-плагины (withPushNotificationDelegates.js), Notification Service Extension для аватаров в push (withNotificationServiceExtension.js, NotificationService.swift — 493 строки).

### 10.2. Electron
Десктопный push-сервис (pushNotificationElectron.service.ts), Firebase Service Worker (firebase-messaging-sw.js), аватары в push-уведомлениях.

### 10.3. Android
Notification Service для Android (NotificationService.kt, withNotificationServiceAndroid.js).

### 10.4. In-App уведомления
Контейнер уведомлений (InAppNotificationContainer.tsx), экран уведомлений (NotificationListScreen.tsx), десктопная адаптация, контекст уведомлений (NotificationContext.tsx).

---

## 11. Share Extension (iOS)

- Кастомный контроллер шаринга (ShareViewController.swift — 1167 строк)
- Шаринг текста и фото из галереи
- Модальное окно шаринга (ShareIntentModal.tsx)

---

## 12. Универсальный компонент DataTable

Переиспользуемый компонент таблицы данных (DataTable.tsx — 328 строк + 236 строк пагинации + 131 строка сортировки):

- Скелетон загрузки (DataTableSkeleton.tsx)
- Пагинация и сортировка колонок
- Интеграция с модулями: отсутствия, расписания, задачи, опросы, пользователи, отделы, группы пользователей

---

## 13. Дашборд — новый

- Экран дашборда (DashboardScreen.tsx)
- Дневная сводка (DailySummaryView.tsx)
- Навигатор дашборда (DashboardNavigator.tsx)
- Карточка сводки (SummaryCard.tsx)
- Интеграция замещений

---

## 14. Профиль и настройки

- Десктопная адаптация профиля (ProfileSplitView, ProfileSidebarNavigation, ProfileContentArea)
- Управление хранилищем (StorageScreen.tsx, StorageContent.tsx, fileCache.ts, cacheMaintenance.ts)
- Настройки: тема, анимации (AnimationSettingsContent.tsx), масштаб (ZoomSettingsContent.tsx), трей (TraySettingsContent.tsx), уведомления, passkey

---

## 15. Инфраструктура и DevOps

### 15.1. Сборка iOS
45+ сборок за период. Конфиг-плагины: withDevEnvironment.js, withPodfileModifications.js, withPushNotificationDelegates.js, withShareExtensionDisplayName.js, withNotificationServiceExtension.js. EAS Build конфигурация, CI/CD GitHub Actions (build-ios.yml), скрипты сборки (build-ios.sh).

### 15.2. Сборка Android
Множество сборок (build 16–42). Плагины подписи (withAndroidSigningConfig.js) и passkey (withAndroidPasskey.js). Скрипт сборки (build-android.sh).

### 15.3. Сборка Electron/Windows
Скрипт сборки Windows (build-windows.sh), универсальный скрипт (build.sh).

### 15.4. Sentry
Подключение Sentry для мониторинга ошибок, утилиты логирования (logger.ts, sentry.ts), компонент ErrorBoundary.

### 15.5. Подготовка к продакшену
Комплексный коммит безопасности и стабильности, удаление console.log (55+ файлов), централизованное управление версиями (version.json).

### 15.6. Хранилище и кэширование
MMKV для нативных платформ / AsyncStorage для веба, разогрев кэша (useCacheWarming.ts), обслуживание кэша (cacheMaintenance.ts), secure storage (secureStorage.ts).

---

## 16. Производительность

- Оптимизация API и чата
- Снижение анимаций, настройки производительности Android (PerformanceScreen.tsx)
- Дифференциальная синхронизация (useDifferentialSync.ts)
- Сетевая синхронизация (useNetworkSync.ts, NetworkSyncProvider.tsx)
- Тихое обновление чатов и поиска
- Оптимизация FlashList

---

## 17. UI/UX

### 17.1. Новые переиспользуемые компоненты
DataTable, MonthRangePicker, HoverTooltip, SwipeBackView, CustomScrollView, ActionModal, ActionMenu, ConfirmDialog, InputDialog, DatePickerModal, UserProfileModal, UserSelectorModal, InAppNotification, ExpandableFilterButton, ExpandableCreateButton, LinkifiedText, FormattedText, SpoilerText, AnimatedTabBar, Toast.

### 17.2. Скелетоны загрузки
Более 20 новых компонентов скелетонов для всех разделов приложения.

### 17.3. Fallback-компоненты
8+ fallback-компонентов для десктопных представлений.

### 17.4. Стилевые гайды
desktop-sizing-guide.md, desktop-design-standards-prompt.md, mobile-design-standards-prompt.md, desktop-modal-template.md, desktop-skeleton-guide.md.

---

## Ключевые новые файлы и компоненты

### Новые экраны
- ThreadScreen.tsx — треды
- AbsenceListScreen.tsx — отсутствия
- ScheduleListScreen.tsx, ScheduleDetailScreen.tsx — расписания
- DashboardScreen.tsx — дашборд
- StorageScreen.tsx, PerformanceScreen.tsx — настройки
- MetricsAnalyticsScreen.tsx — аналитика
- EventDetailScreen.tsx — детали события

### Новые сервисы
- pushNotificationElectron.service.ts — push для Electron
- pushNotificationIOS.service.ts — push для iOS
- appUpdater.service.ts — автообновление
- accountManager.ts — управление аккаунтами

### Новые store (Zustand)
- animationStore.ts — анимации
- accountStore.ts — мультиаккаунт
- scheduleCacheStore.ts — кэш расписаний
- calendarStore.ts — календарь
- absenceStore.ts — отсутствия
- scheduleStore.ts — расписания

### Новые хуки
- useChatScroll.ts — прокрутка чата (30+ коммитов)
- usePendingChanges.ts — отслеживание изменений расписания
- useAbsencePermissions.ts — разрешения отсутствий
- useCacheWarming.ts — разогрев кэша
- useAnimationType.ts — тип анимации
- useVideoUploadMessage.ts — загрузка видео
- useTitleBarControlsIntegration.ts — интеграция тайтлбара

### Конфиг-плагины (Expo)
- withDevEnvironment.js — dev/prod окружения
- withPodfileModifications.js — Podfile для Firebase
- withPushNotificationDelegates.js — push-делегаты
- withShareExtensionDisplayName.js — Share Extension
- withNotificationServiceExtension.js — Notification Service Extension
- withAndroidPasskey.js — passkey для Android
- withAndroidSigningConfig.js — подпись Android

---

## Заключение

За период декабрь 2025 — март 2026 проект «Тахион» прошёл путь от преимущественно мобильного приложения-мессенджера до полноценной кроссплатформенной корпоративной системы коммуникации. Основные результаты:

1. **Десктопное приложение на Electron** — с кастомным тайтлбаром, split-view архитектурой, глобальным поиском, файловым кэшированием и системой обновлений.
2. **Расширенный мессенджер** — треды, реакции, видео, форматированный текст, каналы, мьют, спойлеры, системные сообщения.
3. **Модуль управления расписаниями** — с сеткой расписаний, импортом, черновиками, отслеживанием конфликтов.
4. **Модуль управления отсутствиями** — с замещениями, годовым календарём, ролевыми разрешениями.
5. **Полноценный календарь** — с бесконечной прокруткой, праздниками, днями рождения, десктопным представлением.
6. **Административная панель** — управление пользователями, группами, отделами, аналитика.
7. **Инфраструктура production-уровня** — Sentry, ErrorBoundary, скрипты сборки для 3 платформ, управление версиями, удаление секретов.
