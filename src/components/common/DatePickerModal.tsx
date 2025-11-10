import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, Platform, TouchableWithoutFeedback, Animated, StyleSheet } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '@hooks/useTheme';

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
    require('../../styles/datepicker-custom.css');

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
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  // Для Android: используем ref чтобы отслеживать, был ли обработан onChange
  const isProcessingRef = useRef(false);

  useEffect(() => {
    if (visible) {
      // Сбрасываем флаг обработки при открытии
      isProcessingRef.current = false;

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

  // Android: возвращаем только DateTimePicker (он сам показывает нативный диалог)
  if (Platform.OS === 'android' && visible) {
    const handleAndroidChange = (event: any, selectedDate?: Date) => {
      // Предотвращаем множественные вызовы
      if (isProcessingRef.current) {
        return;
      }
      isProcessingRef.current = true;

      // Откладываем вызовы для предотвращения конфликта с нативным dismiss
      // Используем более длинную задержку для гарантии завершения нативного кода
      setTimeout(() => {
        try {
          // Если пользователь подтвердил выбор (нажал OK), передаем дату
          if (event.type === 'set' && selectedDate) {
            onChange(event, selectedDate);
          }
        } catch (error) {
          // Подавляем любые ошибки при вызове onChange
          console.log('[DatePicker] Suppressed error in onChange:', error);
        }

        // Закрываем модальное окно
        try {
          onClose();
        } catch (error) {
          // Подавляем любые ошибки при закрытии
          console.log('[DatePicker] Suppressed error in onClose:', error);
        }
      }, 200);
    };

    try {
      return (
        <DateTimePicker
          value={value}
          mode={mode}
          display="default"
          onChange={handleAndroidChange}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
        />
      );
    } catch (error) {
      console.log('[DatePicker] Suppressed error in render:', error);
      return null;
    }
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
        animationType="fade"
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
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  webModal: {
    borderRadius: 12,
    padding: 20,
    minWidth: 320,
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  webHeader: {
    marginBottom: 16,
  },
  webTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  webContent: {
    alignItems: 'center',
  },
  webFooter: {
    marginTop: 16,
  },
  webButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  webButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default DatePickerModal;
