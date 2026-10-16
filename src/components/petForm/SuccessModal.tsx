/**
 * SuccessModal — modal de confirmação de sucesso do formulário de pet.
 *
 * Mostra ícone de check, título, descrição e botão único de ação.
 */
import React from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { petFormStyles as styles } from './petFormStyles';

type Props = {
  visible: boolean;
  title: string;
  description: string;
  buttonText: string;
  onClose: () => void;
};

export default function SuccessModal({
  visible,
  title,
  description,
  buttonText,
  onClose,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.successOverlay}>
        <View style={styles.successModalCard}>
          <View style={styles.successIconContainer}>
            <Ionicons name="checkmark-circle" size={64} color="#10B981" />
          </View>
          <Text style={styles.successTitle}>{title}</Text>
          <Text style={styles.successDescription}>{description}</Text>
          <TouchableOpacity style={styles.successButton} onPress={onClose}>
            <Text style={styles.successButtonText}>{buttonText}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
