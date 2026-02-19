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
import { useAnimationType } from '@shared/hooks/useAnimationType';
import { useNotification } from '@shared/contexts/NotificationContext';
import DatePickerModal from '@shared/components/common/DatePickerModal';
import UserSelectorModal from '@shared/components/common/UserSelectorModal';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useAbsenceStore } from '../store/absenceStore';
import type {
  Substitution,
  CreateSubstitutionRequest,
  UpdateSubstitutionRequest,
} from '../types/absence.types';

interface AddSubstitutionModalProps {
  visible: boolean;
  onClose: () => void;
  absenceId: number;
  absenceUserId: number;
  absenceStartDate: string;
  absenceEndDate: string;
  editingSubstitution?: Substitution | null;
  onSuccess?: () => void;
}

export const AddSubstitutionModal: React.FC<AddSubstitutionModalProps> = ({
  visible,
  onClose,
  absenceId,
  absenceUserId,
  absenceStartDate,
  absenceEndDate,
  editingSubstitution,
  onSuccess,
}) => {
  const { theme, isDark } = useTheme();
  const isDesktop = useIsWideScreen();
  const animationType = useAnimationType(isDesktop ? 'fade' : 'slide');
  const insets = useSafeAreaInsets();
  const { showSuccess, showError } = useNotification();

  const {
    createSubstitution,
    updateSubstitution,
    isSubmittingSubstitution,
  } = useAbsenceStore();

  // Form state
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedUserName, setSelectedUserName] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(() => new Date());
  const [endDate, setEndDate] = useState(() => new Date());
  const [note, setNote] = useState('');

  // Pickers
  const [showUserPicker, setShowUserPicker] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  // Parse absence dates for constraints
  const parsedAbsenceStart = parseISO(absenceStartDate);
  const parsedAbsenceEnd = parseISO(absenceEndDate);
  const minDate = new Date(
    parsedAbsenceStart.getUTCFullYear(),
    parsedAbsenceStart.getUTCMonth(),
    parsedAbsenceStart.getUTCDate()
  );
  const maxDate = new Date(
    parsedAbsenceEnd.getUTCFullYear(),
    parsedAbsenceEnd.getUTCMonth(),
    parsedAbsenceEnd.getUTCDate()
  );

  // Initialize form when modal opens or editing changes
  useEffect(() => {
    if (visible) {
      if (editingSubstitution) {
        setSelectedUserId(editingSubstitution.substitute_id);
        setSelectedUserName(
          editingSubstitution.substitute?.name ||
          (editingSubstitution.substitute?.first_name && editingSubstitution.substitute?.last_name
            ? `${editingSubstitution.substitute.last_name} ${editingSubstitution.substitute.first_name}`
            : null)
        );
        const parsedStart = parseISO(editingSubstitution.start_date);
        const parsedEnd = parseISO(editingSubstitution.end_date);
        setStartDate(new Date(parsedStart.getUTCFullYear(), parsedStart.getUTCMonth(), parsedStart.getUTCDate()));
        setEndDate(new Date(parsedEnd.getUTCFullYear(), parsedEnd.getUTCMonth(), parsedEnd.getUTCDate()));
        setNote(editingSubstitution.note || '');
      } else {
        setSelectedUserId(null);
        setSelectedUserName(null);
        setStartDate(minDate);
        setEndDate(maxDate);
        setNote('');
      }
    }
  }, [visible, editingSubstitution]);

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
      showError('Выберите замещающего сотрудника');
      return;
    }
    if (endDate < startDate) {
      showError('Дата окончания должна быть не раньше даты начала');
      return;
    }

    try {
      const startDateStr = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`;
      const endDateStr = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;

      const startDateISO = `${startDateStr}T00:00:00.000Z`;
      const endDateISO = `${endDateStr}T23:59:59.000Z`;

      if (editingSubstitution) {
        const data: UpdateSubstitutionRequest = {
          substitute_id: selectedUserId,
          start_date: startDateISO,
          end_date: endDateISO,
          note: note.trim() || undefined,
        };
        await updateSubstitution(absenceId, editingSubstitution.id, data);
        showSuccess('Замещение обновлено');
      } else {
        const data: CreateSubstitutionRequest = {
          substitute_id: selectedUserId,
          start_date: startDateISO,
          end_date: endDateISO,
          note: note.trim() || undefined,
        };
        await createSubstitution(absenceId, data);
        showSuccess('Замещение добавлено');
      }
      onSuccess?.();
      onClose();
    } catch (error: any) {
      showError(error.message || 'Не удалось сохранить замещение');
    }
  };

  const isValid = selectedUserId && endDate >= startDate;
  const isEditing = !!editingSubstitution;

  return (
    <Modal
      visible={visible}
      animationType={animationType}
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
                {isEditing ? 'Редактирование' : 'Новое замещение'}
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
                Замещающий сотрудник *
              </Text>
              <TouchableOpacity
                style={[
                  styles.selectorButton,
                  { backgroundColor: theme.card, borderColor: theme.border },
                  !!selectedUserId && { borderColor: theme.primary, borderWidth: 2 },
                ]}
                onPress={() => setShowUserPicker(true)}
              >
                <Ionicons
                  name={selectedUserId ? 'person' : 'person-outline'}
                  size={20}
                  color={selectedUserId ? theme.primary : theme.textSecondary}
                />
                <Text
                  style={[
                    styles.selectorText,
                    { color: selectedUserId ? theme.text : theme.textSecondary },
                  ]}
                >
                  {selectedUserName || (selectedUserId ? `Сотрудник #${selectedUserId}` : 'Выберите сотрудника')}
                </Text>
                <Ionicons name="chevron-forward" size={20} color={theme.textTertiary} />
              </TouchableOpacity>
            </View>

            {/* Date Range */}
            <View style={styles.inputSection}>
              <Text style={[styles.inputLabel, { color: theme.text }]}>Период замещения *</Text>
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
              <Text style={[styles.dateHint, { color: theme.textTertiary }]}>
                В пределах периода отсутствия: {format(minDate, 'dd MMM', { locale: ru })} — {format(maxDate, 'dd MMM', { locale: ru })}
              </Text>
            </View>

            {/* Note */}
            <View style={styles.inputSection}>
              <Text style={[styles.inputLabel, { color: theme.text }]}>
                Примечание (необязательно)
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
                placeholder="Например: замещает на первую неделю"
                placeholderTextColor={theme.inputPlaceholder}
                value={note}
                onChangeText={setNote}
                maxLength={200}
                multiline
                numberOfLines={2}
                textAlignVertical="top"
              />
              <Text style={[styles.charCount, { color: theme.textTertiary }]}>
                {note.length}/200
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
                paddingBottom: isDesktop ? 20 : Math.max(insets.bottom, Platform.OS === 'android' ? 74 : 16),
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
              disabled={!isValid || isSubmittingSubstitution}
            >
              {isSubmittingSubstitution ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                  <Text style={styles.submitButtonText}>
                    {isEditing ? 'Сохранить' : 'Добавить'}
                  </Text>
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
              minimumDate={minDate}
              maximumDate={maxDate}
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
              maximumDate={maxDate}
              mode="date"
            />
          )}

          {/* User Picker */}
          <UserSelectorModal
            visible={showUserPicker}
            onClose={() => setShowUserPicker(false)}
            selectedUserIds={selectedUserId ? [selectedUserId] : []}
            onSelectionChange={(userIds, selectedUsers) => {
              if (userIds.length > 0) {
                setSelectedUserId(userIds[0]);
                setSelectedUserName(selectedUsers?.[0]?.name || null);
              }
              setShowUserPicker(false);
            }}
            multiSelect={false}
            title="Выберите замещающего"
            mode="radio"
            includeCurrentUser={false}
            excludeUserIds={[absenceUserId]}
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
    width: 480,
    maxHeight: '85%',
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
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderRadius: 12,
    gap: 10,
  },
  selectorText: {
    flex: 1,
    fontSize: 15,
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
  dateHint: {
    fontSize: 12,
    marginTop: 4,
  },
  textArea: {
    fontSize: 15,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 60,
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
