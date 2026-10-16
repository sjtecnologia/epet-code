/**
 * PetCardScreen — exibe a carteira digital do pet e-Pet.
 *
 * Mostra foto, dados do pet e do tutor, QR Code e botões
 * para compartilhar a carteira como imagem e copiar o ID do pet.
 * O compartilhamento usa ViewShot para capturar a UI como PNG
 * e expo-sharing para enviar via outros aplicativos.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Platform,
  Dimensions,
} from 'react-native';
import { Alert } from '../../lib/alert';
import { LineChart } from 'react-native-gifted-charts';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp, useFocusEffect } from '@react-navigation/native';
import QRCode from 'react-native-qrcode-svg';           // gerador de QR Code naívo
import * as Clipboard from 'expo-clipboard';             // copia texto para a área de transferência
import ViewShot, { type ViewShotRef } from 'react-native-view-shot'; // captura uma View como imagem
import * as FileSystem from 'expo-file-system/legacy';   // manipulação de arquivos no cache
import * as Sharing from 'expo-sharing';                // compartilhamento nativo de arquivos
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { firestore } from '../../lib/firebase';
import { Pet } from '../../types/database.types';
import { colors } from '../../constants/colors';
import { DashboardStackParamList } from '../../types/navigation.types';
import { lastPetKey } from './DashboardScreen';
import { useAuth } from '../../contexts/AuthContext';

const SCREEN_WIDTH = Dimensions.get('window').width;

/** Largura útil do gráfico dentro do card (descontando paddings e o eixo Y). */
const CHART_Y_AXIS_WIDTH = 44;
const CHART_WIDTH = SCREEN_WIDTH - 20 * 2 - 16 * 2 - CHART_Y_AXIS_WIDTH;

/** Converte DD/MM/AAAA → timestamp para ordenação cronológica */
const parseDateBR = (dateStr: string): number => {
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const [d, m, y] = parts;
    return new Date(Number(y), Number(m) - 1, Number(d)).getTime();
  }
  return 0;
};

type Props = {
  navigation: NativeStackNavigationProp<DashboardStackParamList, 'PetCard'>;
  route: RouteProp<DashboardStackParamList, 'PetCard'>;
};

