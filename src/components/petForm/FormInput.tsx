/**
 * FormInput — campo de texto padrão dos formulários de pet.
 *
 * Renderiza um container com ícone opcional à esquerda, TextInput, conteúdo
 * opcional à direita e um sufixo textual (ex.: "kg"). Também cobre o modo
 * multilinha (área de observações).
 */
import React from 'react';
import {
  View,
  Text,
  TextInput,
  TextInputProps,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { petFormStyles as styles } from './petFormStyles';

type Props = {
  icon?: keyof typeof Ionicons.glyphMap;
  value: string;
  onChangeText?: (text: string) => void;
  placeholder?: string;
  multiline?: boolean;
  numberOfLines?: number;
  suffix?: string;
  right?: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
} & Pick<
  TextInputProps,
  'keyboardType' | 'autoCapitalize' | 'editable' | 'maxLength' | 'autoCorrect'
>;

export default function FormInput({
  icon,
  value,
  onChangeText,
  placeholder,
  multiline,
  numberOfLines,
  suffix,
  right,
  containerStyle,
  ...rest
}: Props) {
  if (multiline) {
    return (
      <View style={[styles.inputContainer, styles.textAreaContainer, containerStyle]}>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder={placeholder}
          placeholderTextColor={colors.gray500}
          value={value}
          onChangeText={onChangeText}
          multiline
          numberOfLines={numberOfLines ?? 4}
          textAlignVertical="top"
        />
      </View>
    );
  }

  return (
    <View style={[styles.inputContainer, containerStyle]}>
      {icon && <Ionicons name={icon} size={20} color={colors.gray500} style={styles.inputIcon} />}
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={colors.gray500}
        value={value}
        onChangeText={onChangeText}
        {...rest}
      />
      {right}
      {suffix && <Text style={styles.inputSuffix}>{suffix}</Text>}
    </View>
  );
}
