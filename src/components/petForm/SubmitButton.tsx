/**
 * SubmitButton — botão principal dos formulários de pet.
 *
 * Exibe o rótulo normal (com ícone de check) ou o rótulo de carregamento,
 * desabilitando o toque enquanto o envio está em andamento.
 */
import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { petFormStyles as styles } from './petFormStyles';

type Props = {
  onPress: () => void;
  label: string;
  loadingLabel: string;
  loading?: boolean;
};

export default function SubmitButton({ onPress, label, loadingLabel, loading }: Props) {
  return (
    <TouchableOpacity
      style={[styles.submitButton, loading && styles.submitButtonDisabled]}
      onPress={onPress}
      disabled={loading}
    >
      {loading ? (
        <Text style={styles.submitButtonText}>{loadingLabel}</Text>
      ) : (
        <>
          <Ionicons name="checkmark-circle" size={22} color="#fff" />
          <Text style={styles.submitButtonText}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}
