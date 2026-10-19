/**
 * FourYouPetPetScreen — exibe os detalhes de um pet importado do 4YouPet (Firestore).
 *
 * Se o pet ainda não possuír um pet_id, gera um automaticamente e
 * atualiza o documento no Firestore. Exibe vacinas aplicadas e pendentes
 * e permite navegar para a tela de edição.
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  StyleSheet,
  Platform,
} from 'react-native';
import { Alert } from '../../lib/alert';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { doc, updateDoc } from 'firebase/firestore';
import { firestore } from '../../lib/firebase';
import { DashboardStackParamList } from '../../types/navigation.types';
import { FourYouPetAplic } from '../../types/database.types';
import { colors } from '../../constants/colors';
import { generatePetId, formatDisplayDate, calculateAgeYearMonths } from '../../lib/petForm';

type Props = {
  navigation: NativeStackNavigationProp<DashboardStackParamList, 'FourYouPetPet'>;
  route: RouteProp<DashboardStackParamList, 'FourYouPetPet'>;
};

export default function FourYouPetPetScreen({ navigation, route }: Props) {
  const { pet } = route.params;
  // Se o pet não tem pet_id, gera um novo id como estado inicial
  const [petId] = useState<string>(() => pet.pet_id || generatePetId());

  // Persiste o pet_id gerado no Firestore quando não existia
  useEffect(() => {
    if (!pet.pet_id) {
      const petRef = doc(firestore, 'pet', pet.id);
      updateDoc(petRef, { pet_id: petId }).catch(console.error);
    }
  }, [pet.id, pet.pet_id, petId]);

  /** Copia o ID do pet para a área de transferência */
  const copyPetId = async () => {
    if (!petId) return;
    await Clipboard.setStringAsync(petId);
    Alert.alert('Copiado!', 'ID do pet copiado para a área de transferência.');
  };

  // Desaninha as aplicações de vacinas em uma lista plana para exibição
  // Achata todas as aplicações de vacinas
  const allApplications: (FourYouPetAplic & { vacinaIndex: number })[] = [];
  (pet.vacinas || []).forEach((vacina, vacinaIdx) => {
    (vacina.aplic || []).forEach((aplic) => {
      allApplications.push({ ...aplic, vacinaIndex: vacinaIdx + 1 });
    });
  });

  const appliedVaccines = allApplications.filter((a) => a.aplicated);
  const pendingVaccines = allApplications.filter((a) => !a.aplicated);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{pet.name}</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('EditFourYouPet', { pet: { ...pet, pet_id: petId } })}
          style={styles.backButton}
        >
          <Ionicons name="create-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Card do pet */}
        <View style={styles.petCard}>
          <View style={styles.petPhotoContainer}>
            {pet.images && pet.images.length > 0 ? (
              <Image source={{ uri: pet.images[0] }} style={styles.petPhoto} />
            ) : (
              <View style={styles.petPhotoPlaceholder}>
                <Ionicons name="paw" size={48} color={colors.gray400} />
              </View>
            )}
            <View style={styles.badge4YouPet}>
              <Text style={styles.badge4YouPetText}>4YouPet</Text>
            </View>
          </View>

          <Text style={styles.petName}>{pet.name}</Text>
          {calculateAgeYearMonths(pet.birth) ? (
            <Text style={styles.petAge}>{calculateAgeYearMonths(pet.birth)}</Text>
          ) : null}
        </View>

        {/* Pet ID */}
        <View style={styles.petIdSection}>
          <View style={styles.petIdRow}>
            <Ionicons name="id-card" size={18} color={colors.primary} />
            <Text style={styles.petIdLabel}>ID do Pet:</Text>
            <Text style={styles.petIdValue} numberOfLines={1}>
              {petId || '...'}
            </Text>
          </View>
          <TouchableOpacity style={styles.copyIdButton} onPress={copyPetId}>
            <Ionicons name="copy-outline" size={18} color={colors.primary} />
            <Text style={styles.copyIdText}>Copiar ID</Text>
          </TouchableOpacity>
        </View>

        {/* Carteira do Pet */}
        <TouchableOpacity
          style={styles.carteiraButton}
          onPress={() => navigation.navigate('FourYouPetCard', { pet: { ...pet, pet_id: petId } })}
        >
          <Ionicons name="card-outline" size={22} color="#fff" />
          <Text style={styles.carteiraButtonText}>Carteira do Pet</Text>
        </TouchableOpacity>

        {/* Informações */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informações</Text>
          <View style={styles.infoGrid}>
            <InfoItem icon="paw" label="Raça" value={pet.breed || 'Não informado'} />
            <InfoItem icon="calendar" label="Nascimento" value={formatDisplayDate(pet.birth)} />
            <InfoItem icon="resize" label="Porte" value={pet.size || 'Não informado'} />
            <InfoItem icon="color-palette" label="Cor" value={pet.color || 'Não informado'} />
            <InfoItem icon="cut" label="Castrado" value={pet.castrado ? 'Sim' : 'Não'} />
          </View>
        </View>

        {/* Vacinas aplicadas */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Vacinas Aplicadas</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{appliedVaccines.length}</Text>
            </View>
          </View>

          {appliedVaccines.length === 0 ? (
            <Text style={styles.emptyText}>Nenhuma vacina aplicada registrada.</Text>
          ) : (
            appliedVaccines.map((aplic, idx) => (
              <View key={idx} style={styles.vaccineCard}>
                <View style={styles.vaccineIconContainer}>
                  <Ionicons name="checkmark-circle" size={22} color="#22c55e" />
                </View>
                <View style={styles.vaccineInfo}>
                  <Text style={styles.vaccineName}>
                    Vacina {aplic.vacinaIndex} — Dose {idx + 1}
                  </Text>
                  <Text style={styles.vaccineDate}>
                    Aplicada em: {formatDisplayDate(aplic.dataaplicacao)}
                  </Text>
                  {aplic.marca && <Text style={styles.vaccineMeta}>Marca: {aplic.marca}</Text>}
                  {aplic.lote && <Text style={styles.vaccineMeta}>Lote: {aplic.lote}</Text>}
                </View>
              </View>
            ))
          )}
        </View>

        {/* Vacinas pendentes */}
        {pendingVaccines.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Vacinas Pendentes</Text>
              <View style={[styles.countBadge, styles.countBadgePending]}>
                <Text style={styles.countBadgeText}>{pendingVaccines.length}</Text>
              </View>
            </View>

            {pendingVaccines.map((aplic, idx) => (
              <View key={idx} style={[styles.vaccineCard, styles.vaccineCardPending]}>
                <View style={styles.vaccineIconContainer}>
                  <Ionicons name="time-outline" size={22} color="#f59e0b" />
                </View>
                <View style={styles.vaccineInfo}>
                  <Text style={styles.vaccineName}>
                    Vacina {aplic.vacinaIndex} — Dose {idx + 1}
                  </Text>
                  <Text style={styles.vaccineDate}>
                    Prevista: {formatDisplayDate(aplic.dataaplicacao)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

function InfoItem({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoItem}>
      <Ionicons name={icon} size={18} color={colors.primary} />
      <View>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primary,
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  petCard: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  petPhotoContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  petPhoto: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 3,
    borderColor: colors.primary,
  },
  petPhotoPlaceholder: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.gray300,
  },
  badge4YouPet: {
    position: 'absolute',
    bottom: 0,
    right: -4,
    backgroundColor: '#ff6b35',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badge4YouPetText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  petName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  petAge: {
    fontSize: 14,
    color: colors.gray500,
    marginTop: 2,
  },
  petIdSection: {
    backgroundColor: '#fff',
    marginBottom: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 10,
  },
  petIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  petIdLabel: {
    fontSize: 14,
    color: colors.gray500,
    fontWeight: '500',
  },
  petIdValue: {
    flex: 1,
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  copyIdButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: colors.gray100,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  copyIdText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
  },
  carteiraButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    paddingVertical: 14,
  },
  carteiraButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 0,
    marginBottom: 12,
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 14,
  },
  infoGrid: {
    gap: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoLabel: {
    fontSize: 12,
    color: colors.gray500,
  },
  infoValue: {
    fontSize: 15,
    color: '#1a1a1a',
    fontWeight: '500',
  },
  countBadge: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 14,
  },
  countBadgePending: {
    backgroundColor: '#f59e0b',
  },
  countBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  vaccineCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f0fdf4',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    gap: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#22c55e',
  },
  vaccineCardPending: {
    backgroundColor: '#fffbeb',
    borderLeftColor: '#f59e0b',
  },
  vaccineIconContainer: {
    marginTop: 1,
  },
  vaccineInfo: {
    flex: 1,
    gap: 2,
  },
  vaccineName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  vaccineDate: {
    fontSize: 13,
    color: colors.gray600,
  },
  vaccineMeta: {
    fontSize: 12,
    color: colors.gray500,
  },
  emptyText: {
    fontSize: 14,
    color: colors.gray500,
    textAlign: 'center',
    paddingVertical: 8,
  },
});
