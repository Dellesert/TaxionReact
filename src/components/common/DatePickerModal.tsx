import React from 'react';
import { View, Text, TouchableOpacity, Modal, Platform, TouchableWithoutFeedback } from 'react-native';
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
          <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <TouchableWithoutFeedback>
              <View style={{ backgroundColor: theme.card, paddingBottom: 20 }}>
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
              </View>
            </TouchableWithoutFeedback>
          </View>
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
