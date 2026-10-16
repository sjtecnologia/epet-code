/**
 * CustomSpeciesField — campo de texto para espécie personalizada ("Outro").
 *
 * Mostra indicador de validação assíncrona (spinner) e ícones de resultado
 * (válido/inválido) à direita do campo.
 */
import React from 'react';
import { View, TextInput, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { petFormStyles as styles } from './petFormStyles';

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  validating?: boolean;
  validationResult?: 'valid' | 'invalid' | null;
};

export default function CustomSpeciesField({
  value,
  onChangeText,
  validating,
  validationResult,
}: Props) {
  return (
    <View style={styles.customSpeciesContainer}>
      <View style={styles.inputContainer}>
        <Ionicons name="create-outline" size={20} color={colors.gray500} style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="Qual é a espécie? (ex: Coelho, Hamster, Tartaruga)"
          placeholderTextColor={colors.gray500}
          value={value}
          onChangeText={onChangeText}
          autoCapitalize="words"
        />
        {validating && (
          <ActivityIndicator size="small" color={colors.primary} style={{ marginLeft: 8 }} />
        )}
        {!validating && validationResult === 'valid' && (
          <Ionicons name="checkmark-circle" size={24} color="#10B981" style={{ marginLeft: 8 }} />
        )}
        {!validating && validationResult === 'invalid' && (
          <Ionicons name="close-circle" size={24} color="#EF4444" style={{ marginLeft: 8 }} />
        )}
      </View>
    </View>
  );
}
