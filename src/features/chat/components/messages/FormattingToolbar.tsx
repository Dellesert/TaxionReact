import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';

export interface FormatMarker {
  open: string;
  close: string;
}

interface FormattingToolbarProps {
  onFormat: (marker: FormatMarker) => void;
}

const TOOLBAR_ITEMS: { icon?: string; label: string; marker: FormatMarker; textStyle?: object }[] = [
  { label: 'B', marker: { open: '*', close: '*' }, textStyle: { fontWeight: 'bold' as const } },
  { label: 'I', marker: { open: '_', close: '_' }, textStyle: { fontStyle: 'italic' as const } },
  { label: 'S', marker: { open: '~', close: '~' }, textStyle: { textDecorationLine: 'line-through' as const } },
  { icon: 'code-slash-outline', label: '', marker: { open: '`', close: '`' } },
  { icon: 'eye-off-outline', label: '', marker: { open: '||', close: '||' } },
];

export const FormattingToolbar: React.FC<FormattingToolbarProps> = ({ onFormat }) => {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundTertiary, borderTopColor: theme.border }]}>
      {TOOLBAR_ITEMS.map((item, index) => (
        <TouchableOpacity
          key={index}
          style={[styles.button, { backgroundColor: theme.input }]}
          onPress={() => onFormat(item.marker)}
          activeOpacity={0.7}
        >
          {item.icon ? (
            <Ionicons name={item.icon as any} size={18} color={theme.text} />
          ) : (
            <Text style={[styles.buttonText, { color: theme.text }, item.textStyle]}>
              {item.label}
            </Text>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 6,
    gap: 8,
    borderTopWidth: 1,
  },
  button: {
    width: 36,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
  },
});
