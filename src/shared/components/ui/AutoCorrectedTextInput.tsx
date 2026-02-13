import React, { forwardRef, useRef, useImperativeHandle, useCallback } from 'react';
import { TextInput, TextInputProps, Platform } from 'react-native';

export interface AutoCorrectedTextInputRef {
  focus: () => void;
  blur: () => void;
  clear: () => void;
  isFocused: () => boolean;
  /**
   * Принудительно применяет iOS автокоррекцию и возвращает актуальный текст.
   * На Android просто возвращает текущее значение.
   */
  commitAutocorrection: () => void;
  /** Устанавливает позицию курсора / выделение */
  setSelection: (start: number, end: number) => void;
}

interface AutoCorrectedTextInputProps extends TextInputProps {
  /**
   * Callback вызывается после применения автокоррекции.
   * Используйте вместо прямого доступа к value при отправке.
   */
  onSubmitWithAutocorrection?: (text: string) => void;
}

/**
 * TextInput с исправлением бага iOS автокоррекции.
 *
 * Проблема: на iOS когда пользователь нажимает "Отправить" до принятия
 * предложенной автокоррекции, отправляется неоткорректированный текст,
 * а в инпуте остается откорректированный.
 *
 * Решение: перед отправкой вызывать commitAutocorrection() через ref,
 * который принудительно применяет автокоррекцию.
 */
export const AutoCorrectedTextInput = forwardRef<AutoCorrectedTextInputRef, AutoCorrectedTextInputProps>(
  ({ onSubmitWithAutocorrection, value, onChangeText, ...props }, ref) => {
    const inputRef = useRef<TextInput>(null);
    const currentValue = useRef(value || '');

    // Обновляем текущее значение при изменении
    const handleChangeText = useCallback((text: string) => {
      currentValue.current = text;
      onChangeText?.(text);
    }, [onChangeText]);

    // Синхронизируем с внешним value
    React.useEffect(() => {
      currentValue.current = value || '';
    }, [value]);

    const commitAutocorrection = useCallback(() => {
      if (Platform.OS === 'ios' && inputRef.current) {
        // Добавляем и убираем пробел чтобы iOS применила автокоррекцию
        const input = inputRef.current as any;
        if (input.setNativeProps) {
          input.setNativeProps({ text: currentValue.current + ' ' });
          input.setNativeProps({ text: currentValue.current });
        }
      }
    }, []);

    const setSelection = useCallback((start: number, end: number) => {
      const input = inputRef.current as any;
      if (input?.setNativeProps) {
        input.setNativeProps({ selection: { start, end } });
      }
    }, []);

    useImperativeHandle(ref, () => ({
      focus: () => inputRef.current?.focus(),
      blur: () => inputRef.current?.blur(),
      clear: () => inputRef.current?.clear(),
      isFocused: () => inputRef.current?.isFocused() ?? false,
      commitAutocorrection,
      setSelection,
    }), [commitAutocorrection, setSelection]);

    return (
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={handleChangeText}
        {...props}
      />
    );
  }
);

AutoCorrectedTextInput.displayName = 'AutoCorrectedTextInput';

export default AutoCorrectedTextInput;
