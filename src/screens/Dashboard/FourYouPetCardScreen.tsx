/**
 * FourYouPetCardScreen — exibe a carteira digital de um pet do 4YouPet.
 *
 * Busca o perfil do tutor no Firestore para exibir dados de contato,
 * gera o QR Code do pet e permite compartilhar a carteira como imagem.
 * Segue a mesma lógica de captura/compartilhamento do PetCardScreen.
 */
import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Alert } from '../../lib/alert';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import QRCode from 'react-native-qrcode-svg';
import * as Clipboard from 'expo-clipboard';
import ViewShot, { type ViewShotRef } from 'react-native-view-shot';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { doc, getDoc } from 'firebase/firestore';
import { firestore } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { FourYouPet, UserDoc } from '../../types/database.types';
import { colors } from '../../constants/colors';
import { DashboardStackParamList } from '../../types/navigation.types';
import { toDate } from '../../lib/petForm';

type Props = {
  navigation: NativeStackNavigationProp<DashboardStackParamList, 'FourYouPetCard'>;
  route: RouteProp<DashboardStackParamList, 'FourYouPetCard'>;
};

/** Tipo dos dados do tutor carregados do Firestore */
type OwnerProfile = {
  name: string;
  phone: string;
  email: string;
  address: string;
};

/** Converte Firestore Timestamp ou string em data no formato DD/MM/AAAA */
const formatDate = (timestamp: unknown): string => {
  const date = toDate(timestamp);
  return date ? date.toLocaleDateString('pt-BR') : 'Não informado';
};

/** Calcula a idade do pet a partir de um Timestamp Firestore ou string */
const calculateAge = (timestamp: unknown): string => {
  const birth = toDate(timestamp);
  if (!birth) return '';
  const today = new Date();
  let years = today.getFullYear() - birth.getFullYear();
  let months = today.getMonth() - birth.getMonth();
  if (months < 0) { years--; months += 12; }
  if (years > 0) return `${years} ano${years > 1 ? 's' : ''}`;
  if (months > 0) return `${months} mês${months > 1 ? 'es' : ''}`;
  return 'Filhote';
};