export default function PetCardScreen({ navigation, route }: Props) {
  const { pet } = route.params;                    // dados do pet recebidos via navegação
  const { user } = useAuth();
  const qrRef = useRef<QRCode | null>(null);        // ref do componente QRCode (não usado diretamente)
  const cardRef = useRef<ViewShotRef>(null); // ref para a View que será capturada pelo ViewShot
  const [sharing, setSharing] = useState(false);   // bloqueia o botão enquanto gera e compartilha a imagem
  const [pesagens, setPesagens] = useState<{ peso: number; data: string }[]>([]);

  // Salva este pet como o último acessado para o acesso rápido da tela Início
  useEffect(() => {
    if (user) AsyncStorage.setItem(lastPetKey(user.uid), JSON.stringify(pet)).catch(() => {});
  }, [pet.id, user?.uid]);

  // Busca os registros de peso sempre que a tela ganhar foco
  useFocusEffect(useCallback(() => {
    const fetchPesos = async () => {
      try {
        const q = query(
          collection(firestore, 'pets', pet.id, 'weights'),
          orderBy('created_at', 'asc'),
        );
        const snapshot = await getDocs(q);
        setPesagens(snapshot.docs.map(d => {
          const item = d.data();
          return { peso: item.peso as number, data: item.data as string };
        }));
      } catch (_) {
        // silently fail — gráfico simplesmente não aparece
      }
    };
    fetchPesos();
  }, [pet.id]));

  /** Formata uma data ISO para exibição no padrão DD/MM/AAAA */
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Não informado';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  /** Calcula a idade do pet a partir da data de nascimento no formato AAAA-MM-DD */
  const calculateAge = (dateString: string | null): string => {
    if (!dateString) return '';
    
    const today = new Date();
    const birth = new Date(dateString);
    
    let years = today.getFullYear() - birth.getFullYear();
    let months = today.getMonth() - birth.getMonth();
    let days = today.getDate() - birth.getDate();
    
    if (days < 0) {
      months--;
      const lastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      days += lastMonth.getDate();
    }
    
    if (months < 0) {
      years--;
      months += 12;
    }
    
    if (years > 0) {
      return years === 1 ? '1 ano' : `${years} anos`;
    } else if (months > 0) {
      return months === 1 ? '1 mês' : `${months} meses`;
    } else {
      return days === 1 ? '1 dia' : `${days} dias`;
    }
  };

  /** Retorna o rótulo legfível da espécie em português */
  const getSpeciesLabel = (species: string) => {
    switch (species) {
      case 'dog': return 'Cachorro';
      case 'cat': return 'Gato';
      case 'bird': return 'Pássaro';
      default: return 'Outro';
    }
  };

  /** Retorna o nome do ícone Ionicons para a espécie do pet */
  const getSpeciesIcon = (species: string): keyof typeof Ionicons.glyphMap => {
    switch (species) {
      case 'dog': return 'paw';
      case 'cat': return 'paw';
      case 'bird': return 'leaf';
      default: return 'paw';
    }
  };

  /**
   * handleShare — captura a carteira como imagem PNG e abre o menu de compartilhamento.
   *
   * Fluxo:
   * 1. Verifica se o compartilhamento está disponível no dispositivo.
   * 2. Captura a View referenciada por cardRef usando ViewShot.
   * 3. Move o arquivo para o cache do app com um nome único.
   * 4. Chama expo-sharing para abrir o menu nativo de compartilhamento.
   */
  const handleShare = async () => {
    try {
      setSharing(true);
      
      if (!cardRef.current) {
        Alert.alert('Erro', 'Não foi possível gerar o documento.');
        setSharing(false);
        return;
      }

      // Verifica se o dispositivo pode compartilhar
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Erro', 'Compartilhamento não disponível neste dispositivo.');
        setSharing(false);
        return;
      }

      // Captura a view como imagem
      const uri = await cardRef.current?.capture?.();
      
      if (!uri) {
        Alert.alert('Erro', 'Não foi possível capturar a imagem.');
        setSharing(false);
        return;
      }
      
      // Cria um nome único para o arquivo
      const fileName = `e-Pet_${pet.name.replace(/\s+/g, '_')}_${Date.now()}.png`;
      const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
      
      // Move a imagem para o diretório de cache
      await FileSystem.moveAsync({
        from: uri,
        to: fileUri,
      });

      // Compartilha a imagem usando expo-sharing
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

  /** Copia o ID do pet para a área de transferência e exibe confirmação */
  const copyPetId = async () => {
    await Clipboard.setStringAsync(pet.pet_id);
    Alert.alert('Copiado!', 'ID do pet copiado para a área de transferência.');
  };

  // O QR contém somente o identificador necessário para a busca do pet.
  const qrValue = pet.pet_id;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Carteira do Pet</Text>
        <TouchableOpacity onPress={() => navigation.navigate('EditPet', { pet })} style={styles.headerButton}>
          <Ionicons name="create-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Card Principal - Wrapped em ViewShot para captura */}
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
              </View>
            </View>

            {/* Card Principal */}
            <View style={styles.card}>
              {/* Foto e Info Principal */}
              <View style={styles.mainInfo}>
                {pet.photo_url ? (
                  <Image source={{ uri: pet.photo_url }} style={styles.petPhoto} />
                ) : (
                  <View style={styles.petPhotoPlaceholder}>
                    <Ionicons name={getSpeciesIcon(pet.species)} size={48} color={colors.primary} />
                  </View>
                )}
                <Text style={styles.petName}>{pet.name}</Text>
                
                <TouchableOpacity style={styles.petIdBadge} onPress={copyPetId} activeOpacity={0.7}>
                  <Ionicons name="copy-outline" size={14} color={colors.primary} />
                  <Text style={styles.petIdText}>{pet.pet_id}</Text>
                </TouchableOpacity>
              </View>

              {/* QR Code */}
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

              {/* Informações do Pet */}
              <View style={styles.infoSection}>
                <Text style={styles.sectionTitle}>Informações do Pet</Text>
                
                <View style={styles.infoRow}>
                  <View style={styles.infoItem}>
                    <View style={styles.infoIcon}>
                      <Ionicons name={getSpeciesIcon(pet.species)} size={18} color={colors.primary} />
                    </View>
                    <View>
                      <Text style={styles.infoLabel}>Espécie</Text>
                      <Text style={styles.infoValue}>{getSpeciesLabel(pet.species)}</Text>
                    </View>
                  </View>
                  <View style={styles.infoItem}>
                    <View style={styles.infoIcon}>
                      <Ionicons name="heart" size={18} color={colors.primary} />
                    </View>
                    <View>
                      <Text style={styles.infoLabel}>Raça</Text>
                      <Text style={styles.infoValue}>{pet.breed || 'Não informado'}</Text>
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
                      <Text style={styles.infoValue}>{formatDate(pet.birth_date)}</Text>
                      {pet.birth_date && (
                        <Text style={styles.ageText}>{calculateAge(pet.birth_date)}</Text>
                      )}
                    </View>
                  </View>
                </View>
              </View>

              <View style={styles.divider} />

              {/* Informações do Tutor */}
              <View style={styles.infoSection}>
                <Text style={styles.sectionTitle}>Dados do Tutor</Text>
                
                <View style={styles.contactItem}>
                  <View style={styles.contactIcon}>
                    <Ionicons name="person" size={18} color="#10B981" />
                  </View>
                  <View style={styles.contactInfo}>
                    <Text style={styles.contactLabel}>Nome</Text>
                    <Text style={styles.contactValue}>{pet.owner_name}</Text>
                  </View>
                </View>

                <View style={styles.contactItem}>
                  <View style={styles.contactIcon}>
                    <Ionicons name="call" size={18} color="#10B981" />
                  </View>
                  <View style={styles.contactInfo}>
                    <Text style={styles.contactLabel}>Telefone</Text>
                    <Text style={styles.contactValue}>{pet.owner_phone}</Text>
                  </View>
                </View>

                {pet.owner_email && (
                  <View style={styles.contactItem}>
                    <View style={styles.contactIcon}>
                      <Ionicons name="mail" size={18} color="#10B981" />
                    </View>
                    <View style={styles.contactInfo}>
                      <Text style={styles.contactLabel}>E-mail</Text>
                      <Text style={styles.contactValue}>{pet.owner_email}</Text>
                    </View>
                  </View>
                )}

                {pet.address && (
                  <View style={styles.contactItem}>
                    <View style={styles.contactIcon}>
                      <Ionicons name="location" size={18} color="#10B981" />
                    </View>
                    <View style={styles.contactInfo}>
                      <Text style={styles.contactLabel}>Endereço</Text>
                      <Text style={styles.contactValue}>{pet.address}</Text>
                    </View>
                  </View>
                )}
              </View>

              {pet.notes && (
                <>
                  <View style={styles.divider} />
                  <View style={styles.infoSection}>
                    <Text style={styles.sectionTitle}>Observações</Text>
                    <Text style={styles.notesText}>{pet.notes}</Text>
                  </View>
                </>
              )}
            </View>

            {/* Footer do Documento */}
            <View style={styles.documentFooter}>
              <Text style={styles.documentFooterText}>
                Documento gerado pelo e-Pet
              </Text>
            </View>
          </View>
        </ViewShot>

        {/* Botão de Compartilhar */}
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

        {/* Ações compactas: Vacinas, Prontuário, Pesos */}
        <View style={styles.actionsCard}>
          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => navigation.navigate('Vaccines', { pet })}
            activeOpacity={0.7}
          >
            <View style={styles.actionRowIcon}>
              <Ionicons name="bandage-outline" size={20} color={colors.primary} />
            </View>
            <Text style={styles.actionRowLabel}>Vacinas</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.gray400} />
          </TouchableOpacity>

          <View style={styles.actionDivider} />

          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => navigation.navigate('Prontuario', { pet })}
            activeOpacity={0.7}
          >
            <View style={styles.actionRowIcon}>
              <Ionicons name="clipboard-outline" size={20} color={colors.primary} />
            </View>
            <Text style={styles.actionRowLabel}>Prontuário</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.gray400} />
          </TouchableOpacity>

          <View style={styles.actionDivider} />

          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => navigation.navigate('Pesos', { pet })}
            activeOpacity={0.7}
          >
            <View style={styles.actionRowIcon}>
              <Ionicons name="scale-outline" size={20} color={colors.primary} />
            </View>
            <Text style={styles.actionRowLabel}>Pesos</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.gray400} />
          </TouchableOpacity>

          {/* Gráfico de evolução de peso dentro do mesmo card */}
          {pesagens.length > 0 && (() => {
            // Ordena cronologicamente pelo campo `data` (DD/MM/AAAA), independente
            // da ordem de inserção — resolve o bug de datas fora de sequência
            const sorted = [...pesagens].sort((a, b) => parseDateBR(a.data) - parseDateBR(b.data));
            const dados = sorted.slice(-6);
            // Um único ponto não desenha linha: duplica o valor para formar o par
            const chartData = dados.length === 1
              ? [
                  { value: dados[0].peso, label: dados[0].data.slice(0, 5) },
                  { value: dados[0].peso, label: '' },
                ]
              : dados.map((p) => ({ value: p.peso, label: p.data.slice(0, 5) }));
            const ultimoPeso = sorted[sorted.length - 1];
            return (
              <>
                <View style={styles.actionDivider} />
                <View style={styles.chartInCard}>
                  <View style={styles.weightCardHeader}>
                    <Text style={styles.weightCardTitle}>Evolução de Peso</Text>
                    <Text style={styles.weightCardCurrent}>{ultimoPeso.peso.toFixed(1)} kg</Text>
                  </View>
                  <LineChart
                    data={chartData}
                    width={CHART_WIDTH}
                    height={170}
                    yAxisLabelWidth={CHART_Y_AXIS_WIDTH}
                    yAxisLabelSuffix=" kg"
                    color={colors.primary}
                    thickness={2.5}
                    dataPointsColor={colors.primary}
                    dataPointsRadius={5}
                    curved={chartData.length > 2}
                    noOfSections={4}
                    rulesColor={colors.gray200}
                    yAxisColor="transparent"
                    xAxisColor={colors.gray300}
                    yAxisTextStyle={{ color: colors.gray600, fontSize: 11 }}
                    xAxisLabelTextStyle={{ color: colors.gray500, fontSize: 10 }}
                  />
                </View>
              </>
            );
          })()}
        </View>

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
    paddingTop: 60,
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
  notesText: {
    fontSize: 14,
    color: colors.gray700,
    lineHeight: 22,
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
  vaccinesButton: {
    display: 'none',
  },
  vaccinesButtonText: {
    display: 'none',
  },
  actionsCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  actionRowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionRowLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  actionDivider: {
    height: 1,
    backgroundColor: colors.gray200,
    marginLeft: 64,
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
  chartInCard: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  weightCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  weightCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray700,
  },
  weightCardCurrent: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
  },
});
