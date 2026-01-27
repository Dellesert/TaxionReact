import { useState, useRef, useCallback } from 'react';
import { TextInput } from 'react-native';
import { extractNumericInput, createEmptyCode } from '../utils/twoFactorHelpers';

interface Use2FACodeInputReturn {
  code: string[];
  inputRefs: React.MutableRefObject<Array<TextInput | null>>;
  handleCodeChange: (text: string, index: number) => void;
  handleKeyPress: (e: any, index: number) => void;
  clearCode: () => void;
  focusFirstInput: () => void;
}

/**
 * Hook for managing 2FA code input logic
 * Handles input validation, focus management, and paste detection
 */
export const use2FACodeInput = (): Use2FACodeInputReturn => {
  const [code, setCode] = useState<string[]>(createEmptyCode());
  const inputRefs = useRef<Array<TextInput | null>>([]);

  const handleCodeChange = useCallback(
    (text: string, index: number) => {
      const numericText = extractNumericInput(text);

      if (numericText.length === 0) {
        // Clear current field
        const newCode = [...code];
        newCode[index] = '';
        setCode(newCode);

        // Move to previous field on delete
        if (index > 0) {
          inputRefs.current[index - 1]?.focus();
        }
        return;
      }

      // If user pasted multiple digits (iOS autofill or manual paste)
      if (numericText.length > 1) {
        const newCode = [...code];
        const digits = numericText.slice(0, 6).split('');

        // Fill in digits starting from current index
        digits.forEach((digit, i) => {
          const targetIndex = index + i;
          if (targetIndex < 6) {
            newCode[targetIndex] = digit;
          }
        });

        setCode(newCode);

        // Focus the next empty field or last field
        const lastFilledIndex = Math.min(index + digits.length - 1, 5);
        if (lastFilledIndex < 5) {
          inputRefs.current[lastFilledIndex + 1]?.focus();
        } else {
          inputRefs.current[5]?.blur();
        }
        return;
      }

      // Update code with single digit
      const newCode = [...code];
      newCode[index] = numericText[0];
      setCode(newCode);

      // Auto-advance to next field
      if (index < 5) {
        inputRefs.current[index + 1]?.focus();
      } else {
        // If it's the last field, blur
        inputRefs.current[index]?.blur();
      }
    },
    [code]
  );

  const handleKeyPress = useCallback(
    (e: any, index: number) => {
      if (e.nativeEvent.key === 'Backspace' && code[index] === '' && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    },
    [code]
  );

  const clearCode = useCallback(() => {
    setCode(createEmptyCode());
  }, []);

  const focusFirstInput = useCallback(() => {
    inputRefs.current[0]?.focus();
  }, []);

  return {
    code,
    inputRefs,
    handleCodeChange,
    handleKeyPress,
    clearCode,
    focusFirstInput,
  };
};
