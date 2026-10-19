/**
 * useShareCard — hook compartilhado pelas telas de carteira digital.
 *
 * Captura a View referenciada por cardRef (react-native-view-shot),
 * salva no cache como PNG e abre o menu nativo de compartilhamento.
 */
import { useState } from 'react';
import type { RefObject } from 'react';
import { Alert } from '../lib/alert';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

type ViewShotLike = { capture?: () => Promise<string | null> };

export function useShareCard(cardRef: RefObject<ViewShotLike | null>) {
  const [sharing, setSharing] = useState(false);

  /**
   * Compartilha a carteira como imagem PNG.
   * Retorna true se o compartilhamento foi disparado com sucesso.
   */
  const shareCard = async (petName: string): Promise<boolean> => {
    try {
      setSharing(true);

      if (!cardRef.current) {
        Alert.alert('Erro', 'Não foi possível gerar o documento.');
        return false;
      }

      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Erro', 'Compartilhamento não disponível neste dispositivo.');
        return false;
      }

      const uri = await cardRef.current.capture?.();
      if (!uri) {
        Alert.alert('Erro', 'Não foi possível capturar a imagem.');
        return false;
      }

      const fileName = `e-Pet_${petName.replace(/\s+/g, '_')}_${Date.now()}.png`;
      const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
      await FileSystem.moveAsync({ from: uri, to: fileUri });

      await Sharing.shareAsync(fileUri, {
        mimeType: 'image/png',
        dialogTitle: `Carteira do Pet - ${petName}`,
        UTI: 'public.png',
      });
      return true;
    } catch (error) {
      console.error(error);
      Alert.alert('Erro', 'Não foi possível compartilhar o documento.');
      return false;
    } finally {
      setSharing(false);
    }
  };

  return { sharing, shareCard };
}
