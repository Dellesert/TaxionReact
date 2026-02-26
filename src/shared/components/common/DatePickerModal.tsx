import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Modal, Platform, TouchableWithoutFeedback, Animated, StyleSheet } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useTheme } from '@shared/hooks/useTheme';
import { useAnimationType } from '@shared/hooks/useAnimationType';

// Динамический импорт для веба
let ReactDatePicker: any = null;
let registerLocale: any = null;
let ruLocale: any = null;

if (Platform.OS === 'web') {
  try {
    ReactDatePicker = require('react-datepicker').default;
    registerLocale = require('react-datepicker').registerLocale;
    ruLocale = require('date-fns/locale/ru').ru;
    require('react-datepicker/dist/react-datepicker.css');
    require('../../../styles/datepicker-custom.css');

    // Регистрируем русскую локаль
    if (registerLocale && ruLocale) {
      registerLocale('ru', ruLocale);
    }
  } catch (e) {
    console.warn('react-datepicker not available');
  }
}

interface DatePickerModalProps {
  visible: boolean;
  value: Date;
  onChange: (event: any, selectedDate?: Date) => void;
  onClose: () => void;
  minimumDate?: Date;
  maximumDate?: Date;
  mode?: 'date' | 'time' | 'datetime';
}

const DatePickerModal: React.FC<DatePickerModalProps> = ({
  visible,
  value,
  onChange,
  onClose,
  minimumDate,
  maximumDate,
  mode = 'datetime',
}) => {
  const { theme } = useTheme();
  const animationType = useAnimationType('fade');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    if (visible) {

      // Анимация появления
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Сброс значений для следующего открытия
      fadeAnim.setValue(0);
      slideAnim.setValue(50);
    }
  }, [visible]);

  // iOS: показываем модальное окно с кнопкой "Готово"
  if (Platform.OS === 'ios') {
    return (
      <Modal
        transparent
        animationType="none"
        visible={visible}
        onRequestClose={onClose}
      >
        <TouchableWithoutFeedback onPress={onClose}>
          <Animated.View style={{
            flex: 1,
            justifyContent: 'flex-end',
            backgroundColor: 'rgba(0,0,0,0.5)',
            opacity: fadeAnim,
          }}>
            <TouchableWithoutFeedback>
              <Animated.View style={{
                backgroundColor: theme.card,
                paddingBottom: 20,
                transform: [{ translateY: slideAnim }],
              }}>
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', padding: 12, borderBottomWidth: 1, borderBottomColor: theme.border }}>
                  <TouchableOpacity onPress={onClose}>
                    <Text style={{ color: theme.primary, fontSize: 16, fontWeight: '600' }}>Готово</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={value}
                  mode={mode}
                  display="spinner"
                  onChange={onChange}
                  minimumDate={minimumDate}
                  maximumDate={maximumDate}
                  textColor={theme.text}
                />
              </Animated.View>
            </TouchableWithoutFeedback>
          </Animated.View>
        </TouchableWithoutFeedback>
      </Modal>
    );
  }

  // Android: используем императивный API для избежания нативного crash при dismiss
  const hasOpenedRef = useRef(false);

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    if (!visible) {
      hasOpenedRef.current = false;
      return;
    }

    if (hasOpenedRef.current) return;
    hasOpenedRef.current = true;

    const openPicker = () => {
      try {
        if (mode === 'datetime') {
          // Для datetime: сначала открываем date picker, затем time picker
          DateTimePickerAndroid.open({
            value: value,
            mode: 'date',
            minimumDate: minimumDate,
            maximumDate: maximumDate,
            onChange: (dateEvent, selectedDate) => {
              if (dateEvent.type === 'dismissed') {
                onClose();
                return;
              }

              if (dateEvent.type === 'set' && selectedDate) {
                // Для time picker используем выбранную дату с текущим временем как начальное значение
                const initialTimeValue = new Date(selectedDate);
                const now = new Date();
                initialTimeValue.setHours(now.getHours());
                initialTimeValue.setMinutes(now.getMinutes());

                // Теперь открываем time picker
                DateTimePickerAndroid.open({
                  value: initialTimeValue,
                  mode: 'time',
                  is24Hour: true,
                  onChange: (timeEvent, selectedTime) => {
                    if (timeEvent.type === 'dismissed') {
                      // Пользователь отменил выбор времени - полная отмена
                      onClose();
                    } else if (timeEvent.type === 'set' && selectedTime) {
                      // Комбинируем дату и время
                      const combined = new Date(selectedDate);
                      combined.setHours(selectedTime.getHours());
                      combined.setMinutes(selectedTime.getMinutes());
                      combined.setSeconds(0);
                      combined.setMilliseconds(0);

                      // Если есть minimumDate и результат в прошлом, корректируем
                      if (minimumDate && combined < minimumDate) {
                        // Используем minimumDate + 1 минута
                        const corrected = new Date(minimumDate);
                        corrected.setMinutes(corrected.getMinutes() + 1);
                        corrected.setSeconds(0);
                        corrected.setMilliseconds(0);
                        onChange({ type: 'set' }, corrected);
                      } else {
                        onChange({ type: 'set' }, combined);
                      }
                      onClose();
                    }
                  },
                });
              }
            },
          });
        } else {
          // Одиночный режим (date или time)
          DateTimePickerAndroid.open({
            value: value,
            mode: mode,
            is24Hour: true,
            minimumDate: mode === 'date' ? minimumDate : undefined,
            maximumDate: mode === 'date' ? maximumDate : undefined,
            onChange: (event, selectedDate) => {
              if (event.type === 'set' && selectedDate) {
                onChange(event, selectedDate);
              }
              onClose();
            },
          });
        }
      } catch (error) {
        onClose();
      }
    };

    openPicker();
  }, [visible, value, mode, minimumDate, maximumDate, onChange, onClose]);

  // Cleanup: закрываем picker при размонтировании
  useEffect(() => {
    return () => {
      if (Platform.OS === 'android') {
        try {
          DateTimePickerAndroid.dismiss('date');
          DateTimePickerAndroid.dismiss('time');
        } catch (e) {
          // Игнорируем ошибки dismiss
        }
      }
    };
  }, []);

  if (Platform.OS === 'android') {
    // Императивный API создаёт нативные диалоги, React компонент не нужен
    return null;
  }

  // Web: показываем модальное окно с react-datepicker
  if (Platform.OS === 'web' && visible && ReactDatePicker) {
    const handleDateChange = (date: Date | null) => {
      if (date) {
        onChange({}, date);
      }
    };

    return (
      <Modal
        transparent
        animationType={animationType}
        visible={visible}
        onRequestClose={onClose}
      >
        <TouchableWithoutFeedback onPress={onClose}>
          <Animated.View style={[styles.webOverlay, { opacity: fadeAnim }]}>
            <TouchableWithoutFeedback>
              <Animated.View style={[
                styles.webModal,
                { backgroundColor: theme.card, transform: [{ translateY: slideAnim }] }
              ]}>
                <View style={styles.webHeader}>
                  <Text style={[styles.webTitle, { color: theme.text }]}>
                    {mode === 'date' ? 'Выберите дату' : mode === 'time' ? 'Выберите время' : 'Выберите дату и время'}
                  </Text>
                </View>

                <View style={styles.webContent}>
                  <ReactDatePicker
                    selected={value}
                    onChange={handleDateChange}
                    inline
                    showTimeSelect={mode !== 'date'}
                    showTimeSelectOnly={mode === 'time'}
                    timeIntervals={15}
                    timeCaption="Время"
                    dateFormat={mode === 'date' ? 'dd.MM.yyyy' : mode === 'time' ? 'HH:mm' : 'dd.MM.yyyy HH:mm'}
                    minDate={minimumDate}
                    maxDate={maximumDate}
                    locale="ru"
                    calendarClassName={theme.isDark ? 'dark-calendar' : ''}
                  />
                </View>

                <View style={styles.webFooter}>
                  <TouchableOpacity onPress={onClose} style={[styles.webButton, { backgroundColor: theme.primary }]}>
                    <Text style={styles.webButtonText}>Готово</Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            </TouchableWithoutFeedback>
          </Animated.View>
        </TouchableWithoutFeedback>
      </Modal>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  webOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  webModal: {
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  webHeader: {
    marginBottom: 8,
  },
  webTitle: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  webContent: {
    alignItems: 'center',
  },
  webFooter: {
    marginTop: 8,
  },
  webButton: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  webButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
});

export default DatePickerModal;
