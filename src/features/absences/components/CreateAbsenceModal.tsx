import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  StatusBar,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { useIsWideScreen } from '@shared/hooks/useIsWideScreen';
import { useNotification } from '@shared/contexts/NotificationContext';
import DatePickerModal from '@shared/components/common/DatePickerModal';
import UserSelectorModal from '@shared/components/common/UserSelectorModal';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useAbsenceStore } from '../store/absenceStore';
import { AbsenceTypeIcon } from './AbsenceTypeIcon';
import {
  AbsenceType,
  ABSENCE_TYPES,
  ABSENCE_TYPE_LABELS,
  ABSENCE_TYPE_COLORS,
  CreateAbsenceRequest,
} from '../types/absence.types';

interface CreateAbsenceModalProps {
  visible: boolean;
  onClose: () => void;
  onAbsenceCreated?: (absenceId: number) => void;
  defaultUserId?: number;
}

export const CreateAbsenceModal: React.FC<CreateAbsenceModalProps> = ({
  visible,
  onClose,
  onAbsenceCreated,
  defaultUserId,
}) => {
  const { theme, isDark } = useTheme();
  const isDesktop = useIsWideScreen();
  const insets = useSafeAreaInsets();
  const { showSuccess, showError } = useNotification();

  const { createAbsence, isSubmitting } = useAbsenceStore();

  // Form state
  const [selectedUserId, setSelectedUserId] = useState<number | null>(defaultUserId || null);
  const [selectedType, setSelectedType] = useState<AbsenceType | null>(null);
  const [startDate, setStartDate] = useState(() => new Date());
  const [endDate, setEndDate] = useState(() => new Date());
  const [reason, setReason] = useState('');

  // Date pickers
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showUserPicker, setShowUserPicker] = useState(false);

  // Reset form when modal closes
  useEffect(() => {
    if (!visible) {
      setSelectedUserId(defaultUserId || null);
      setSelectedType(null);
      setStartDate(new Date());
      setEndDate(new Date());
      setReason('');
    }
  }, [visible, defaultUserId]);

  const handleStartDateChange = (_event: any, selectedDate?: Date) => {
    if (selectedDate) {
      setStartDate(selectedDate);
      if (endDate < selectedDate) {
        setEndDate(selectedDate);
      }
    }
  };

  const handleEndDateChange = (_event: any, selectedDate?: Date) => {
    if (selectedDate) {
      setEndDate(selectedDate);
    }
  };

  const handleSubmit = async () => {
    if (!selectedUserId) {
      showError('Выберите сотрудника');
      return;
    }
    if (!selectedType) {
      showError('Выберите тип');
      return;
    }
    if (endDate < startDate) {
      showError('Дата окончания должна быть не раньше даты начала');
      return;
    }

    try {
      // Backend expects ISO timestamp format for dates
      const startDateISO = new Date(
        startDate.getFullYear(),
        startDate.getMonth(),
        startDate.getDate(),
        0, 0, 0
      ).toISOString();
      const endDateISO = new Date(
        endDate.getFullYear(),
        endDate.getMonth(),
        endDate.getDate(),
        23, 59, 59
      ).toISOString();

      const data: CreateAbsenceRequest = {
        user_id: selectedUserId,
        type: selectedType,
        start_date: startDateISO,
        end_date: endDateISO,
        reason: reason.trim() || undefined,
      };

      const absence = await createAbsence(data);
      showSuccess('Успешно создано');
      onAbsenceCreated?.(absence.id);
      onClose();
    } catch (error: any) {
      showError(error.message || 'Не удалось создать');
    }
  };

  const isValid = selectedUserId && selectedType && endDate >= startDate;

  return (
    <Modal
      visible={visible}
      animationType={isDesktop ? 'fade' : 'slide'}
      transparent={isDesktop}
      onRequestClose={onClose}
      presentationStyle={isDesktop ? 'overFullScreen' : 'pageSheet'}
    >
      <View
        style={[
          styles.modalOverlay,
          isDesktop && styles.modalOverlayDesktop,
          { backgroundColor: isDesktop ? 'rgba(0, 0, 0, 0.5)' : theme.card },
        ]}
      >
        <View
          style={[
            styles.container,
            { backgroundColor: theme.card },
            isDesktop && styles.containerDesktop,
          ]}
        >
          <StatusBar
            barStyle={isDark ? 'light-content' : 'dark-content'}
            backgroundColor={theme.card}
          />

          {/* Header */}
          <View
            style={[
              styles.header,
              { backgroundColor: theme.card, borderBottomColor: theme.border },
            ]}
          >
            <TouchableOpacity onPress={onClose} style={styles.headerButton}>
              <Ionicons name="close" size={28} color={theme.textSecondary} />
            </TouchableOpacity>

            <View style={styles.headerCenter}>
              <Text style={[styles.headerTitle, { color: theme.text }]}>
                Новое
              </Text>
            </View>

            <View style={styles.headerButton} />
          </View>

          {/* Content */}
          <ScrollView
            style={[styles.content, { backgroundColor: theme.background }]}
            contentContainerStyle={styles.contentContainer}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* User Selection */}
            <View style={styles.inputSection}>
              <Text style={[styles.inputLabel, { color: theme.text }]}>
                Сотрудник
              </Text>
              <TouchableOpacity
                style={[
                  styles.pickerButton,
                  { backgroundColor: theme.card, borderColor: theme.border },
                ]}
                onPress={() => setShowUserPicker(true)}
              >
                <Ionicons name="person-outline" size={20} color={theme.primary} />
                <Text
                  style={[
                    styles.pickerButtonText,
                    { color: selectedUserId ? theme.text : theme.inputPlaceholder },
                  ]}
                >
                  {selectedUserId ? `Пользователь #${selectedUserId}` : 'Выберите сотрудника'}
                </Text>
                <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Type Selection */}
            <View style={styles.inputSection}>
              <Text style={[styles.inputLabel, { color: theme.text }]}>
                Тип
              </Text>
              <View style={styles.typeGrid}>
                {ABSENCE_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.typeCard,
                      { backgroundColor: theme.card, borderColor: theme.border },
                      selectedType === type && {
                        borderColor: ABSENCE_TYPE_COLORS[type],
                        borderWidth: 2,
                      },
                    ]}
                    onPress={() => setSelectedType(type)}
                  >
                    <AbsenceTypeIcon type={type} size="medium" />
                    <Text
                      style={[
                        styles.typeLabel,
                        { color: theme.text },
                        selectedType === type && { fontWeight: '600' },
                      ]}
                    >
                      {ABSENCE_TYPE_LABELS[type]}
                    </Text>
                    {selectedType === type && (
                      <View
                        style={[
                          styles.typeCheck,
                          { backgroundColor: ABSENCE_TYPE_COLORS[type] },
                        ]}
                      >
                        <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Date Range */}
            <View style={styles.inputSection}>
              <Text style={[styles.inputLabel, { color: theme.text }]}>Период *</Text>
              <View style={styles.dateRow}>
                <TouchableOpacity
                  style={[
                    styles.dateButton,
                    { backgroundColor: theme.card, borderColor: theme.border, flex: 1 },
                  ]}
                  onPress={() => setShowStartDatePicker(true)}
                >
                  <Ionicons name="calendar-outline" size={20} color={theme.primary} />
                  <Text style={[styles.dateButtonText, { color: theme.text }]}>
                    {format(startDate, 'dd MMM yyyy', { locale: ru })}
                  </Text>
                </TouchableOpacity>
                <Text style={[styles.dateSeparator, { color: theme.textSecondary }]}>
                  —
                </Text>
                <TouchableOpacity
                  style={[
                    styles.dateButton,
                    { backgroundColor: theme.card, borderColor: theme.border, flex: 1 },
                  ]}
                  onPress={() => setShowEndDatePicker(true)}
                >
                  <Ionicons name="calendar-outline" size={20} color={theme.primary} />
                  <Text style={[styles.dateButtonText, { color: theme.text }]}>
                    {format(endDate, 'dd MMM yyyy', { locale: ru })}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Reason */}
            <View style={styles.inputSection}>
              <Text style={[styles.inputLabel, { color: theme.text }]}>
                Причина (необязательно)
              </Text>
              <TextInput
                style={[
                  styles.textArea,
                  {
                    backgroundColor: theme.card,
                    borderColor: theme.border,
                    color: theme.text,
                  },
                ]}
                placeholder="Укажите причину..."
                placeholderTextColor={theme.inputPlaceholder}
                value={reason}
                onChangeText={setReason}
                maxLength={500}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
              <Text style={[styles.charCount, { color: theme.textTertiary }]}>
                {reason.length}/500
              </Text>
            </View>
          </ScrollView>

          {/* Bottom Actions */}
          <View
            style={[
              styles.bottomActions,
              {
                backgroundColor: theme.card,
                borderTopColor: theme.border,
                paddingBottom: isDesktop ? 20 : Math.max(insets.bottom, 16),
              },
            ]}
          >
            <TouchableOpacity
              style={[styles.cancelButton, { borderColor: theme.border }]}
              onPress={onClose}
            >
              <Text style={[styles.cancelButtonText, { color: theme.text }]}>
                Отмена
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.submitButton,
                { backgroundColor: theme.primary },
                !isValid && { opacity: 0.5 },
              ]}
              onPress={handleSubmit}
              disabled={!isValid || isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                  <Text style={styles.submitButtonText}>Создать</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

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

          {/* User Picker */}
          <UserSelectorModal
            visible={showUserPicker}
            onClose={() => setShowUserPicker(false)}
            selectedUserIds={selectedUserId ? [selectedUserId] : []}
            onSelectionChange={(userIds) => {
              if (userIds.length > 0) {
                setSelectedUserId(userIds[0]);
              }
              setShowUserPicker(false);
            }}
            multiSelect={false}
            title="Выберите сотрудника"
            mode="radio"
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
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
    width: 500,
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
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    gap: 20,
  },
  inputSection: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderRadius: 12,
    gap: 10,
  },
  pickerButtonText: {
    flex: 1,
    fontSize: 15,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  typeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
    minWidth: '45%',
    flex: 1,
  },
  typeLabel: {
    fontSize: 13,
    flex: 1,
  },
  typeCheck: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  textArea: {
    fontSize: 15,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 80,
    borderWidth: 1,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    textAlign: 'right',
  },
  bottomActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
