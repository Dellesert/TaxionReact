/**
 * Create Schedule Modal
 * Модальное окно для создания графика с пошаговым интерфейсом
 * Шаг 0: Выбор способа создания (импорт из Word или вручную)
 * Шаги 1-4: Пошаговое создание вручную
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  Modal,
  StatusBar,
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { fileApi } from '@api/fileApi';
import { useTheme } from '@shared/hooks/useTheme';
import { useIsWideScreen } from '@shared/hooks/useIsWideScreen';
import { useNotification } from '@shared/contexts/NotificationContext';
import DatePickerModal from '@shared/components/common/DatePickerModal';
import { format, addMonths } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
  ScheduleType,
  ScheduleVisibility,
  CreateScheduleRequest,
  ImportScheduleRequest,
  UserMappingOverride,
} from '../types/schedule.types';
import { scheduleApi } from '../api/schedule.api';
import { useScheduleImport } from '../hooks/useScheduleImport';
import { ImportPreview } from './ImportPreview';

interface CreateScheduleModalProps {
  visible: boolean;
  onClose: () => void;
  onScheduleCreated: (scheduleId: number) => void;
}

type CreateMethod = 'manual' | 'import' | null;
type Step = 0 | 1 | 2 | 3 | 4;
type ImportStep = 'select' | 'configure' | 'preview' | 'importing' | 'success';

const SCHEDULE_COLORS = [
  { value: '#EF4444', label: 'Красный' },
  { value: '#F59E0B', label: 'Оранжевый' },
  { value: '#10B981', label: 'Зелёный' },
  { value: '#3B82F6', label: 'Синий' },
  { value: '#8B5CF6', label: 'Фиолетовый' },
  { value: '#EC4899', label: 'Розовый' },
];

const SCHEDULE_TYPES: { value: ScheduleType; label: string; icon: string; description: string }[] = [
  { value: 'work', label: 'Рабочий график', icon: 'briefcase-outline', description: 'Стандартный рабочий график сотрудников' },
  { value: 'paid_services', label: 'Платные услуги', icon: 'cash-outline', description: 'График платных услуг и приёмов' },
  { value: 'on_duty', label: 'Дежурства', icon: 'medical-outline', description: 'График дежурств персонала' },
  { value: 'shift', label: 'Сменный график', icon: 'swap-horizontal-outline', description: 'Посменный график работы' },
  { value: 'custom', label: 'Другое', icon: 'ellipsis-horizontal-outline', description: 'Произвольный тип графика' },
];

const VISIBILITY_OPTIONS: { value: ScheduleVisibility; label: string; icon: string; description: string }[] = [
  { value: 'creator_only', label: 'Только создатель', icon: 'lock-closed-outline', description: 'Виден только вам' },
  { value: 'management', label: 'Руководство', icon: 'people-outline', description: 'Виден руководителям' },
  { value: 'participants', label: 'Участники', icon: 'globe-outline', description: 'Виден всем участникам графика' },
];

const CreateScheduleModal: React.FC<CreateScheduleModalProps> = ({
  visible,
  onClose,
  onScheduleCreated,
}) => {
  const { theme, isDark } = useTheme();
  const isDesktop = useIsWideScreen();
  const insets = useSafeAreaInsets();
  const { showSuccess, showError } = useNotification();

  // Create method selection
  const [createMethod, setCreateMethod] = useState<CreateMethod>(null);

  // Multi-step state for manual creation
  const [currentStep, setCurrentStep] = useState<Step>(0);
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Step 1: Title and Description
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  // Step 2: Type selection
  const [scheduleType, setScheduleType] = useState<ScheduleType | null>(null);

  // Step 3: Dates and Times
  const [startDate, setStartDate] = useState(() => new Date());
  const [endDate, setEndDate] = useState(() => addMonths(new Date(), 1));
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [morningStart, setMorningStart] = useState('08:00');
  const [morningEnd, setMorningEnd] = useState('14:00');
  const [eveningStart, setEveningStart] = useState('14:00');
  const [eveningEnd, setEveningEnd] = useState('20:00');

  // Step 4: Visibility and Color
  const [visibility, setVisibility] = useState<ScheduleVisibility>('management');
  const [color, setColor] = useState('#3B82F6');

  const [isCreating, setIsCreating] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  // Import state
  const {
    isLoading: isImportLoading,
    isImporting,
    preview,
    result: importResult,
    error: importError,
    loadPreview,
    executeImport,
    clearPreview,
    clearError,
  } = useScheduleImport();

  const [importStep, setImportStep] = useState<ImportStep>('select');
  const [selectedFile, setSelectedFile] = useState<{
    uri: string;
    name: string;
    type: string;
  } | null>(null);
  const [uploadedFileId, setUploadedFileId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // User mapping overrides for import
  const [userMappingOverrides, setUserMappingOverrides] = useState<
    Map<string, { userId: number; userName: string }>
  >(new Map());

  // Track keyboard visibility
  useEffect(() => {
    const showSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setIsKeyboardVisible(true)
    );
    const hideSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setIsKeyboardVisible(false)
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  // Animation when step changes
  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start();
  }, [currentStep, importStep]);

  // Handle method selection
  const handleSelectMethod = (method: CreateMethod) => {
    setCreateMethod(method);
    if (method === 'manual') {
      setCurrentStep(1);
    } else if (method === 'import') {
      setImportStep('select');
    }
  };

  // Navigation handlers for manual creation
  const goToNextStep = () => {
    if (currentStep === 1 && !title.trim()) {
      return;
    }

    if (currentStep === 2 && !scheduleType) {
      return;
    }

    if (currentStep === 3) {
      if (endDate <= startDate) {
        showError('Дата окончания должна быть позже даты начала');
        return;
      }
    }

    if (currentStep < 4) {
      setCurrentStep((currentStep + 1) as Step);
    }
  };

  const goToPreviousStep = () => {
    if (currentStep === 1) {
      setCurrentStep(0);
      setCreateMethod(null);
    } else if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as Step);
    }
  };

  const handleStartDateChange = (_event: any, selectedDate?: Date) => {
    if (selectedDate) {
      setStartDate(selectedDate);
      if (endDate <= selectedDate) {
        setEndDate(addMonths(selectedDate, 1));
      }
    }
  };

  const handleEndDateChange = (_event: any, selectedDate?: Date) => {
    if (selectedDate) {
      setEndDate(selectedDate);
    }
  };

  const formatTimeInput = (value: string): string => {
    const cleaned = value.replace(/[^\d:]/g, '');
    if (cleaned.length === 2 && !cleaned.includes(':')) {
      return cleaned + ':';
    }
    const match = cleaned.match(/^(\d{0,2}):?(\d{0,2})/);
    if (match) {
      const [, hours, minutes] = match;
      if (hours && minutes) {
        return `${hours}:${minutes}`;
      } else if (hours) {
        return cleaned.includes(':') ? `${hours}:` : hours;
      }
    }
    return cleaned.slice(0, 5);
  };

  const handleCreateSchedule = async () => {
    if (!title.trim() || !scheduleType) {
      return;
    }

    try {
      setIsCreating(true);

      const scheduleData: CreateScheduleRequest = {
        title: title.trim(),
        description: description.trim() || undefined,
        type: scheduleType,
        visibility,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        morning_start: morningStart,
        morning_end: morningEnd,
        evening_start: eveningStart,
        evening_end: eveningEnd,
        color,
      };

      const createdSchedule = await scheduleApi.createSchedule(scheduleData);

      showSuccess('График успешно создан');
      onScheduleCreated(createdSchedule.id);
      handleClose();
    } catch (error: any) {
      console.error('Failed to create schedule:', error);
      showError(error.message || 'Не удалось создать график');
    } finally {
      setIsCreating(false);
    }
  };

  // Import handlers
  const handleSelectFile = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/msword',
          'application/vnd.oasis.opendocument.text',
        ],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        setSelectedFile({
          uri: file.uri,
          name: file.name,
          type: file.mimeType || 'application/octet-stream',
        });

        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
        setTitle(nameWithoutExt);

        setIsUploading(true);
        try {
          const uploadedFile = await fileApi.uploadFile(
            {
              uri: file.uri,
              name: file.name,
              type: file.mimeType || 'application/octet-stream',
            },
            'document',
            (progress) => setUploadProgress(progress)
          );
          setUploadedFileId(uploadedFile.file_name);
          setImportStep('configure');
        } catch (uploadError) {
          console.error('Upload error:', uploadError);
          showError('Не удалось загрузить файл');
        } finally {
          setIsUploading(false);
          setUploadProgress(0);
        }
      }
    } catch (err) {
      console.error('Document pick error:', err);
    }
  }, [showError]);

  const handleLoadPreview = useCallback(async () => {
    if (!uploadedFileId) return;

    const startDateISO = `${format(startDate, 'yyyy-MM-dd')}T00:00:00Z`;
    const endDateISO = `${format(endDate, 'yyyy-MM-dd')}T23:59:59Z`;

    const request: ImportScheduleRequest = {
      file_id: uploadedFileId,
      title,
      description,
      type: scheduleType || 'work',
      start_date: startDateISO,
      end_date: endDateISO,
      preview: true,
    };

    const previewResult = await loadPreview(request);
    if (previewResult) {
      setImportStep('preview');
    }
  }, [uploadedFileId, title, description, scheduleType, startDate, endDate, loadPreview]);

  const handleImport = useCallback(async () => {
    if (!uploadedFileId) return;

    setImportStep('importing');

    const startDateISO = `${format(startDate, 'yyyy-MM-dd')}T00:00:00Z`;
    const endDateISO = `${format(endDate, 'yyyy-MM-dd')}T23:59:59Z`;

    // Convert Map to array of UserMappingOverride
    const overrides: UserMappingOverride[] = Array.from(
      userMappingOverrides.entries()
    ).map(([originalName, { userId }]) => ({
      original_name: originalName,
      user_id: userId,
    }));

    const request: ImportScheduleRequest = {
      file_id: uploadedFileId,
      title,
      description,
      type: scheduleType || 'work',
      start_date: startDateISO,
      end_date: endDateISO,
      preview: false,
      user_mapping_overrides: overrides.length > 0 ? overrides : undefined,
    };

    const result = await executeImport(request);
    if (result) {
      setImportStep('success');
      setTimeout(() => {
        onScheduleCreated(result.schedule.id);
        handleClose();
      }, 1500);
    } else {
      setImportStep('preview');
    }
  }, [uploadedFileId, title, description, scheduleType, startDate, endDate, userMappingOverrides, executeImport, onScheduleCreated]);

  const handleImportBack = useCallback(() => {
    if (importStep === 'select') {
      setCreateMethod(null);
      setCurrentStep(0);
    } else if (importStep === 'configure') {
      setImportStep('select');
      setSelectedFile(null);
      setUploadedFileId(null);
    } else if (importStep === 'preview') {
      setImportStep('configure');
    }
  }, [importStep]);

  // Handler for user mapping changes from ImportPreview
  const handleUserMappingChange = useCallback(
    (originalName: string, userId: number | null, userName: string | null) => {
      setUserMappingOverrides((prev) => {
        const newMap = new Map(prev);
        if (userId === null) {
          newMap.delete(originalName);
        } else {
          newMap.set(originalName, { userId, userName: userName || '' });
        }
        return newMap;
      });
    },
    []
  );

  const handleClose = () => {
    setCurrentStep(0);
    setCreateMethod(null);
    setTitle('');
    setDescription('');
    setScheduleType(null);
    setStartDate(new Date());
    setEndDate(addMonths(new Date(), 1));
    setMorningStart('08:00');
    setMorningEnd('14:00');
    setEveningStart('14:00');
    setEveningEnd('20:00');
    setVisibility('management');
    setColor('#3B82F6');
    slideAnim.setValue(0);
    // Reset import state
    setImportStep('select');
    setSelectedFile(null);
    setUploadedFileId(null);
    setUserMappingOverrides(new Map());
    clearPreview();
    clearError();
    onClose();
  };

  // Get step info
  const getStepTitle = () => {
    if (createMethod === 'import') {
      switch (importStep) {
        case 'select': return 'Выбор файла';
        case 'configure': return 'Настройка';
        case 'preview': return 'Предпросмотр';
        case 'importing': return 'Импорт';
        case 'success': return 'Готово';
        default: return '';
      }
    }

    switch (currentStep) {
      case 0: return 'Создание графика';
      case 1: return 'Название графика';
      case 2: return 'Тип графика';
      case 3: return 'Период и время';
      case 4: return 'Настройки';
      default: return '';
    }
  };

  const getStepDescription = () => {
    if (createMethod === 'import') {
      switch (importStep) {
        case 'select': return 'Выберите файл Word с графиком';
        case 'configure': return 'Настройте параметры импорта';
        case 'preview': return 'Проверьте данные перед импортом';
        default: return '';
      }
    }

    switch (currentStep) {
      case 0: return 'Выберите способ создания графика';
      case 1: return 'Введите название и описание графика';
      case 2: return 'Выберите тип графика для правильной категоризации';
      case 3: return 'Укажите период действия и время смен';
      case 4: return 'Настройте видимость и цвет графика';
      default: return '';
    }
  };

  const getTotalSteps = () => {
    if (createMethod === 'import') return 3;
    return 4;
  };

  const getCurrentStepNumber = () => {
    if (createMethod === 'import') {
      switch (importStep) {
        case 'select': return 1;
        case 'configure': return 2;
        case 'preview': return 3;
        default: return 1;
      }
    }
    return currentStep;
  };

  const showProgress = createMethod !== null && currentStep > 0 || (createMethod === 'import' && importStep !== 'importing' && importStep !== 'success');

  // Render import content
  const renderImportContent = () => {
    switch (importStep) {
      case 'select':
        return (
          <View style={styles.stepContent}>
            <View style={styles.importIconContainer}>
              <Ionicons name="document-text" size={64} color={theme.primary} />
            </View>
            <Text style={[styles.importTitle, { color: theme.text }]}>
              Импорт из Word
            </Text>
            <Text style={[styles.importDescription, { color: theme.textSecondary }]}>
              Выберите файл Word (.docx, .doc) с таблицей графика работы. Система
              автоматически распознает сотрудников и смены.
            </Text>

            {isUploading ? (
              <View style={styles.uploadingContainer}>
                <ActivityIndicator size="large" color={theme.primary} />
                <Text style={[styles.uploadingText, { color: theme.textSecondary }]}>
                  Загрузка файла... {Math.round(uploadProgress)}%
                </Text>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.selectFileButton, { backgroundColor: theme.primary }]}
                onPress={handleSelectFile}
              >
                <Ionicons name="folder-open" size={24} color="#FFFFFF" />
                <Text style={styles.selectFileButtonText}>Выбрать файл</Text>
              </TouchableOpacity>
            )}

            <View style={styles.supportedFormats}>
              <Text style={[styles.formatsLabel, { color: theme.textSecondary }]}>
                Поддерживаемые форматы:
              </Text>
              <Text style={[styles.formatsText, { color: theme.textTertiary }]}>
                .docx, .doc, .odt
              </Text>
            </View>
          </View>
        );

      case 'configure':
        return (
          <View style={styles.stepContent}>
            {/* Selected file info */}
            <View
              style={[
                styles.fileInfo,
                { backgroundColor: theme.backgroundSecondary, borderColor: theme.border },
              ]}
            >
              <Ionicons name="document" size={24} color={theme.primary} />
              <Text
                style={[styles.fileName, { color: theme.text }]}
                numberOfLines={1}
              >
                {selectedFile?.name}
              </Text>
              <Ionicons name="checkmark-circle" size={20} color={theme.success} />
            </View>

            {/* Title */}
            <View style={styles.inputSection}>
              <Text style={[styles.inputLabel, { color: theme.text }]}>
                Название графика *
              </Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: theme.card, borderColor: theme.border, color: theme.text },
                ]}
                value={title}
                onChangeText={setTitle}
                placeholder="Введите название"
                placeholderTextColor={theme.inputPlaceholder}
              />
            </View>

            {/* Description */}
            <View style={styles.inputSection}>
              <Text style={[styles.inputLabel, { color: theme.text }]}>Описание</Text>
              <TextInput
                style={[
                  styles.textArea,
                  { backgroundColor: theme.card, borderColor: theme.border, color: theme.text },
                ]}
                value={description}
                onChangeText={setDescription}
                placeholder="Описание графика (необязательно)"
                placeholderTextColor={theme.inputPlaceholder}
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Type */}
            <View style={styles.inputSection}>
              <Text style={[styles.inputLabel, { color: theme.text }]}>Тип графика</Text>
              <View style={styles.typeButtonsRow}>
                {SCHEDULE_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type.value}
                    style={[
                      styles.typeButtonSmall,
                      {
                        backgroundColor:
                          scheduleType === type.value
                            ? theme.primary
                            : theme.backgroundSecondary,
                        borderColor:
                          scheduleType === type.value ? theme.primary : theme.border,
                      },
                    ]}
                    onPress={() => setScheduleType(type.value)}
                  >
                    <Text
                      style={[
                        styles.typeButtonSmallText,
                        { color: scheduleType === type.value ? '#FFFFFF' : theme.text },
                      ]}
                    >
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Date range */}
            <View style={styles.inputSection}>
              <Text style={[styles.inputLabel, { color: theme.text }]}>Период</Text>
              <View style={styles.dateRow}>
                <TouchableOpacity
                  style={[styles.dateButton, { backgroundColor: theme.card, borderColor: theme.border, flex: 1 }]}
                  onPress={() => setShowStartDatePicker(true)}
                >
                  <Ionicons name="calendar-outline" size={18} color={theme.primary} />
                  <Text style={[styles.dateButtonText, { color: theme.text }]}>
                    {format(startDate, 'dd.MM.yyyy')}
                  </Text>
                </TouchableOpacity>
                <Text style={[styles.dateSeparator, { color: theme.textSecondary }]}>—</Text>
                <TouchableOpacity
                  style={[styles.dateButton, { backgroundColor: theme.card, borderColor: theme.border, flex: 1 }]}
                  onPress={() => setShowEndDatePicker(true)}
                >
                  <Ionicons name="calendar-outline" size={18} color={theme.primary} />
                  <Text style={[styles.dateButtonText, { color: theme.text }]}>
                    {format(endDate, 'dd.MM.yyyy')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Error */}
            {importError && (
              <View
                style={[
                  styles.errorBanner,
                  { backgroundColor: theme.error + '20', borderColor: theme.error },
                ]}
              >
                <Ionicons name="alert-circle" size={20} color={theme.error} />
                <Text style={[styles.errorText, { color: theme.error }]}>{importError}</Text>
              </View>
            )}
          </View>
        );

      case 'preview':
        return (
          <View style={styles.stepContent}>
            {preview && (
              <ImportPreview
                preview={preview}
                editable={true}
                userMappingOverrides={userMappingOverrides}
                onUserMappingChange={handleUserMappingChange}
              />
            )}

            {importError && (
              <View
                style={[
                  styles.errorBanner,
                  { backgroundColor: theme.error + '20', borderColor: theme.error },
                ]}
              >
                <Ionicons name="alert-circle" size={20} color={theme.error} />
                <Text style={[styles.errorText, { color: theme.error }]}>{importError}</Text>
              </View>
            )}
          </View>
        );

      case 'importing':
        return (
          <View style={[styles.stepContent, styles.centerContent]}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.importingText, { color: theme.text }]}>
              Импортируем график...
            </Text>
          </View>
        );

      case 'success':
        return (
          <View style={[styles.stepContent, styles.centerContent]}>
            <Ionicons name="checkmark-circle" size={64} color={theme.success} />
            <Text style={[styles.successTitle, { color: theme.text }]}>
              Импорт завершён!
            </Text>
            {importResult && (
              <Text style={[styles.successDescription, { color: theme.textSecondary }]}>
                Создано {importResult.entries_count} записей
              </Text>
            )}
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <Modal
      visible={visible}
      animationType={isDesktop ? "fade" : "slide"}
      transparent={isDesktop}
      onRequestClose={handleClose}
      presentationStyle={isDesktop ? "overFullScreen" : "fullScreen"}
    >
      <View style={[
        styles.modalOverlay,
        isDesktop && styles.modalOverlayDesktop,
        { backgroundColor: isDesktop ? 'rgba(0, 0, 0, 0.5)' : theme.card }
      ]}>
        <View style={[
          styles.container,
          { backgroundColor: theme.card },
          !isDesktop && { paddingTop: insets.top },
          isDesktop && styles.containerDesktop
        ]}>
          <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={theme.card} />

          {/* Header - hide when keyboard is visible */}
          {!isKeyboardVisible && (
            <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
              <TouchableOpacity onPress={handleClose} style={styles.headerButton}>
                <Ionicons name="close" size={28} color={theme.textSecondary} />
              </TouchableOpacity>

              <View style={styles.headerCenter}>
                <Text style={[styles.headerTitle, { color: theme.text }]}>{getStepTitle()}</Text>
                {showProgress && (
                  <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
                    Шаг {getCurrentStepNumber()} из {getTotalSteps()}
                  </Text>
                )}
              </View>

              <View style={styles.headerButton} />
            </View>
          )}

          {/* Compact header when keyboard is visible */}
          {isKeyboardVisible && (
            <View style={[styles.compactHeader, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
              <TouchableOpacity onPress={handleClose} style={styles.compactHeaderButton}>
                <Ionicons name="close" size={24} color={theme.textSecondary} />
              </TouchableOpacity>
              <Text style={[styles.compactHeaderTitle, { color: theme.text }]}>{getStepTitle()}</Text>
              <View style={styles.compactHeaderButton} />
            </View>
          )}

          {/* Progress Indicator - hide when keyboard is visible */}
          {!isKeyboardVisible && showProgress && (
            <View style={[styles.progressContainer, { backgroundColor: theme.card }]}>
              <View style={styles.progressBar}>
                {Array.from({ length: getTotalSteps() }, (_, i) => i + 1).map((step) => (
                  <View
                    key={step}
                    style={[
                      styles.progressStep,
                      { backgroundColor: theme.border },
                      getCurrentStepNumber() >= step && { backgroundColor: theme.primary },
                    ]}
                  />
                ))}
              </View>
            </View>
          )}

          <KeyboardAvoidingView
            style={styles.keyboardAvoidingView}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={0}
          >
            {/* Content */}
            <Animated.View style={{ flex: 1, transform: [{ translateX: slideAnim }] }}>
              <ScrollView
                style={[styles.content, { backgroundColor: theme.background }]}
                contentContainerStyle={{ paddingBottom: isKeyboardVisible ? 10 : 20 }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <View style={[styles.stepContainer, isKeyboardVisible && styles.stepContainerCompact]}>
                  {!isKeyboardVisible && currentStep !== 0 && createMethod === 'manual' && (
                    <>
                      <Text style={[styles.stepTitle, { color: theme.text }]}>{getStepTitle()}</Text>
                      <Text style={[styles.stepDescription, { color: theme.textSecondary }]}>
                        {getStepDescription()}
                      </Text>
                    </>
                  )}

                  {/* Step 0: Method Selection */}
                  {currentStep === 0 && createMethod === null && (
                    <View style={styles.stepContent}>
                      {!isKeyboardVisible && (
                        <>
                          <Text style={[styles.stepTitle, { color: theme.text }]}>{getStepTitle()}</Text>
                          <Text style={[styles.stepDescription, { color: theme.textSecondary }]}>
                            {getStepDescription()}
                          </Text>
                        </>
                      )}

                      <TouchableOpacity
                        onPress={() => handleSelectMethod('manual')}
                        style={[
                          styles.methodCard,
                          { backgroundColor: theme.card, borderColor: theme.border },
                        ]}
                      >
                        <View style={[styles.methodIcon, { backgroundColor: theme.primary + '15' }]}>
                          <Ionicons name="create-outline" size={32} color={theme.primary} />
                        </View>
                        <View style={styles.methodInfo}>
                          <Text style={[styles.methodTitle, { color: theme.text }]}>Создать вручную</Text>
                          <Text style={[styles.methodDescription, { color: theme.textSecondary }]}>
                            Пошаговое создание графика с указанием всех параметров
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={24} color={theme.textTertiary} />
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handleSelectMethod('import')}
                        style={[
                          styles.methodCard,
                          { backgroundColor: theme.card, borderColor: theme.border },
                        ]}
                      >
                        <View style={[styles.methodIcon, { backgroundColor: '#10B981' + '15' }]}>
                          <Ionicons name="document-text-outline" size={32} color="#10B981" />
                        </View>
                        <View style={styles.methodInfo}>
                          <Text style={[styles.methodTitle, { color: theme.text }]}>Импорт из Word</Text>
                          <Text style={[styles.methodDescription, { color: theme.textSecondary }]}>
                            Загрузите файл .docx с таблицей графика
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={24} color={theme.textTertiary} />
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Import flow */}
                  {createMethod === 'import' && renderImportContent()}

                  {/* Manual creation steps */}
                  {createMethod === 'manual' && (
                    <>
                      {/* Step 1: Title and Description */}
                      {currentStep === 1 && (
                        <View style={styles.stepContent}>
                          <View style={styles.inputSection}>
                            <Text style={[styles.inputLabel, { color: theme.text }]}>Название *</Text>
                            <TextInput
                              style={[
                                styles.input,
                                { backgroundColor: theme.card, borderColor: theme.border, color: theme.text },
                              ]}
                              placeholder="Например: График дежурств на январь"
                              placeholderTextColor={theme.inputPlaceholder}
                              value={title}
                              onChangeText={setTitle}
                              maxLength={255}
                              autoFocus
                            />
                            <Text style={[styles.charCount, { color: theme.textTertiary }]}>
                              {title.length}/255
                            </Text>
                          </View>

                          <View style={styles.inputSection}>
                            <Text style={[styles.inputLabel, { color: theme.text }]}>Описание (необязательно)</Text>
                            <TextInput
                              style={[
                                styles.textArea,
                                { backgroundColor: theme.card, borderColor: theme.border, color: theme.text },
                              ]}
                              placeholder="Дополнительная информация о графике..."
                              placeholderTextColor={theme.inputPlaceholder}
                              value={description}
                              onChangeText={setDescription}
                              maxLength={2000}
                              multiline
                              numberOfLines={4}
                              textAlignVertical="top"
                            />
                            <Text style={[styles.charCount, { color: theme.textTertiary }]}>
                              {description.length}/2000
                            </Text>
                          </View>
                        </View>
                      )}

                      {/* Step 2: Type Selection */}
                      {currentStep === 2 && (
                        <View style={styles.stepContent}>
                          {SCHEDULE_TYPES.map((item) => (
                            <TouchableOpacity
                              key={item.value}
                              onPress={() => setScheduleType(item.value)}
                              style={[
                                styles.typeCard,
                                { backgroundColor: theme.card, borderColor: theme.border },
                                scheduleType === item.value && { borderColor: theme.primary, borderWidth: 2 },
                              ]}
                            >
                              <View style={[
                                styles.typeIcon,
                                { backgroundColor: scheduleType === item.value ? theme.primary : theme.backgroundSecondary }
                              ]}>
                                <Ionicons
                                  name={item.icon as any}
                                  size={28}
                                  color={scheduleType === item.value ? '#FFFFFF' : theme.primary}
                                />
                              </View>
                              <View style={styles.typeInfo}>
                                <Text style={[styles.typeTitle, { color: theme.text }]}>{item.label}</Text>
                                <Text style={[styles.typeDescription, { color: theme.textSecondary }]}>
                                  {item.description}
                                </Text>
                              </View>
                              {scheduleType === item.value && (
                                <Ionicons name="checkmark-circle" size={24} color={theme.primary} />
                              )}
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}

                      {/* Step 3: Dates and Times */}
                      {currentStep === 3 && (
                        <View style={styles.stepContent}>
                          <View style={styles.inputSection}>
                            <Text style={[styles.inputLabel, { color: theme.text }]}>Период действия</Text>
                            <View style={styles.dateRow}>
                              <TouchableOpacity
                                style={[styles.dateButton, { backgroundColor: theme.card, borderColor: theme.border, flex: 1 }]}
                                onPress={() => setShowStartDatePicker(true)}
                              >
                                <Ionicons name="calendar-outline" size={20} color={theme.primary} />
                                <Text style={[styles.dateButtonText, { color: theme.text }]}>
                                  {format(startDate, 'dd MMM yyyy', { locale: ru })}
                                </Text>
                              </TouchableOpacity>
                              <Text style={[styles.dateSeparator, { color: theme.textSecondary }]}>—</Text>
                              <TouchableOpacity
                                style={[styles.dateButton, { backgroundColor: theme.card, borderColor: theme.border, flex: 1 }]}
                                onPress={() => setShowEndDatePicker(true)}
                              >
                                <Ionicons name="calendar-outline" size={20} color={theme.primary} />
                                <Text style={[styles.dateButtonText, { color: theme.text }]}>
                                  {format(endDate, 'dd MMM yyyy', { locale: ru })}
                                </Text>
                              </TouchableOpacity>
                            </View>
                          </View>

                          <View style={styles.inputSection}>
                            <Text style={[styles.inputLabel, { color: theme.text }]}>Время смен</Text>

                            <View style={[styles.shiftCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                              <View style={styles.shiftHeader}>
                                <Ionicons name="sunny-outline" size={20} color="#F59E0B" />
                                <Text style={[styles.shiftLabel, { color: theme.text }]}>Утренняя смена</Text>
                              </View>
                              <View style={styles.timeInputGroup}>
                                <TextInput
                                  style={[styles.timeInput, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border, color: theme.text }]}
                                  placeholder="08:00"
                                  placeholderTextColor={theme.inputPlaceholder}
                                  value={morningStart}
                                  onChangeText={(text) => setMorningStart(formatTimeInput(text))}
                                  keyboardType="numeric"
                                  maxLength={5}
                                />
                                <Text style={[styles.timeSeparator, { color: theme.textSecondary }]}>—</Text>
                                <TextInput
                                  style={[styles.timeInput, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border, color: theme.text }]}
                                  placeholder="14:00"
                                  placeholderTextColor={theme.inputPlaceholder}
                                  value={morningEnd}
                                  onChangeText={(text) => setMorningEnd(formatTimeInput(text))}
                                  keyboardType="numeric"
                                  maxLength={5}
                                />
                              </View>
                            </View>

                            <View style={[styles.shiftCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                              <View style={styles.shiftHeader}>
                                <Ionicons name="moon-outline" size={20} color="#8B5CF6" />
                                <Text style={[styles.shiftLabel, { color: theme.text }]}>Вечерняя смена</Text>
                              </View>
                              <View style={styles.timeInputGroup}>
                                <TextInput
                                  style={[styles.timeInput, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border, color: theme.text }]}
                                  placeholder="14:00"
                                  placeholderTextColor={theme.inputPlaceholder}
                                  value={eveningStart}
                                  onChangeText={(text) => setEveningStart(formatTimeInput(text))}
                                  keyboardType="numeric"
                                  maxLength={5}
                                />
                                <Text style={[styles.timeSeparator, { color: theme.textSecondary }]}>—</Text>
                                <TextInput
                                  style={[styles.timeInput, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border, color: theme.text }]}
                                  placeholder="20:00"
                                  placeholderTextColor={theme.inputPlaceholder}
                                  value={eveningEnd}
                                  onChangeText={(text) => setEveningEnd(formatTimeInput(text))}
                                  keyboardType="numeric"
                                  maxLength={5}
                                />
                              </View>
                            </View>
                          </View>
                        </View>
                      )}

                      {/* Step 4: Visibility and Color */}
                      {currentStep === 4 && (
                        <View style={styles.stepContent}>
                          <View style={styles.inputSection}>
                            <Text style={[styles.inputLabel, { color: theme.text }]}>Видимость</Text>
                            {VISIBILITY_OPTIONS.map((item) => (
                              <TouchableOpacity
                                key={item.value}
                                onPress={() => setVisibility(item.value)}
                                style={[
                                  styles.visibilityCard,
                                  { backgroundColor: theme.card, borderColor: theme.border },
                                  visibility === item.value && { borderColor: theme.primary, borderWidth: 2 },
                                ]}
                              >
                                <View style={[
                                  styles.visibilityIcon,
                                  { backgroundColor: visibility === item.value ? theme.primary : theme.backgroundSecondary }
                                ]}>
                                  <Ionicons
                                    name={item.icon as any}
                                    size={20}
                                    color={visibility === item.value ? '#FFFFFF' : theme.primary}
                                  />
                                </View>
                                <View style={styles.visibilityInfo}>
                                  <Text style={[styles.visibilityTitle, { color: theme.text }]}>{item.label}</Text>
                                  <Text style={[styles.visibilityDescription, { color: theme.textSecondary }]}>
                                    {item.description}
                                  </Text>
                                </View>
                                {visibility === item.value && (
                                  <Ionicons name="checkmark-circle" size={20} color={theme.primary} />
                                )}
                              </TouchableOpacity>
                            ))}
                          </View>

                          <View style={styles.inputSection}>
                            <Text style={[styles.inputLabel, { color: theme.text }]}>Цвет графика</Text>
                            <View style={styles.colorRow}>
                              {SCHEDULE_COLORS.map((c) => (
                                <TouchableOpacity
                                  key={c.value}
                                  style={[
                                    styles.colorOption,
                                    { backgroundColor: c.value },
                                    color === c.value && styles.colorOptionSelected,
                                  ]}
                                  onPress={() => setColor(c.value)}
                                >
                                  {color === c.value && (
                                    <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                                  )}
                                </TouchableOpacity>
                              ))}
                            </View>
                          </View>

                          <View style={[styles.summaryCard, { backgroundColor: theme.backgroundSecondary }]}>
                            <Text style={[styles.summaryTitle, { color: theme.text }]}>Сводка</Text>
                            <View style={styles.summaryRow}>
                              <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Название:</Text>
                              <Text style={[styles.summaryValue, { color: theme.text }]} numberOfLines={1}>{title}</Text>
                            </View>
                            <View style={styles.summaryRow}>
                              <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Тип:</Text>
                              <Text style={[styles.summaryValue, { color: theme.text }]}>
                                {SCHEDULE_TYPES.find(t => t.value === scheduleType)?.label}
                              </Text>
                            </View>
                            <View style={styles.summaryRow}>
                              <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Период:</Text>
                              <Text style={[styles.summaryValue, { color: theme.text }]}>
                                {format(startDate, 'dd.MM.yy')} — {format(endDate, 'dd.MM.yy')}
                              </Text>
                            </View>
                          </View>
                        </View>
                      )}
                    </>
                  )}
                </View>
              </ScrollView>
            </Animated.View>

            {/* Bottom Navigation */}
            {(currentStep > 0 || createMethod === 'import') && importStep !== 'importing' && importStep !== 'success' && (
              <View style={[
                styles.bottomNav,
                isKeyboardVisible && styles.bottomNavCompact,
                {
                  backgroundColor: theme.card,
                  borderTopColor: theme.border,
                  paddingBottom: isKeyboardVisible ? 8 : (isDesktop ? 20 : Math.max(insets.bottom, 16))
                }
              ]}>
                {/* Back button */}
                {(currentStep > 0 || (createMethod === 'import' && importStep !== 'select')) ? (
                  <TouchableOpacity
                    onPress={createMethod === 'import' ? handleImportBack : goToPreviousStep}
                    style={[
                      styles.navButton,
                      styles.backButton,
                      isKeyboardVisible && styles.navButtonCompact,
                      { borderColor: theme.border }
                    ]}
                  >
                    <Ionicons name="arrow-back" size={isKeyboardVisible ? 18 : 20} color={theme.text} />
                    <Text style={[styles.navButtonText, isKeyboardVisible && styles.navButtonTextCompact, { color: theme.text }]}>Назад</Text>
                  </TouchableOpacity>
                ) : createMethod === 'import' && importStep === 'select' ? (
                  <TouchableOpacity
                    onPress={handleImportBack}
                    style={[
                      styles.navButton,
                      styles.backButton,
                      isKeyboardVisible && styles.navButtonCompact,
                      { borderColor: theme.border }
                    ]}
                  >
                    <Ionicons name="arrow-back" size={isKeyboardVisible ? 18 : 20} color={theme.text} />
                    <Text style={[styles.navButtonText, isKeyboardVisible && styles.navButtonTextCompact, { color: theme.text }]}>Назад</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={[styles.navButton, isKeyboardVisible && styles.navButtonCompact]} />
                )}

                {/* Next/Create/Import button */}
                {createMethod === 'manual' ? (
                  currentStep < 4 ? (
                    <TouchableOpacity
                      onPress={goToNextStep}
                      style={[
                        styles.navButton,
                        styles.nextButton,
                        isKeyboardVisible && styles.navButtonCompact,
                        { backgroundColor: theme.primary }
                      ]}
                    >
                      <Text style={[styles.navButtonText, isKeyboardVisible && styles.navButtonTextCompact, { color: '#FFFFFF' }]}>Далее</Text>
                      <Ionicons name="arrow-forward" size={isKeyboardVisible ? 18 : 20} color="#FFFFFF" />
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      onPress={handleCreateSchedule}
                      disabled={isCreating}
                      style={[
                        styles.navButton,
                        styles.createButton,
                        isKeyboardVisible && styles.navButtonCompact,
                        { backgroundColor: theme.primary }
                      ]}
                    >
                      {isCreating ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <Ionicons name="checkmark" size={isKeyboardVisible ? 18 : 20} color="#FFFFFF" />
                          <Text style={[styles.navButtonText, isKeyboardVisible && styles.navButtonTextCompact, { color: '#FFFFFF' }]}>Создать</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )
                ) : createMethod === 'import' ? (
                  importStep === 'configure' ? (
                    <TouchableOpacity
                      onPress={handleLoadPreview}
                      disabled={!title || isImportLoading}
                      style={[
                        styles.navButton,
                        styles.nextButton,
                        isKeyboardVisible && styles.navButtonCompact,
                        { backgroundColor: theme.primary, opacity: !title || isImportLoading ? 0.5 : 1 }
                      ]}
                    >
                      {isImportLoading ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <Ionicons name="eye" size={isKeyboardVisible ? 18 : 20} color="#FFFFFF" />
                          <Text style={[styles.navButtonText, isKeyboardVisible && styles.navButtonTextCompact, { color: '#FFFFFF' }]}>Предпросмотр</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  ) : importStep === 'preview' ? (
                    <TouchableOpacity
                      onPress={handleImport}
                      style={[
                        styles.navButton,
                        styles.createButton,
                        isKeyboardVisible && styles.navButtonCompact,
                        { backgroundColor: theme.success }
                      ]}
                    >
                      <Ionicons name="checkmark" size={isKeyboardVisible ? 18 : 20} color="#FFFFFF" />
                      <Text style={[styles.navButtonText, isKeyboardVisible && styles.navButtonTextCompact, { color: '#FFFFFF' }]}>Импортировать</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={[styles.navButton, isKeyboardVisible && styles.navButtonCompact]} />
                  )
                ) : null}
              </View>
            )}
          </KeyboardAvoidingView>

          {/* Date Pickers */}
          {showStartDatePicker && (
            <DatePickerModal
              visible={showStartDatePicker}
              value={startDate}
              onChange={handleStartDateChange}
              onClose={() => setShowStartDatePicker(false)}
              mode="date"
            />
          )}

          {showEndDatePicker && (
            <DatePickerModal
              visible={showEndDatePicker}
              value={endDate}
              onChange={handleEndDateChange}
              onClose={() => setShowEndDatePicker(false)}
              minimumDate={startDate}
              mode="date"
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  modalOverlayDesktop: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    flex: 1,
  },
  containerDesktop: {
    width: 700,
    maxHeight: '90%',
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      web: {
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.3,
        shadowRadius: 60,
        elevation: 24,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  compactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  compactHeaderButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactHeaderTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  progressContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  progressBar: {
    flexDirection: 'row',
    gap: 8,
  },
  progressStep: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  content: {
    flex: 1,
  },
  stepContainer: {
    padding: 20,
  },
  stepContainerCompact: {
    padding: 12,
    paddingTop: 8,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
  },
  stepContent: {
    gap: 16,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  // Method selection
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    gap: 16,
  },
  methodIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodInfo: {
    flex: 1,
  },
  methodTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  methodDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  // Input sections
  inputSection: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  input: {
    fontSize: 15,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
  },
  textArea: {
    fontSize: 15,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 100,
    borderWidth: 1,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    textAlign: 'right',
  },
  // Type cards
  typeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 16,
  },
  typeIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeInfo: {
    flex: 1,
  },
  typeTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 4,
  },
  typeDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  // Type buttons (small, for import)
  typeButtonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeButtonSmall: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  typeButtonSmallText: {
    fontSize: 13,
    fontWeight: '500',
  },
  // Date row
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderRadius: 12,
    gap: 10,
  },
  dateButtonText: {
    fontSize: 15,
  },
  dateSeparator: {
    fontSize: 16,
  },
  // Shift cards
  shiftCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
  },
  shiftHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  shiftLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  timeInputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timeInput: {
    flex: 1,
    fontSize: 16,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    textAlign: 'center',
  },
  timeSeparator: {
    fontSize: 16,
  },
  // Visibility cards
  visibilityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 14,
  },
  visibilityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  visibilityInfo: {
    flex: 1,
  },
  visibilityTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  visibilityDescription: {
    fontSize: 13,
  },
  // Color options
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorOption: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorOptionSelected: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  // Summary
  summaryCard: {
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    width: 80,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  // Import styles
  importIconContainer: {
    alignItems: 'center',
    marginVertical: 24,
  },
  importTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  importDescription: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  selectFileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 10,
    alignSelf: 'center',
  },
  selectFileButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  uploadingContainer: {
    alignItems: 'center',
    gap: 12,
  },
  uploadingText: {
    fontSize: 14,
  },
  supportedFormats: {
    marginTop: 24,
    alignItems: 'center',
  },
  formatsLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  formatsText: {
    fontSize: 12,
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
  },
  fileName: {
    flex: 1,
    fontSize: 14,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 16,
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
  },
  importingText: {
    fontSize: 16,
    marginTop: 16,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 16,
  },
  successDescription: {
    fontSize: 14,
    marginTop: 8,
  },
  // Bottom nav
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    gap: 12,
  },
  bottomNavCompact: {
    paddingHorizontal: 12,
    paddingTop: 8,
    gap: 8,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
    flex: 1,
  },
  navButtonCompact: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 6,
  },
  backButton: {
    borderWidth: 1,
  },
  nextButton: {},
  createButton: {},
  navButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  navButtonTextCompact: {
    fontSize: 14,
  },
});

export default CreateScheduleModal;
