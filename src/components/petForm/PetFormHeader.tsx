/**
 * PetFormHeader — cabeçalho compartilhado pelos formulários de pet.
 *
 * Exibe o botão de voltar, o título da tela e, opcionalmente, um botão de ação
 * à direita (ex.: excluir). Sem ação, ocupa o mesmo espaço para manter o título
 * centralizado.
 */
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { petFormStyles as styles } from './petFormStyles';

type Props = {
  title: string;
  onBack: () => void;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightPress?: () => void;
};

export default function PetFormHeader({ title, onBack, rightIcon, onRightPress }: Props) {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color="#fff" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{title}</Text>
      {rightIcon && onRightPress ? (
        <TouchableOpacity onPress={onRightPress} style={styles.backButton}>
          <Ionicons name={rightIcon} size={24} color="#fff" />
        </TouchableOpacity>
      ) : (
        <View style={styles.backButton} />
      )}
    </View>
  );
}
