/**
 * usePhotoPicker — hook de seleção de foto (galeria ou câmera).
 *
 * Encapsula as permissões, o lançamento do seletor/câmera e o Alert de opções,
 * entregando a URI escolhida via callback `onSelect`. As mensagens variam entre
 * as telas de cadastro e edição, por isso são parametrizáveis.
 */
import { useCallback } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from '../../lib/alert';

type Options = {
  alertTitle?: string;
  alertMessage?: string;
  galleryDeniedMessage?: string;
  cameraDeniedMessage?: string;
};

export function usePhotoPicker(onSelect: (uri: string) => void, options: Options = {}) {
  const {
    alertTitle = 'Adicionar Foto',
    alertMessage = 'Como você deseja adicionar a foto?',
    galleryDeniedMessage = 'Precisamos de acesso à galeria.',
    cameraDeniedMessage = 'Precisamos de acesso à câmera.',
  } = options;

  const pickImage = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão necessária', galleryDeniedMessage);
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) onSelect(result.assets[0].uri);
  }, [onSelect, galleryDeniedMessage]);

  const takePhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão necessária', cameraDeniedMessage);
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) onSelect(result.assets[0].uri);
  }, [onSelect, cameraDeniedMessage]);

  const showPhotoOptions = useCallback(() => {
    Alert.alert(alertTitle, alertMessage, [
      { text: 'Câmera', onPress: takePhoto },
      { text: 'Galeria', onPress: pickImage },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  }, [alertTitle, alertMessage, takePhoto, pickImage]);

  return { pickImage, takePhoto, showPhotoOptions };
}