export default function FourYouPetCardScreen({ navigation, route }: Props) {
  const { pet } = route.params;
  const { user } = useAuth();
  const qrRef = useRef<QRCode | null>(null);
  const cardRef = useRef<ViewShotRef>(null); // ref para captura da carteira como imagem
  const [sharing, setSharing] = useState(false);   // bloqueia o botão durante o compartilhamento
  // Dados do tutor carregados do perfil Firestore
  const [ownerProfile, setOwnerProfile] = useState<OwnerProfile>({
    name: '',
    phone: '',
    email: '',
    address: '',
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  /** Busca o perfil do tutor no Firestore para preencher os dados de contato na carteira */
  const fetchProfile = async () => {
    if (!user) return;
    try {
      const snap = await getDoc(doc(firestore, 'users', user.uid));
      if (snap.exists()) {
        const p = snap.data() as UserDoc;
        const addressParts = [p.street, p.number, p.complement].filter(Boolean);
        setOwnerProfile({
          name: p.name || '',
          phone: p.celular || p.phone || '',
          email: user.email || '',
          address: addressParts.join(', '),
        });
      }
    } catch (err) {
      console.error('Erro ao buscar perfil:', err);
    }
  };

  const handleShare = async () => {
    try {
      setSharing(true);
      if (!cardRef.current) {
        Alert.alert('Erro', 'Não foi possível gerar o documento.');
        setSharing(false);
        return;
      }
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Erro', 'Compartilhamento não disponível neste dispositivo.');
        setSharing(false);
        return;
      }
      const uri = await cardRef.current?.capture?.();
      if (!uri) {
        Alert.alert('Erro', 'Não foi possível capturar a imagem.');
        setSharing(false);
        return;
      }
      const fileName = `e-Pet_${pet.name.replace(/\s+/g, '_')}_${Date.now()}.png`;
      const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
      await FileSystem.moveAsync({ from: uri, to: fileUri });
      await Sharing.shareAsync(fileUri, {
        mimeType: 'image/png',
        dialogTitle: `Carteira do Pet - ${pet.name}`,
        UTI: 'public.png',
      });
      setSharing(false);
    } catch (error) {
      console.error(error);
      setSharing(false);
      Alert.alert('Erro', 'Não foi possível compartilhar o documento.');
    }
  };

  const copyPetId = async () => {
    if (!pet.pet_id) return;
    await Clipboard.setStringAsync(pet.pet_id);
    Alert.alert('Copiado!', 'ID do pet copiado para a área de transferência.');
  };

  // O QR contém somente o identificador necessário para a busca do pet.
  const qrValue = pet.pet_id ?? '';

  const age = calculateAge(pet.birth);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Carteira do Pet</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('EditFourYouPet', { pet })}
          style={styles.headerButton}
        >
          <Ionicons name="create-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Card capturável para compartilhamento */}
        <ViewShot ref={cardRef} options={{ format: 'png', quality: 1.0 }}>
          <View style={styles.shareableCard}>
            {/* Header do Documento */}
            <View style={styles.documentHeader}>
              <View style={styles.documentHeaderContent}>
                <Ionicons name="paw" size={32} color={colors.primary} />
                <View style={styles.documentHeaderText}>
                  <Text style={styles.documentTitle}>CARTEIRA DO PET</Text>
                  <Text style={styles.documentSubtitle}>e-Pet • Identificação Animal</Text>
                </View>
                <View style={styles.badge4YouPet}>
                  <Text style={styles.badge4YouPetText}>4YouPet</Text>
                </View>
              </View>
            </View>

            {/* Card Principal */}
            <View style={styles.card}>
              {/* Foto e Info Principal */}
              <View style={styles.mainInfo}>
                {pet.images && pet.images.length > 0 ? (
                  <Image source={{ uri: pet.images[0] }} style={styles.petPhoto} />
                ) : (
                  <View style={styles.petPhotoPlaceholder}>
                    <Ionicons name="paw" size={48} color={colors.primary} />
                  </View>
                )}
                <Text style={styles.petName}>{pet.name}</Text>
                {pet.pet_id ? (
                  <View style={styles.petIdBadge}>
                    <Ionicons name="id-card" size={16} color={colors.primary} />
                    <Text style={styles.petIdText}>{pet.pet_id}</Text>
                  </View>
                ) : null}
              </View>

              {/* QR Code */}
              {pet.pet_id ? (
                <View style={styles.qrSection}>
                  <View style={styles.qrContainer}>
                    <QRCode
                      value={qrValue}
                      size={160}
                      color={colors.textPrimary}
                      backgroundColor="#fff"
                      getRef={(ref) => (qrRef.current = ref)}
                    />
                  </View>
                  <Text style={styles.qrHint}>Escaneie para ver as informações</Text>
                </View>
              ) : null}

              {/* Informações do Pet */}
              <View style={styles.infoSection}>
                <Text style={styles.sectionTitle}>Informações do Pet</Text>

                <View style={styles.infoRow}>
                  <View style={styles.infoItem}>
                    <View style={styles.infoIcon}>
                      <Ionicons name="heart" size={18} color={colors.primary} />
                    </View>
                    <View>
                      <Text style={styles.infoLabel}>Raça</Text>
                      <Text style={styles.infoValue}>{pet.breed || 'Não informado'}</Text>
                    </View>
                  </View>
                  <View style={styles.infoItem}>
                    <View style={styles.infoIcon}>
                      <Ionicons name="resize" size={18} color={colors.primary} />
                    </View>
                    <View>
                      <Text style={styles.infoLabel}>Porte</Text>
                      <Text style={styles.infoValue}>{pet.size || 'Não informado'}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.infoRow}>
                  <View style={styles.infoItem}>
                    <View style={styles.infoIcon}>
                      <Ionicons name="calendar" size={18} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.infoLabel}>Nascimento</Text>
                      <Text style={styles.infoValue}>{formatDate(pet.birth)}</Text>
                      {age ? <Text style={styles.ageText}>{age}</Text> : null}
                    </View>
                  </View>
                  <View style={styles.infoItem}>
                    <View style={styles.infoIcon}>
                      <Ionicons name="color-palette" size={18} color={colors.primary} />
                    </View>
                    <View>
                      <Text style={styles.infoLabel}>Cor</Text>
                      <Text style={styles.infoValue}>{pet.color || 'Não informado'}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.infoRow}>
                  <View style={styles.infoItem}>
                    <View style={styles.infoIcon}>
                      <Ionicons name="cut" size={18} color={colors.primary} />
                    </View>
                    <View>
                      <Text style={styles.infoLabel}>Castrado</Text>
                      <Text style={styles.infoValue}>{pet.castrado ? 'Sim' : 'Não'}</Text>
                    </View>
                  </View>
                </View>
              </View>

              <View style={styles.divider} />

              {/* Dados do Tutor */}
              <View style={styles.infoSection}>
                <Text style={styles.sectionTitle}>Dados do Tutor</Text>

                {ownerProfile.name ? (
                  <View style={styles.contactItem}>
                    <View style={styles.contactIcon}>
                      <Ionicons name="person" size={18} color="#10B981" />
                    </View>
                    <View style={styles.contactInfo}>
                      <Text style={styles.contactLabel}>Nome</Text>
                      <Text style={styles.contactValue}>{ownerProfile.name}</Text>
                    </View>
                  </View>
                ) : null}

                {ownerProfile.phone ? (
                  <View style={styles.contactItem}>
                    <View style={styles.contactIcon}>
                      <Ionicons name="call" size={18} color="#10B981" />
                    </View>
                    <View style={styles.contactInfo}>
                      <Text style={styles.contactLabel}>Telefone</Text>
                      <Text style={styles.contactValue}>{ownerProfile.phone}</Text>
                    </View>
                  </View>
                ) : null}

                {ownerProfile.email ? (
                  <View style={styles.contactItem}>
                    <View style={styles.contactIcon}>
                      <Ionicons name="mail" size={18} color="#10B981" />
                    </View>
                    <View style={styles.contactInfo}>
                      <Text style={styles.contactLabel}>E-mail</Text>
                      <Text style={styles.contactValue}>{ownerProfile.email}</Text>
                    </View>
                  </View>
                ) : null}

                {ownerProfile.address ? (
                  <View style={styles.contactItem}>
                    <View style={styles.contactIcon}>
                      <Ionicons name="location" size={18} color="#10B981" />
                    </View>
                    <View style={styles.contactInfo}>
                      <Text style={styles.contactLabel}>Endereço</Text>
                      <Text style={styles.contactValue}>{ownerProfile.address}</Text>
                    </View>
                  </View>
                ) : null}
              </View>
            </View>

            {/* Footer */}
            <View style={styles.documentFooter}>
              <Text style={styles.documentFooterText}>Documento gerado pelo e-Pet</Text>
            </View>
          </View>
        </ViewShot>

        {/* Compartilhar */}
        <TouchableOpacity
          style={[styles.shareButton, sharing && styles.shareButtonDisabled]}
          onPress={handleShare}
          disabled={sharing}
        >
          {sharing ? (
            <>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={styles.shareButtonText}>Gerando documento...</Text>
            </>
          ) : (
            <>
              <Ionicons name="share-social" size={22} color="#fff" />
              <Text style={styles.shareButtonText}>Compartilhar Carteira</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Copiar ID */}
        <TouchableOpacity style={styles.copyIdButton} onPress={copyPetId}>
          <Ionicons name="copy-outline" size={20} color={colors.primary} />
          <Text style={styles.copyIdButtonText}>Copiar ID do Pet</Text>
        </TouchableOpacity>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
    paddingBottom: 24,
    backgroundColor: colors.primary,
  },
  headerButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  shareableCard: {
    backgroundColor: '#fff',
  },
  documentHeader: {
    backgroundColor: colors.primary,
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  documentHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  documentHeaderText: {
    flex: 1,
  },
  documentTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 1,
  },
  documentSubtitle: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.9,
    marginTop: 2,
  },
  badge4YouPet: {
    backgroundColor: '#ff6b35',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badge4YouPetText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  documentFooter: {
    backgroundColor: colors.gray200,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    alignItems: 'center',
  },
  documentFooterText: {
    fontSize: 11,
    color: colors.gray600,
    fontWeight: '500',
  },
  card: {
    backgroundColor: '#fff',
    padding: 24,
  },
  mainInfo: {
    alignItems: 'center',
    marginBottom: 24,
  },
  petPhoto: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
  },
  petPhotoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  petName: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  petIdBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.tertiary,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  petIdText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  qrSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  qrContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.gray300,
  },
  qrHint: {
    fontSize: 12,
    color: colors.gray500,
    marginTop: 12,
  },
  infoSection: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray600,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  infoItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 12,
    color: colors.gray500,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  ageText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: colors.gray300,
    marginVertical: 20,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  contactIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactInfo: {
    flex: 1,
  },
  contactLabel: {
    fontSize: 12,
    color: colors.gray500,
    marginBottom: 2,
  },
  contactValue: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  shareButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 20,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  shareButtonDisabled: {
    opacity: 0.7,
  },
  shareButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  copyIdButton: {
    backgroundColor: colors.tertiary,
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  },
  copyIdButtonText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  bottomPadding: {
    height: 40,
  },
});
