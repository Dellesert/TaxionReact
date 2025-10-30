import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Modal, Platform, TouchableWithoutFeedback, Animated } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '@hooks/useTheme';

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

  // Android: возвращаем только DateTimePicker (он сам показывает нативный диалог)
  if (Platform.OS === 'android' && visible) {
    return (
      <DateTimePicker
        value={value}
        mode={mode}
        display="default"
        onChange={onChange}
        minimumDate={minimumDate}
        maximumDate={maximumDate}
      />
    );
  }

  // Web или когда не visible - ничего не показываем
  return null;
};

export default DatePickerModal;
