/**
 * storage — upload de imagens para o Firebase Storage.
 *
 * Centraliza o upload de fotos de pet que estava duplicado em
 * NewPetScreen e EditPetScreen.
 */
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';

/**
 * uploadImageToStorage — envia um arquivo local (URI) para o Storage
 * em `folderName/NNNN.ext` e retorna a URL pública gerada.
 * Retorna null em caso de falha (o log do erro é mantido).
 */
export async function uploadImageToStorage(
  uri: string,
  folderName: string,
): Promise<string | null> {
  try {
    const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
    const contentType = fileExt === 'png' ? 'image/png' : 'image/jpeg';
    const response = await fetch(uri);
    const blob = await response.blob();
    const storageRef = ref(storage, `${folderName}/${Date.now()}.${fileExt}`);
    await uploadBytes(storageRef, blob, { contentType });
    return await getDownloadURL(storageRef);
  } catch (error) {
    console.error('Photo upload failed:', error);
    return null;
  }
}
