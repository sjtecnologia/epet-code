/**
 * MyPetsScreen — lista todos os pets do usuário.
 *
 * Exibe em sequência:
 *  1. Pets do e-Pet (Firestore, coleção 'pets')
 *  2. Pets do 4YouPet (Firestore, coleção 'pet') — somente os sem epet_id
 *
 * Funcionalidades:
 *  - Indicador visual de vacinas vencidas por pet
 *  - Pull-to-refresh para recarregar ambas as listas
 *  - FAB para cadastrar novo pet
 */
import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Image,
  SafeAreaView,
  Platform,
} from 'react-native';
import { Alert } from '../../lib/alert';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { firestore, firebaseAuth } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Pet, FourYouPet } from '../../types/database.types';
import { MyPetsStackParamList } from '../../types/navigation.types';
import { colors } from '../../constants/colors';

type Props = {
  navigation: NativeStackNavigationProp<MyPetsStackParamList>;
};

export default function MyPetsScreen({ navigation }: Props) {
  const [pets, setPets] = useState<Pet[]>([]);
  const [fourYouPets, setFourYouPets] = useState<FourYouPet[]>([]);
  const [overdueByPet, setOverdueByPet] = useState<Record<string, number>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchFourYouPets = async () => {
    if (!user) return;
    try {
      const firebaseUid = firebaseAuth.currentUser?.uid;
      if (!firebaseUid) return;
      const petsQuery = query(
        collection(firestore, 'pet'),
        where('user_id', '==', firebaseUid)
      );
      const snapshot = await getDocs(petsQuery);
      const fetched: FourYouPet[] = snapshot.docs
        .filter(doc => {
          const d = doc.data();
          // Exclui pets com epet_id (mirrors de pets e-Pet, incluindo orphans)
          return !d.deleted && !d.epet_id;
        })
        .map(doc => ({ id: doc.id, ...doc.data() } as FourYouPet));
      setFourYouPets(fetched);
    } catch (err) {
      console.error('Erro ao buscar pets do 4YouPet:', err);
    }
  };

  const fetchAll = async () => {
    if (!user) return;
    try {
      const petsQuery = query(
        collection(firestore, 'pets'),
        where('user_id', '==', user.uid)
      );
      const petsSnapshot = await getDocs(petsQuery);
      const petList: Pet[] = petsSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Pet))
        .sort((a, b) => b.created_at.localeCompare(a.created_at));

      setPets(petList);

      if (petList.length > 0) {
        const today = new Date().toISOString().split('T')[0];
        const counts: Record<string, number> = {};
        await Promise.all(petList.map(async (p) => {
          const vaccinesQuery = query(
            collection(firestore, 'pets', p.id, 'vaccines'),
            where('next_due_date', '<', today)
          );
          const vacSnapshot = await getDocs(vaccinesQuery);
          if (!vacSnapshot.empty) counts[p.id] = vacSnapshot.size;
        }));
        setOverdueByPet(counts);
      } else {
        setOverdueByPet({});
      }
    } catch (err) {
      Alert.alert('Erro', 'Não foi possível carregar os pets');
      console.error(err);
    } finally {
      setLoading(false);
    }

    await fetchFourYouPets();
  };

  useFocusEffect(
    useCallback(() => {
      fetchAll();
    }, [user])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  };

  const getSpeciesIcon = (species: string): keyof typeof Ionicons.glyphMap => {
    switch (species) {
      case 'dog': return 'paw';
      case 'cat': return 'paw';
      case 'bird': return 'leaf';
      default: return 'paw';
    }
  };

  const getSpeciesColor = (species: string) => {
    switch (species) {
      case 'dog': return '#F59E0B';
      case 'cat': return colors.primary;
      case 'bird': return '#10B981';
      default: return colors.primary;
    }
  };

  const renderPetCard = ({ item }: { item: Pet }) => {
    const overdueCount = overdueByPet[item.id] || 0;
    return (
      <TouchableOpacity
        style={Platform.OS === 'ios' ? styles.cardIOS : styles.card}
        onPress={() => navigation.navigate('PetCard', { pet: item })}
        activeOpacity={0.7}
      >
        {overdueCount > 0 && (
          <View style={[
            styles.overdueBanner,
            Platform.OS === 'ios' ? { borderTopLeftRadius: 24, borderTopRightRadius: 24 } : null,
          ]}>
            <Ionicons name="alert-circle" size={15} color="#fff" />
            <Text style={styles.overdueBannerText}>
              {overdueCount === 1
                ? '1 vacina vencida'
                : `${overdueCount} vacinas vencidas`}
            </Text>
            <Ionicons name="medical" size={14} color="rgba(255,255,255,0.8)" />
          </View>
        )}
        <View style={styles.cardContent}>
          {item.photo_url ? (
            <Image source={{ uri: item.photo_url }} style={styles.petPhoto} />
          ) : (
            <View style={[styles.petPhotoPlaceholder, { backgroundColor: getSpeciesColor(item.species) + '20' }]}>
              <Ionicons name={getSpeciesIcon(item.species)} size={28} color={getSpeciesColor(item.species)} />
            </View>
          )}
          <View style={styles.petInfo}>
            <Text style={styles.petName}>{item.name}</Text>
            <View style={styles.petIdContainer}>
              <Ionicons name="id-card-outline" size={14} color={colors.primary} />
              <Text style={styles.petId}>{item.pet_id}</Text>
            </View>
            <Text style={styles.petBreed}>{item.breed || 'Sem raça definida'}</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={colors.gray400} />
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="paw" size={64} color={colors.gray400} />
      </View>
      <Text style={styles.emptyTitle}>Nenhum pet cadastrado</Text>
      <Text style={styles.emptyText}>
        Toque no botão abaixo para adicionar seu primeiro pet
      </Text>
      <TouchableOpacity
        style={styles.emptyButton}
        onPress={() => navigation.navigate('NewPet')}
      >
        <Ionicons name="add" size={20} color="#fff" />
        <Text style={styles.emptyButtonText}>Adicionar Pet</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Cabeçalho */}
        <View style={Platform.OS === 'ios' ? styles.headerIOS : styles.header}>
          <Text style={styles.headerTitle}>Meus Pets</Text>
          <Text style={styles.headerSubtitle}>
            {pets.length + fourYouPets.length}{' '}
            {pets.length + fourYouPets.length === 1 ? 'pet cadastrado' : 'pets cadastrados'}
          </Text>
        </View>

        <FlatList
          data={pets}
          renderItem={renderPetCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={
            pets.length === 0 && fourYouPets.length === 0
              ? styles.emptyContainer
              : styles.list
          }
          ListEmptyComponent={!loading && fourYouPets.length === 0 ? renderEmptyState : null}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            fourYouPets.length > 0 ? (
              <View>
                <View style={styles.sectionSeparator}>
                  <View style={styles.sectionLine} />
                  <View style={styles.sectionBadge}>
                    <Text style={styles.sectionBadgeText}>4YouPet</Text>
                  </View>
                  <View style={styles.sectionLine} />
                </View>
                {fourYouPets.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={Platform.OS === 'ios' ? styles.cardIOS : styles.card}
                    onPress={() => navigation.navigate('FourYouPetPet', { pet: item })}
                    activeOpacity={0.7}
                  >
                    <View style={styles.cardContent}>
                      {item.images && item.images.length > 0 ? (
                        <Image source={{ uri: item.images[0] }} style={styles.petPhoto} />
                      ) : (
                        <View style={[styles.petPhotoPlaceholder, { backgroundColor: '#ff6b3520' }]}>
                          <Ionicons name="paw" size={28} color="#ff6b35" />
                        </View>
                      )}
                      <View style={styles.petInfo}>
                        <Text style={styles.petName}>{item.name}</Text>
                        <View style={styles.petIdContainer}>
                          <Ionicons name="medical-outline" size={14} color="#ff6b35" />
                          <Text style={[styles.petId, { color: '#ff6b35' }]}>
                            {(item.vacinas || []).reduce(
                              (acc, v) => acc + (v.aplic?.filter(a => a.aplicated).length || 0),
                              0
                            )}{' '}
                            vacinas aplicadas
                          </Text>
                        </View>
                        <Text style={styles.petBreed}>{item.breed || 'Sem raça definida'}</Text>
                      </View>
                      <View style={styles.badge4YouPetSmall}>
                        <Text style={styles.badge4YouPetSmallText}>4YP</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={24} color={colors.gray400} />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
            />
          }
        />

        {/* FAB para adicionar novo pet */}
        <TouchableOpacity
          style={Platform.OS === 'ios' ? styles.fabIOS : styles.fab}
          onPress={() => navigation.navigate('NewPet')}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.primaryLight,
  },
  container: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 32,
    backgroundColor: colors.primaryLight,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerIOS: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 36,
    backgroundColor: colors.primaryLight,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '500',
  },
  list: {
    padding: 24,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 110 : 24,
  },
  emptyContainer: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.gray200,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: colors.gray600,
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardIOS: {
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderRadius: 24,
    marginBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  overdueBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EF4444',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  overdueBannerText: {
    flex: 1,
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  petPhoto: {
    width: 64,
    height: 64,
    borderRadius: 16,
  },
  petPhotoPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  petInfo: {
    flex: 1,
    marginLeft: 16,
  },
  petName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  petIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  petId: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '500',
  },
  petBreed: {
    fontSize: 14,
    color: colors.gray600,
  },
  fab: {
    position: 'absolute',
    bottom: 25,
    alignSelf: 'center',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabIOS: {
    position: 'absolute',
    bottom: 25,
    alignSelf: 'center',
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
  },
  sectionSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 0,
    marginVertical: 12,
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.gray300,
  },
  sectionBadge: {
    backgroundColor: '#ff6b35',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginHorizontal: 10,
  },
  sectionBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  badge4YouPetSmall: {
    backgroundColor: '#ff6b35',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 6,
  },
  badge4YouPetSmallText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
});
