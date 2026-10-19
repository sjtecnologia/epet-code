/**
 * DashboardScreen — tela "Início" do app.
 *
 * Exibe:
 *  - Contador total de pets do usuário
 *  - Botão para adicionar novo pet
 *  - Carrossel com até 10 produtos da coleção 'products' do 4YouPet
 *  - Botão de acesso rápido à carteira do último pet acessado
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  SafeAreaView,
  Platform,
  ScrollView,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { collection, query, where, getDocs, limit, doc, getDoc } from 'firebase/firestore';
import { firestore, firebaseAuth, firestore4YouPet } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Pet } from '../../types/database.types';
import { DashboardStackParamList } from '../../types/navigation.types';
import { colors } from '../../constants/colors';

export const lastPetKey = (uid: string) => `@epet_last_pet_${uid}`;

/** Produto exibido no carrossel da coleção 'products' do 4YouPet */
type CarouselProduct = {
  id: string;
  name?: string;
  images?: string | string[];
};

type Props = {
  navigation: NativeStackNavigationProp<DashboardStackParamList>;
};

export default function DashboardScreen({ navigation }: Props) {
  const [totalPets, setTotalPets] = useState(0);
  const [carouselItems, setCarouselItems] = useState<CarouselProduct[]>([]);
  const [lastPet, setLastPet] = useState<Pet | null>(null);
  const [loadingCarousel, setLoadingCarousel] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const carouselRef = useRef<FlatList>(null);
  const autoScrollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { user } = useAuth();
  const { width } = useWindowDimensions();

  /** Conta o total de pets do usuário (e-Pet + 4YouPet sem duplicatas) */
  const fetchTotalPets = useCallback(async () => {
    if (!user) return;
    try {
      const firebaseUid = firebaseAuth.currentUser?.uid;
      const ePetQuery = query(collection(firestore, 'pets'), where('user_id', '==', user.uid));
      const ePetSnapshot = await getDocs(ePetQuery);

      let fourYouCount = 0;
      if (firebaseUid) {
        const fourYouQuery = query(
          collection(firestore, 'pet'),
          where('user_id', '==', firebaseUid),
        );
        const fourYouSnapshot = await getDocs(fourYouQuery);
        fourYouCount = fourYouSnapshot.docs.filter((d) => {
          const data = d.data();
          // Exclui mirrors de pets e-Pet (com epet_id), mesmo que sejam órfãos
          return !data.deleted && !data.epet_id;
        }).length;
      }
      setTotalPets(ePetSnapshot.size + fourYouCount);
    } catch (err) {
      console.error('Erro ao contar pets:', err);
    }
  }, [user]);

  /** Busca até 10 produtos da coleção 'products' do 4YouPet para o carrossel */
  const fetchCarousel = useCallback(async () => {
    try {
      setLoadingCarousel(true);
      const productsQuery = query(collection(firestore4YouPet, 'products'), limit(10));
      const snapshot = await getDocs(productsQuery);
      setCarouselItems(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      console.error('Erro ao buscar produtos:', err);
    } finally {
      setLoadingCarousel(false);
    }
  }, []);

  /** Carrega o último pet acessado salvo no AsyncStorage e valida se ainda existe no Firestore */
  const loadLastPet = useCallback(async () => {
    if (!user) return;
    try {
      const data = await AsyncStorage.getItem(lastPetKey(user.uid));
      if (!data) {
        setLastPet(null);
        return;
      }
      const cached: Pet = JSON.parse(data);
      // Verifica se o pet ainda existe no Firestore antes de exibir
      const petSnap = await getDoc(doc(firestore, 'pets', cached.id));
      if (petSnap.exists()) {
        setLastPet(cached);
      } else {
        await AsyncStorage.removeItem(lastPetKey(user.uid));
        setLastPet(null);
      }
    } catch (err) {
      console.error('Erro ao carregar último pet:', err);
    }
  }, [user]);

  // Recarrega contador e último pet toda vez que a tela entra em foco
  useFocusEffect(
    useCallback(() => {
      fetchTotalPets();
      loadLastPet();
    }, [fetchTotalPets, loadLastPet]),
  );

  // Busca o carrossel apenas na montagem do componente
  useEffect(() => {
    fetchCarousel();
  }, [fetchCarousel]);

  // Auto-scroll do carrossel a cada 3 segundos
  useEffect(() => {
    if (carouselItems.length === 0) return;
    autoScrollRef.current = setInterval(() => {
      setActiveIndex((prev) => {
        const next = (prev + 1) % carouselItems.length;
        carouselRef.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, 3000);
    return () => {
      if (autoScrollRef.current) clearInterval(autoScrollRef.current);
    };
  }, [carouselItems.length]);

  const CAROUSEL_ITEM_WIDTH = width - 48;

  const renderCarouselItem = ({ item }: { item: CarouselProduct }) => {
    const imageUrl = Array.isArray(item.images) ? item.images[0] : item.images;
    return (
      <View style={[styles.carouselItem, { width: CAROUSEL_ITEM_WIDTH }]}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.carouselImage} resizeMode="cover" />
        ) : (
          <View style={styles.carouselPlaceholder}>
            <Ionicons name="image-outline" size={48} color={colors.gray400} />
          </View>
        )}
        {item.name ? (
          <View style={styles.carouselLabelContainer}>
            <Text style={styles.carouselLabel} numberOfLines={1}>
              {item.name}
            </Text>
          </View>
        ) : null}
      </View>
    );
  };

  // ─── Render principal ───────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Cabeçalho com logo */}
        <View style={Platform.OS === 'ios' ? styles.headerIOS : styles.header}>
          <Image
            source={require('../../../logoepet/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {/* Linha: contador de pets + botão adicionar */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Ionicons name="paw" size={24} color={colors.primary} />
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={styles.statNumber}>{totalPets}</Text>
              <Text style={styles.statLabel}>Pets</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('NewPet')}
            activeOpacity={0.8}
          >
            <Ionicons name="add-circle-outline" size={24} color="#fff" />
            <Text style={styles.addButtonText}>Adicionar Pet</Text>
          </TouchableOpacity>
        </View>

        {/* Carrossel de produtos 4YouPet */}
        <View style={styles.carouselSection}>
          <Text style={styles.sectionTitle}>Anúncios</Text>
          {loadingCarousel ? (
            <ActivityIndicator color={colors.primary} style={styles.carouselLoader} />
          ) : carouselItems.length > 0 ? (
            <>
              <FlatList
                ref={carouselRef}
                data={carouselItems}
                renderItem={renderCarouselItem}
                keyExtractor={(item) => item.id}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                snapToInterval={CAROUSEL_ITEM_WIDTH}
                decelerationRate="fast"
                contentContainerStyle={{ paddingHorizontal: 0 }}
                onMomentumScrollEnd={(e) => {
                  const idx = Math.round(e.nativeEvent.contentOffset.x / CAROUSEL_ITEM_WIDTH);
                  setActiveIndex(idx);
                  // Reinicia o auto-scroll após interação manual
                  if (autoScrollRef.current) clearInterval(autoScrollRef.current);
                  autoScrollRef.current = setInterval(() => {
                    setActiveIndex((prev) => {
                      const next = (prev + 1) % carouselItems.length;
                      carouselRef.current?.scrollToIndex({ index: next, animated: true });
                      return next;
                    });
                  }, 3000);
                }}
                getItemLayout={(_, index) => ({
                  length: CAROUSEL_ITEM_WIDTH,
                  offset: CAROUSEL_ITEM_WIDTH * index,
                  index,
                })}
              />
              {/* Indicadores de página (dots) */}
              <View style={styles.dotsRow}>
                {carouselItems.map((_, i) => (
                  <View key={i} style={[styles.dot, i === activeIndex && styles.dotActive]} />
                ))}
              </View>
            </>
          ) : (
            <View style={styles.carouselEmpty}>
              <Ionicons name="storefront-outline" size={40} color={colors.gray400} />
              <Text style={styles.carouselEmptyText}>Nenhum produto disponível</Text>
            </View>
          )}
        </View>

        {/* Acesso rápido: carteira do último pet acessado */}
        <View style={styles.lastPetSection}>
          <Text style={styles.sectionTitle}>Acesso rápido</Text>
          {lastPet ? (
            <TouchableOpacity
              style={styles.lastPetCard}
              onPress={() => navigation.navigate('PetCard', { pet: lastPet })}
              activeOpacity={0.8}
            >
              {lastPet.photo_url ? (
                <Image source={{ uri: lastPet.photo_url }} style={styles.lastPetPhoto} />
              ) : (
                <View style={styles.lastPetPhotoPlaceholder}>
                  <Ionicons name="paw" size={26} color={colors.primary} />
                </View>
              )}
              <View style={styles.lastPetInfo}>
                <Text style={styles.lastPetLabel}>Carteira de</Text>
                <Text style={styles.lastPetName}>{lastPet.name}</Text>
              </View>
              <Ionicons name="card-outline" size={26} color={colors.primary} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.emptyPetCard}
              onPress={() => navigation.navigate('NewPet')}
              activeOpacity={0.8}
            >
              <View style={styles.emptyPetIconWrap}>
                <Ionicons name="paw-outline" size={28} color={colors.primary} />
              </View>
              <View style={styles.lastPetInfo}>
                <Text style={styles.emptyPetTitle}>Nenhum pet cadastrado</Text>
                <Text style={styles.emptyPetSubtitle}>
                  Toque aqui para adicionar seu primeiro pet
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.gray400} />
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.primaryLight,
  },
  scrollContent: {
    paddingBottom: 32,
    backgroundColor: colors.backgroundLight,
  },
  header: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 32,
    backgroundColor: colors.primaryLight,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerIOS: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 36,
    backgroundColor: colors.backgroundLight,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
  },
  logo: {
    width: 220,
    height: 80,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginTop: -20,
    marginBottom: 24,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 28,
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 13,
    color: colors.gray600,
    textAlign: 'center',
  },
  addButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  // ─── Carrossel ───────────────────────────────────────────────────────────────
  carouselSection: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: Platform.OS === 'ios' ? '700' : '700',
    color: colors.textPrimary,
    marginBottom: 12,
    letterSpacing: Platform.OS === 'ios' ? -0.3 : 0,
  },
  carouselLoader: {
    marginVertical: 40,
  },
  carouselItem: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: colors.gray200,
    height: 200,
  },
  carouselImage: {
    width: '100%',
    height: '100%',
  },
  carouselPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  carouselLabelContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    backgroundColor: '#fff',
    borderRadius: Platform.OS === 'ios' ? 20 : 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: Platform.OS === 'ios' ? 2 : 4 },
    shadowOpacity: Platform.OS === 'ios' ? 0.07 : 0.08,
    shadowRadius: Platform.OS === 'ios' ? 8 : 12,
    elevation: 4,
  },
  carouselLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  carouselEmpty: {
    height: 200,
    borderRadius: 20,
    backgroundColor: colors.gray200,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  carouselEmptyText: {
    fontSize: 14,
    color: colors.gray500,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
    gap: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.gray300,
  },
  dotActive: {
    width: 20,
    backgroundColor: colors.primary,
  },
  // ─── Último pet ──────────────────────────────────────────────────────────────
  lastPetSection: {
    paddingHorizontal: 24,
  },
  lastPetCard: {
    backgroundColor: '#fff',
    borderRadius: Platform.OS === 'ios' ? 16 : 20,
    padding: Platform.OS === 'ios' ? 14 : 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: Platform.OS === 'ios' ? 1 : 4 },
    shadowOpacity: Platform.OS === 'ios' ? 0.07 : 0.08,
    shadowRadius: Platform.OS === 'ios' ? 6 : 12,
    elevation: 4,
  },
  lastPetPhoto: {
    width: 56,
    height: 56,
    borderRadius: 14,
  },
  lastPetPhotoPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lastPetInfo: {
    flex: 1,
  },
  lastPetLabel: {
    fontSize: 12,
    color: colors.gray500,
    marginBottom: 2,
  },
  lastPetName: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  emptyPetCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1.5,
    borderColor: colors.primaryLight,
    borderStyle: 'dashed',
  },
  emptyPetIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyPetTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  emptyPetSubtitle: {
    fontSize: 12,
    color: colors.gray500,
  },
});
