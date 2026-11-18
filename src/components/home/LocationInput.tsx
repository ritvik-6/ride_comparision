import { Ionicons } from '@react-native-vector-icons/ionicons';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import type { RefObject } from 'react';
import type { TextInputInstance } from 'react-native';

import {
  colors,
  fontSize,
  lineHeight,
  radius,
  spacing,
  textVariants,
} from '@/theme';

export interface LocationInputProps {
  value: string;
  placeholder: string;
  onChangeText: (value: string) => void;
  onFocus: () => void;
  onBlur: () => void;
  onSubmitEditing?: () => void;
  onClear: () => void;
  /** True once a suggestion has been chosen for this field. */
  selected: boolean;
  inputRef?: RefObject<TextInputInstance | null>;
  returnKeyType?: 'next' | 'search';
  accessibilityLabel: string;
  clearAccessibilityLabel: string;
}

/** Text field for one route endpoint, with selected and clear affordances. */
export function LocationInput({
  value,
  placeholder,
  onChangeText,
  onFocus,
  onBlur,
  onSubmitEditing,
  onClear,
  selected,
  inputRef,
  returnKeyType,
  accessibilityLabel,
  clearAccessibilityLabel,
}: LocationInputProps) {
  return (
    <View style={styles.row}>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChangeText}
        onFocus={onFocus}
        onBlur={onBlur}
        onSubmitEditing={onSubmitEditing}
        placeholder={placeholder}
        placeholderTextColor={colors.textSubtle}
        style={styles.input}
        autoCapitalize="words"
        autoCorrect={false}
        returnKeyType={returnKeyType}
        selectionColor={colors.accent}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint="Start typing to see matching places in Hyderabad."
      />

      {selected ? (
        <View
          accessible
          accessibilityLabel="Location selected"
          style={styles.selectedBadge}
        >
          <Ionicons name="checkmark" size={13} color={colors.accent} />
        </View>
      ) : null}

      {value.length > 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={clearAccessibilityLabel}
          onPress={onClear}
          hitSlop={10}
          style={({ pressed }) => [styles.clear, pressed && styles.clearPressed]}
        >
          <Ionicons name="close-circle" size={18} color={colors.textSubtle} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    ...textVariants.body,
    padding: 0,
    paddingVertical: spacing.md,
    fontSize: fontSize.md,
    lineHeight: lineHeight.md,
  },
  selectedBadge: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.accentSoft,
  },
  clear: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearPressed: {
    opacity: 0.6,
  },
});
