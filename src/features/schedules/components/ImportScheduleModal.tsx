import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { format, addMonths } from 'date-fns';
import { fileApi } from '@api/fileApi';
import { useTheme } from '@shared/hooks/useTheme';
import { useAnimationType } from '@shared/hooks/useAnimationType';
import DatePickerModal from '@shared/components/common/DatePickerModal';
import { useScheduleImport } from '../hooks/useScheduleImport';
import { ImportPreview } from './ImportPreview';
import {
  SCHEDULE_TYPE_LABELS,
  type ScheduleType,
  type ImportScheduleRequest,
  type UserMappingOverride,
} from '../types/schedule.types';

interface ImportScheduleModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (scheduleId: number) => void;
}

type ImportStep = 'select' | 'configure' | 'preview' | 'importing' | 'success';

export const ImportScheduleModal: React.FC<ImportScheduleModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const { theme } = useTheme();
  const animationType = useAnimationType('slide');
  const {
    isLoading,
    preview,
    result,
    error,
    loadPreview,
    executeImport,
    clearPreview,
    clearError,
  } = useScheduleImport();

  const [step, setStep] = useState<ImportStep>('select');
  const [selectedFile, setSelectedFile] = useState<{
    uri: string;
    name: string;
    type: string;
  } | null>(null);
  const [uploadedFileId, setUploadedFileId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scheduleType, setScheduleType] = useState<ScheduleType>('paid_services');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(
    format(addMonths(new Date(), 1), 'yyyy-MM-dd')
  );
  const [morningStart, setMorningStart] = useState('10:00');
  const [morningEnd, setMorningEnd] = useState('14:00');
  const [eveningStart, setEveningStart] = useState('14:30');
  const [eveningEnd, setEveningEnd] = useState('18:00');
  const [showMorningStartPicker, setShowMorningStartPicker] = useState(false);
  const [showMorningEndPicker, setShowMorningEndPicker] = useState(false);
  const [showEveningStartPicker, setShowEveningStartPicker] = useState(false);
  const [showEveningEndPicker, setShowEveningEndPicker] = useState(false);

  // User mapping overrides state
  const [userMappingOverrides, setUserMappingOverrides] = useState<
    Map<string, { userId: number; userName: string }>
  >(new Map());

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!visible) {
      setStep('select');
      setSelectedFile(null);
      setUploadedFileId(null);
      setTitle('');
      setDescription('');
      setScheduleType('paid_services');
      setStartDate(format(new Date(), 'yyyy-MM-dd'));
      setEndDate(format(addMonths(new Date(), 1), 'yyyy-MM-dd'));
      setMorningStart('10:00');
      setMorningEnd('14:00');
      setEveningStart('14:30');
      setEveningEnd('18:00');
      setUserMappingOverrides(new Map());
      clearPreview();
      clearError();
    }
  }, [visible, clearPreview, clearError]);

  // Handler for user mapping changes from ImportPreview
  const handleUserMappingChange = useCallback(
    (originalName: string, userId: number | null, userName: string | null) => {
      setUserMappingOverrides((prev) => {
        const newMap = new Map(prev);
        if (userId === null) {
          // Remove override
          newMap.delete(originalName);
        } else {
          // Add/update override
          newMap.set(originalName, { userId, userName: userName || '' });
        }
        return newMap;
      });
    },
    []
  );

  const handleScheduleTypeChange = useCallback((type: ScheduleType) => {
    setScheduleType(type);
    if (type === 'work' || type === 'on_duty') {
      setMorningStart('09:00');
      setMorningEnd('14:00');
      setEveningStart('14:00');
      setEveningEnd('20:00');
    } else {
      setMorningStart('10:00');
      setMorningEnd('14:00');
      setEveningStart('14:30');
      setEveningEnd('18:00');
    }
  }, []);

  const parseTimeToDate = (timeStr: string): Date => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(hours || 0, minutes || 0, 0, 0);
    return date;
  };

  const formatDateToTime = (date: Date): string => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

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

        // Extract title from filename
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
        setTitle(nameWithoutExt);

        // Upload file immediately
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
          // Use file_name (UUID) as file_id for the import API
          setUploadedFileId(uploadedFile.file_name);
          setStep('configure');
        } catch (uploadError) {
          console.error('Upload error:', uploadError);
          clearError();
        } finally {
          setIsUploading(false);
          setUploadProgress(0);
        }
      }
    } catch (err) {
      console.error('Document pick error:', err);
    }
  }, [clearError]);

  const handleLoadPreview = useCallback(async () => {
    if (!uploadedFileId) return;

    // Convert dates to ISO 8601 format with time
    const startDateISO = `${startDate}T00:00:00Z`;
    const endDateISO = `${endDate}T23:59:59Z`;

    const request: ImportScheduleRequest = {
      file_id: uploadedFileId,
      title,
      description,
      type: scheduleType,
      start_date: startDateISO,
      end_date: endDateISO,
      morning_start: morningStart,
      morning_end: morningEnd,
      evening_start: eveningStart,
      evening_end: eveningEnd,
      preview: true,
    };

    const previewResult = await loadPreview(request);
    if (previewResult) {
      setStep('preview');
    }
  }, [
    uploadedFileId,
    title,
    description,
    scheduleType,
    startDate,
    endDate,
    morningStart,
    morningEnd,
    eveningStart,
    eveningEnd,
    loadPreview,
  ]);

  const handleImport = useCallback(async () => {
    if (!uploadedFileId) return;

    setStep('importing');

    // Convert dates to ISO 8601 format with time
    const startDateISO = `${startDate}T00:00:00Z`;
    const endDateISO = `${endDate}T23:59:59Z`;

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
      type: scheduleType,
      start_date: startDateISO,
      end_date: endDateISO,
      morning_start: morningStart,
      morning_end: morningEnd,
      evening_start: eveningStart,
      evening_end: eveningEnd,
      preview: false,
      user_mapping_overrides: overrides.length > 0 ? overrides : undefined,
    };

    const importResult = await executeImport(request);
    if (importResult) {
      setStep('success');
      setTimeout(() => {
        onSuccess(importResult.schedule.id);
        onClose();
      }, 1500);
    } else {
      setStep('preview');
    }
  }, [
    uploadedFileId,
    title,
    description,
    scheduleType,
    startDate,
    endDate,
    morningStart,
    morningEnd,
    eveningStart,
    eveningEnd,
    userMappingOverrides,
    executeImport,
    onSuccess,
    onClose,
  ]);

  const handleBack = useCallback(() => {
    if (step === 'configure') {
      setStep('select');
      setSelectedFile(null);
      setUploadedFileId(null);
    } else if (step === 'preview') {
      setStep('configure');
    }
  }, [step]);

  const renderSelectStep = () => (
    <View style={styles.stepContent}>
      <View style={styles.iconContainer}>
        <Ionicons name="document-text" size={64} color={theme.primary} />
      </View>
      <Text style={[styles.stepTitle, { color: theme.text }]}>
        Импорт графика из Word
      </Text>
      <Text style={[styles.stepDescription, { color: theme.textSecondary }]}>
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
          style={[styles.selectButton, { backgroundColor: theme.primary }]}
          onPress={handleSelectFile}
        >
          <Ionicons name="folder-open" size={24} color="#FFFFFF" />
          <Text style={styles.selectButtonText}>Выбрать файл</Text>
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

  const renderConfigureStep = () => (
    <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
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
      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: theme.text }]}>
          Название графика *
        </Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: theme.input,
              borderColor: theme.inputBorder,
              color: theme.text,
            },
          ]}
          value={title}
          onChangeText={setTitle}
          placeholder="Введите название"
          placeholderTextColor={theme.inputPlaceholder}
        />
      </View>

      {/* Description */}
      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: theme.text }]}>Описание</Text>
        <TextInput
          style={[
            styles.input,
            styles.textArea,
            {
              backgroundColor: theme.input,
              borderColor: theme.inputBorder,
              color: theme.text,
            },
          ]}
          value={description}
          onChangeText={setDescription}
          placeholder="Описание графика (опционально)"
          placeholderTextColor={theme.inputPlaceholder}
          multiline
          numberOfLines={3}
        />
      </View>

      {/* Type */}
      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: theme.text }]}>Тип графика</Text>
        <View style={styles.typeButtons}>
          {(Object.keys(SCHEDULE_TYPE_LABELS) as ScheduleType[]).map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.typeButton,
                {
                  backgroundColor:
                    scheduleType === type
                      ? theme.primary
                      : theme.backgroundSecondary,
                  borderColor:
                    scheduleType === type ? theme.primary : theme.border,
                },
              ]}
              onPress={() => handleScheduleTypeChange(type)}
            >
              <Text
                style={[
                  styles.typeButtonText,
                  { color: scheduleType === type ? '#FFFFFF' : theme.text },
                ]}
              >
                {SCHEDULE_TYPE_LABELS[type]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Date range */}
      <View style={styles.dateRow}>
        <View style={[styles.formGroup, { flex: 1 }]}>
          <Text style={[styles.label, { color: theme.text }]}>Начало</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.input,
                borderColor: theme.inputBorder,
                color: theme.text,
              },
            ]}
            value={startDate}
            onChangeText={setStartDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={theme.inputPlaceholder}
          />
        </View>
        <View style={styles.dateSeparator} />
        <View style={[styles.formGroup, { flex: 1 }]}>
          <Text style={[styles.label, { color: theme.text }]}>Конец</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.input,
                borderColor: theme.inputBorder,
                color: theme.text,
              },
            ]}
            value={endDate}
            onChangeText={setEndDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={theme.inputPlaceholder}
          />
        </View>
      </View>

      {/* Shift times */}
      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: theme.text }]}>Время смен</Text>

        <View
          style={[
            styles.shiftCard,
            { backgroundColor: theme.backgroundSecondary, borderColor: theme.border },
          ]}
        >
          <View style={styles.shiftHeader}>
            <Ionicons name="sunny-outline" size={20} color="#F59E0B" />
            <Text style={[styles.shiftLabel, { color: theme.text }]}>Утренняя смена</Text>
          </View>
          <View style={styles.timeInputGroup}>
            <TouchableOpacity
              style={[
                styles.timeInput,
                {
                  backgroundColor: theme.input,
                  borderColor: theme.inputBorder,
                },
              ]}
              onPress={() => setShowMorningStartPicker(true)}
            >
              <Text style={[styles.timeInputText, { color: theme.text }]}>{morningStart}</Text>
            </TouchableOpacity>
            <Text style={[styles.timeSeparator, { color: theme.textSecondary }]}>—</Text>
            <TouchableOpacity
              style={[
                styles.timeInput,
                {
                  backgroundColor: theme.input,
                  borderColor: theme.inputBorder,
                },
              ]}
              onPress={() => setShowMorningEndPicker(true)}
            >
              <Text style={[styles.timeInputText, { color: theme.text }]}>{morningEnd}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View
          style={[
            styles.shiftCard,
            { backgroundColor: theme.backgroundSecondary, borderColor: theme.border },
          ]}
        >
          <View style={styles.shiftHeader}>
            <Ionicons name="moon-outline" size={20} color="#8B5CF6" />
            <Text style={[styles.shiftLabel, { color: theme.text }]}>Вечерняя смена</Text>
          </View>
          <View style={styles.timeInputGroup}>
            <TouchableOpacity
              style={[
                styles.timeInput,
                {
                  backgroundColor: theme.input,
                  borderColor: theme.inputBorder,
                },
              ]}
              onPress={() => setShowEveningStartPicker(true)}
            >
              <Text style={[styles.timeInputText, { color: theme.text }]}>{eveningStart}</Text>
            </TouchableOpacity>
            <Text style={[styles.timeSeparator, { color: theme.textSecondary }]}>—</Text>
            <TouchableOpacity
              style={[
                styles.timeInput,
                {
                  backgroundColor: theme.input,
                  borderColor: theme.inputBorder,
                },
              ]}
              onPress={() => setShowEveningEndPicker(true)}
            >
              <Text style={[styles.timeInputText, { color: theme.text }]}>{eveningEnd}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Error */}
      {error && (
        <View
          style={[
            styles.errorBanner,
            { backgroundColor: theme.error + '20', borderColor: theme.error },
          ]}
        >
          <Ionicons name="alert-circle" size={20} color={theme.error} />
          <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>
        </View>
      )}

      {/* Preview button */}
      <TouchableOpacity
        style={[
          styles.previewButton,
          {
            backgroundColor: theme.primary,
            opacity: !title || isLoading ? 0.5 : 1,
          },
        ]}
        onPress={handleLoadPreview}
        disabled={!title || isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <>
            <Ionicons name="eye" size={20} color="#FFFFFF" />
            <Text style={styles.previewButtonText}>Предпросмотр</Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );

  const renderPreviewStep = () => (
    <View style={styles.stepContent}>
      {preview && (
        <ImportPreview
          preview={preview}
          editable={true}
          userMappingOverrides={userMappingOverrides}
          onUserMappingChange={handleUserMappingChange}
        />
      )}

      {error && (
        <View
          style={[
            styles.errorBanner,
            { backgroundColor: theme.error + '20', borderColor: theme.error },
          ]}
        >
          <Ionicons name="alert-circle" size={20} color={theme.error} />
          <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.importButton, { backgroundColor: theme.success }]}
        onPress={handleImport}
      >
        <Ionicons name="checkmark" size={20} color="#FFFFFF" />
        <Text style={styles.importButtonText}>Импортировать</Text>
      </TouchableOpacity>
    </View>
  );

  const renderImportingStep = () => (
    <View style={[styles.stepContent, styles.centerContent]}>
      <ActivityIndicator size="large" color={theme.primary} />
      <Text style={[styles.importingText, { color: theme.text }]}>
        Импортируем график...
      </Text>
    </View>
  );

  const renderSuccessStep = () => (
    <View style={[styles.stepContent, styles.centerContent]}>
      <Ionicons name="checkmark-circle" size={64} color={theme.success} />
      <Text style={[styles.successTitle, { color: theme.text }]}>
        Импорт завершён!
      </Text>
      {result && (
        <Text style={[styles.successDescription, { color: theme.textSecondary }]}>
          Создано {result.entries_count} записей
        </Text>
      )}
    </View>
  );

  const renderContent = () => {
    switch (step) {
      case 'select':
        return renderSelectStep();
      case 'configure':
        return renderConfigureStep();
      case 'preview':
        return renderPreviewStep();
      case 'importing':
        return renderImportingStep();
      case 'success':
        return renderSuccessStep();
      default:
        return null;
    }
  };

  const canGoBack = step === 'configure' || step === 'preview';

  return (
    <Modal
      visible={visible}
      animationType={animationType}
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          {canGoBack ? (
            <TouchableOpacity onPress={handleBack} style={styles.headerButton}>
              <Ionicons name="arrow-back" size={24} color={theme.text} />
            </TouchableOpacity>
          ) : (
            <View style={styles.headerButton} />
          )}

          <Text style={[styles.headerTitle, { color: theme.text }]}>
            {step === 'select' && 'Импорт графика'}
            {step === 'configure' && 'Настройка'}
            {step === 'preview' && 'Предпросмотр'}
            {step === 'importing' && 'Импорт'}
            {step === 'success' && 'Готово'}
          </Text>

          <TouchableOpacity onPress={onClose} style={styles.headerButton}>
            <Ionicons name="close" size={24} color={theme.text} />
          </TouchableOpacity>
        </View>

        {/* Content */}
        {renderContent()}
      </View>

      {/* Time Pickers */}
      {showMorningStartPicker && (
        <DatePickerModal
          visible={showMorningStartPicker}
          value={parseTimeToDate(morningStart)}
          onChange={(_event: any, selectedDate?: Date) => {
            if (selectedDate) setMorningStart(formatDateToTime(selectedDate));
          }}
          onClose={() => setShowMorningStartPicker(false)}
          mode="time"
        />
      )}
      {showMorningEndPicker && (
        <DatePickerModal
          visible={showMorningEndPicker}
          value={parseTimeToDate(morningEnd)}
          onChange={(_event: any, selectedDate?: Date) => {
            if (selectedDate) setMorningEnd(formatDateToTime(selectedDate));
          }}
          onClose={() => setShowMorningEndPicker(false)}
          mode="time"
        />
      )}
      {showEveningStartPicker && (
        <DatePickerModal
          visible={showEveningStartPicker}
          value={parseTimeToDate(eveningStart)}
          onChange={(_event: any, selectedDate?: Date) => {
            if (selectedDate) setEveningStart(formatDateToTime(selectedDate));
          }}
          onClose={() => setShowEveningStartPicker(false)}
          mode="time"
        />
      )}
      {showEveningEndPicker && (
        <DatePickerModal
          visible={showEveningEndPicker}
          value={parseTimeToDate(eveningEnd)}
          onChange={(_event: any, selectedDate?: Date) => {
            if (selectedDate) setEveningEnd(formatDateToTime(selectedDate));
          }}
          onClose={() => setShowEveningEndPicker(false)}
          mode="time"
        />
      )}
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  stepContent: {
    flex: 1,
    padding: 16,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    marginVertical: 24,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  stepDescription: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 10,
    alignSelf: 'center',
  },
  selectButtonText: {
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
    marginBottom: 20,
    gap: 10,
  },
  fileName: {
    flex: 1,
    fontSize: 14,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  typeButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  typeButtonText: {
    fontSize: 13,
    fontWeight: '500',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  dateSeparator: {
    width: 16,
  },
  shiftCard: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  shiftHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  shiftLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  timeInputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  timeInputText: {
    fontSize: 14,
    textAlign: 'center' as const,
  },
  timeSeparator: {
    marginHorizontal: 8,
    fontSize: 16,
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
  previewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 24,
    gap: 8,
  },
  previewButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  importButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 16,
    gap: 8,
  },
  importButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
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
});
