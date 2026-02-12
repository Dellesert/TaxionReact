import React from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { useTheme } from '@shared/hooks/useTheme';

interface CodeInputGridProps {
  code: string[];
  inputRefs: React.MutableRefObject<Array<TextInput | null>>;
  isLoading: boolean;
  onCodeChange: (text: string, index: number) => void;
  onKeyPress: (e: any, index: number) => void;
  onSubmit?: () => void;
}

export const CodeInputGrid: React.FC<CodeInputGridProps> = ({
  code,
  inputRefs,
  isLoading,
  onCodeChange,
  onKeyPress,
  onSubmit,
}) => {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      {code.map((digit, index) => (
        <TextInput
          key={index}
          ref={(ref) => (inputRefs.current[index] = ref)}
          style={[
            styles.input,
            {
              borderColor: theme.border,
              color: theme.text,
              backgroundColor: theme.backgroundTertiary,
            },
            digit !== '' && {
              borderColor: theme.primary,
              backgroundColor: theme.card,
            },
          ]}
          value={digit}
          onChangeText={(text) => onCodeChange(text, index)}
          onKeyPress={(e) => onKeyPress(e, index)}
          keyboardType="number-pad"
          maxLength={6}
          textContentType="oneTimeCode"
          autoComplete="one-time-code"
          selectTextOnFocus
          editable={!isLoading}
          onSubmitEditing={onSubmit}
          blurOnSubmit={false}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    gap: 8,
  },
  input: {
    width: 48,
    height: 56,
    borderWidth: 2,
    borderRadius: 12,
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
  },
});
