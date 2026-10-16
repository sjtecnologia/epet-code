/**
 * PhotoPicker — seletor circular de foto do pet.
 *
 * Mostra a foto escolhida (ou um placeholder de câmera) e um selo no canto
 * inferior com o ícone indicado (adicionar ou editar).
 */
import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { petFormStyles as styles } from './petFormStyles';

type Props = {
  photoUri: string | null;
  onPress: () => void;
  badgeIcon?: keyof typeof Ionicons.glyphMap;
  badgeIconSize?: number;
};

export default function PhotoPicker({
  photoUri,
  onPress,
  badgeIcon = 'add',
  badgeIconSize = 20,
}: Props) {
  return (
    <View style={styles.photoSection}>
      <TouchableOpacity style={styles.photoContainer} onPress={onPress}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.photo} />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Ionicons name="camera" size={40} color={colors.gray500} />
            <Text style={styles.photoText}>Adicionar foto</Text>
          </View>
        )}
        <View style={styles.photoBadge}>
          <Ionicons name={badgeIcon} size={badgeIconSize} color="#fff" />
        </View>
      </TouchableOpacity>
    </View>
  );
}
