/**
 * SearchScreen — tela de busca pública de pets por ID ou QR Code.
 *
 * Permite localizar qualquer pet cadastrado no e-Pet (Firestore coleção 'pets') ou no 4YouPet
 * (Firestore) a partir do seu ID único no formato PET-XXXX-XXXX.
 * O usuário pode digitar o ID manualmente ou escanear o QR Code do pet
 * usando a câmera do dispositivo via expo-camera.
 *
 * Caso o pet seja encontrado, exibe seus dados públicos e as informações
 * de contato do tutor para facilitar a devolução em caso de perda.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Linking,
  Platform,
  SafeAreaView,
} from 'react-native';
import { Alert } from '../../lib/alert';
import { Ionicons } from '@expo/vector-icons';
import { useCameraPermissions } from 'expo-camera';
import { doc, getDoc } from 'firebase/firestore';
import { firestore } from '../../lib/firebase';
import { colors } from '../../constants/colors';
import { getSpeciesLabel, getSpeciesIcon } from '../../lib/species';
import { QrScannerModal } from '../../components/search/QrScannerModal';

/**
 * Aceita o formato atual (somente o ID) e o JSON emitido por versões antigas
 * da carteira, que continha a propriedade `id`.
 */
export function getPetIdFromQrPayload(data: string): string {
  const payload = data.trim();

  try {
    const parsed: unknown = JSON.parse(payload);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'id' in parsed &&
      typeof parsed.id === 'string'
    ) {
      return parsed.id.trim();
    }
  } catch {
    // O QR atual contém somente texto, portanto não precisa ser JSON.
  }

  return payload;
}

/** Ficha pública do pet exposta em `publicPets/{petId}` */
type PublicPet = {
  id: string;
  pet_id?: string;
  name?: string;
  species?: string;
  breed?: string | null;
  photo_url?: string | null;
  owner_name?: string;
  owner_phone?: string | null;
  owner_email?: string | null;
};

