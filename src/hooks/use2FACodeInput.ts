import { useState, useRef, useCallback } from 'react';
import { TextInput } from 'react-native';
import { extractNumericInput, splitCode, createEmptyCode } from '@utils/twoFactorHelpers';

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

      // If user pasted full 6-digit code
      if (numericText.length === 6) {
        const newCode = splitCode(numericText);
        setCode(newCode);
        inputRefs.current[5]?.focus();
        return;
      }

      // Update code with first digit
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