export default function SearchScreen() {
  const [searchId, setSearchId] = useState(''); // ID digitado pelo usuário
  const [loading, setLoading] = useState(false); // indica busca em andamento
  const [petData, setPetData] = useState<PublicPet | null>(null); // dados do pet encontrado
  const [notFound, setNotFound] = useState(false); // true quando nenhum pet foi encontrado
  const [showScanner, setShowScanner] = useState(false); // exibe o modal com a câmera
  const [scanned, setScanned] = useState(false); // evita múltiplas leituras do QR Code
  const [permission, requestPermission] = useCameraPermissions(); // permissão de câmera

  /**
   * Busca somente a ficha pública, que contém os dados mínimos para devolver
   * o pet sem expor o prontuário ou dados privados do tutor.
   */
  const searchPetById = async (id: string) => {
    setLoading(true);
    setNotFound(false);
    setPetData(null);

    try {
      const normalizedId = id.trim();
      const publicPet = await getDoc(doc(firestore, 'publicPets', normalizedId));

      if (publicPet.exists()) {
        setPetData({ id: publicPet.id, ...publicPet.data() });
      } else {
        setNotFound(true);
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Erro', 'Ocorreu um erro ao buscar o pet. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  /** Valida o campo de busca e dispara a pesquisa */
  const handleSearch = async () => {
    if (!searchId.trim()) {
      Alert.alert('Atenção', 'Digite o ID do pet para buscar.');
      return;
    }
    await searchPetById(searchId);
  };

  /** Solicita permissão de câmera e abre o scanner de QR Code */
  const handleOpenScanner = async () => {
    setScanned(false);
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert('Permissão negada', 'Acesse as configurações para permitir o uso da câmera.');
        return;
      }
    }
    setShowScanner(true);
  };

  /** Callback chamado quando o QR Code é lido pela câmera; usa setScanned para evitar leituras duplicadas */
  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    setShowScanner(false);
    const scannedId = getPetIdFromQrPayload(data);
    setSearchId(scannedId);
    searchPetById(scannedId);
  };

  const handleCallOwner = async () => {
    const phone = String(petData?.owner_phone ?? '').replace(/\D/g, '');
    if (!phone) {
      Alert.alert('Telefone indisponível', 'O telefone deste tutor não está disponível.');
      return;
    }

    try {
      await Linking.openURL(`tel:${phone}`);
    } catch {
      Alert.alert('Erro', 'Não foi possível abrir o aplicativo de telefone.');
    }
  };

  return (
    <View style={styles.container}>
      {Platform.OS === 'ios' ? (
        <SafeAreaView style={styles.headerIOS}>
          <Text style={styles.headerTitle}>Busca-Pet</Text>
          <Text style={styles.headerSubtitle}>Digite o ID para encontrar o tutor</Text>
        </SafeAreaView>
      ) : (
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Busca-Pet</Text>
          <Text style={styles.headerSubtitle}>Digite o ID para encontrar o tutor</Text>
        </View>
      )}

      <View style={styles.content}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={20} color={colors.gray500} />
            <TextInput
              style={styles.searchInput}
              placeholder="Digite o ID do pet (ex: PET-ABC123)"
              value={searchId}
              onChangeText={setSearchId}
              autoCapitalize="characters"
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
            {searchId.length > 0 && (
              <TouchableOpacity onPress={() => setSearchId('')}>
                <Ionicons name="close-circle" size={20} color={colors.gray400} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity style={styles.qrButton} onPress={handleOpenScanner} disabled={loading}>
            <Ionicons name="qr-code" size={22} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.searchButton} onPress={handleSearch} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Ionicons name="search" size={22} color="#fff" />
            )}
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Instructions */}
          {!petData && !notFound && !loading && (
            <View style={styles.instructionsCard}>
              <Ionicons name="information-circle" size={48} color={colors.primary} />
              <Text style={styles.instructionsTitle}>Como funciona?</Text>
              <Text style={styles.instructionsText}>
                Digite o ID que está na coleira ou documento do pet para encontrar as informações do
                tutor e entrar em contato.
              </Text>
            </View>
          )}

          {/* Not Found */}
          {notFound && (
            <View style={styles.notFoundCard}>
              <Ionicons name="sad-outline" size={64} color={colors.gray400} />
              <Text style={styles.notFoundTitle}>Pet não encontrado</Text>
              <Text style={styles.notFoundText}>
                Não encontramos nenhum pet com o ID &quot;{searchId}&quot;. Verifique se digitou
                corretamente.
              </Text>
            </View>
          )}

          {/* Pet Found */}
          {petData && (
            <View style={styles.resultCard}>
              <View style={styles.resultHeader}>
                <Ionicons name="checkmark-circle" size={32} color="#10B981" />
                <Text style={styles.resultHeaderText}>Pet Encontrado!</Text>
              </View>

              {/* Pet Info */}
              <View style={styles.petSection}>
                <View style={styles.petHeader}>
                  {petData.photo_url ? (
                    <Image source={{ uri: petData.photo_url }} style={styles.petPhoto} />
                  ) : (
                    <View style={styles.petPhotoPlaceholder}>
                      <Ionicons
                        name={getSpeciesIcon(petData.species)}
                        size={40}
                        color={colors.primary}
                      />
                    </View>
                  )}
                  <View style={styles.petHeaderInfo}>
                    <Text style={styles.petName}>{petData.name}</Text>
                    <Text style={styles.petId}>ID: {petData.pet_id}</Text>
                  </View>
                </View>

                <View style={styles.petDetails}>
                  <View style={styles.detailRow}>
                    <Ionicons
                      name={getSpeciesIcon(petData.species)}
                      size={18}
                      color={colors.primary}
                    />
                    <Text style={styles.detailLabel}>Espécie:</Text>
                    <Text style={styles.detailValue}>{getSpeciesLabel(petData.species)}</Text>
                  </View>
                  {petData.breed && (
                    <View style={styles.detailRow}>
                      <Ionicons name="heart" size={18} color={colors.primary} />
                      <Text style={styles.detailLabel}>Raça:</Text>
                      <Text style={styles.detailValue}>{petData.breed}</Text>
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.ownerSection}>
                <Text style={styles.sectionTitle}>Contato do tutor</Text>
                <View style={styles.ownerInfo}>
                  <View style={styles.ownerRow}>
                    <Ionicons name="person-outline" size={20} color={colors.primary} />
                    <View style={styles.ownerRowContent}>
                      <Text style={styles.ownerLabel}>Nome</Text>
                      <Text style={styles.ownerValue}>{petData.owner_name}</Text>
                    </View>
                  </View>
                  <TouchableOpacity style={styles.ownerRow} onPress={handleCallOwner}>
                    <Ionicons name="call-outline" size={20} color={colors.primary} />
                    <View style={styles.ownerRowContent}>
                      <Text style={styles.ownerLabel}>Telefone</Text>
                      <Text style={styles.ownerValue}>{petData.owner_phone}</Text>
                    </View>
                    <Ionicons name="call" size={18} color={colors.primary} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          <View style={styles.bottomPadding} />
        </ScrollView>
      </View>

      {/* Modal do Scanner de QR Code */}
      <QrScannerModal
        visible={showScanner}
        paused={scanned}
        onScanned={handleBarCodeScanned}
        onClose={() => setShowScanner(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  headerIOS: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: colors.textPrimary,
  },
  searchButton: {
    width: 50,
    height: 50,
    backgroundColor: colors.primary,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  qrButton: {
    width: 50,
    height: 50,
    backgroundColor: '#fff',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  instructionsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  instructionsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  instructionsText: {
    fontSize: 14,
    color: colors.gray600,
    textAlign: 'center',
    lineHeight: 22,
  },
  notFoundCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  notFoundTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  notFoundText: {
    fontSize: 14,
    color: colors.gray600,
    textAlign: 'center',
    lineHeight: 22,
  },
  resultCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  resultHeaderText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#10B981',
    flex: 1,
  },
  petSection: {
    marginBottom: 8,
  },
  petHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
  },
  petPhoto: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  petPhotoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  petHeaderInfo: {
    flex: 1,
  },
  petName: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  petId: {
    fontSize: 13,
    color: colors.gray600,
    fontWeight: '500',
  },
  petDetails: {
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  detailLabel: {
    fontSize: 14,
    color: colors.gray600,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: colors.gray300,
    marginVertical: 20,
  },
  ownerSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 16,
  },
  ownerInfo: {
    gap: 16,
  },
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  ownerRowContent: {
    flex: 1,
  },
  ownerLabel: {
    fontSize: 12,
    color: colors.gray500,
    marginBottom: 2,
  },
  ownerValue: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  bottomPadding: {
    height: 40,
  },
});
