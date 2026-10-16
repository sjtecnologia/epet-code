/**
 * EditPetScreen — tela de edição dos dados de um pet e-Pet.
 *
 * Pré-popula o formulário com os dados existentes (recebidos via navegação),
 * permite alterar foto, espécie, raça, data de nascimento, endereço e dados
 * do tutor. Ao salvar, atualiza o documento na coleção 'pets' do Firestore
 * e faz novo upload de foto no Firebase Storage se ela foi alterada.
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  KeyboardAvoidingView,
  Platform,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Alert } from '../../lib/alert';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { doc, updateDoc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { firestore, storage } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Pet, Address } from '../../types/database.types';
import { colors } from '../../constants/colors';
import { DashboardStackParamList } from '../../types/navigation.types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lastPetKey } from './DashboardScreen';
import { removePublicPet, syncPublicPet } from '../../lib/publicPet';
import {
  speciesOptions,
  calculateAgeFromDate,
  formatDateForDB,
  buildFullAddress,
} from '../../lib/petForm';

type Props = {
  navigation: NativeStackNavigationProp<DashboardStackParamList, 'EditPet'>;
  route: RouteProp<DashboardStackParamList, 'EditPet'>;
};

/** Converte uma data no formato AAAA-MM-DD ou DD/MM/AAAA em um objeto Date */
// Parse date from various formats
const parseDate = (dateString: string | null): Date => {
  if (!dateString) return new Date();
  
  // Try YYYY-MM-DD format (from database)
  if (dateString.includes('-')) {
    const date = new Date(dateString + 'T12:00:00');
    if (!isNaN(date.getTime())) return date;
  }
  
  // Try DD/MM/YYYY format (from display)
  if (dateString.includes('/')) {
    const parts = dateString.split('/');
    if (parts.length === 3) {
      const date = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]), 12, 0, 0);
      if (!isNaN(date.getTime())) return date;
    }
  }
  
  return new Date();
};

/** Desmonta a string de endereço completo em campos separados (rua, número, complemento) */
// Parse address into separate fields
const parseAddress = (address: string | null): { street: string; number: string; complement: string } => {
  if (!address) return { street: '', number: '', complement: '' };
  
  // Try to parse "Rua, Número - Complemento" or "Rua, Número, Complemento" format
  const parts = address.split(/[,-]/).map(p => p.trim());
  
  if (parts.length >= 3) {
    return { street: parts[0], number: parts[1], complement: parts.slice(2).join(', ') };
  } else if (parts.length === 2) {
    return { street: parts[0], number: parts[1], complement: '' };
  }
  
  return { street: address, number: '', complement: '' };
};

/** Formata um objeto Date para exibição no padrão DD/MM/AAAA */
// Format date for display (DD/MM/YYYY)
const formatDateForDisplay = (date: Date): string => {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

export default function EditPetScreen({ navigation, route }: Props) {
  const { pet } = route.params;              // dados atuais do pet a editar
  const { user } = useAuth();               // usuário autenticado
  const [loading, setLoading] = useState(false);                     // envio em andamento
  const [photoUri, setPhotoUri] = useState<string | null>(pet.photo_url); // URL/URI da foto atual
  const [photoChanged, setPhotoChanged] = useState(false);           // indica se a foto foi trocada
  
  // --- Data de nascimento -------------------------------------------------------
  const [birthDate, setBirthDate] = useState<Date>(parseDate(pet.birth_date));
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // --- Endereço ------------------------------------------------------------------
  const parsedAddress = parseAddress(pet.address);                   // desmonta o endereço salvo
  const [street, setStreet] = useState(parsedAddress.street);
  const [number, setNumber] = useState(parsedAddress.number);
  const [complement, setComplement] = useState(parsedAddress.complement);
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // --- Espécie personalizada ---------------------------------------------------
  const [customSpecies, setCustomSpecies] = useState(pet.custom_species || '');
  const [validatingSpecies, setValidatingSpecies] = useState(false);
  const [speciesValidationResult, setSpeciesValidationResult] = useState<'valid' | 'invalid' | null>(null);
  const [validationTimeout, setValidationTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetchSavedAddresses();
  }, []);

  /** Busca os endereços salvos do usuário para o seletor de endereço */
  const fetchSavedAddresses = async () => {
    if (!user) return;

    try {
      const snapshot = await getDocs(
        query(
          collection(firestore, 'users', user.uid, 'addresses'),
          where('user_id', '==', user.uid)
        )
      );
      const addrs = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() } as Address))
        .sort((a, b) => (b.is_default ? 1 : 0) - (a.is_default ? 1 : 0));
      setSavedAddresses(addrs);
    } catch (err) {
      console.error('Erro ao buscar endereços:', err);
    }
  };

  /** Preenche os campos de endereço com o endereço selecionado no modal */
  const handleSelectAddress = (address: Address) => {
    setSelectedAddressId(address.id);
    setStreet(address.street);
    setNumber(address.number);
    setComplement(address.complement || '');
    setShowAddressModal(false);
  };

  const handleClearAddress = () => {
    setSelectedAddressId(null);
  };
  
  const [formData, setFormData] = useState({
    name: pet.name,
    species: pet.species,
    breed: pet.breed || '',
    ownerName: pet.owner_name,
    ownerPhone: pet.owner_phone,
    ownerEmail: pet.owner_email || '',
    notes: pet.notes || '',
  });

  const onDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
      if (selectedDate && event.type !== 'dismissed') {
        setBirthDate(selectedDate);
      }
    } else {
      // iOS - apenas atualiza a data, não fecha o modal
      if (selectedDate) {
        setBirthDate(selectedDate);
      }
    }
  };

  /** Valida a espécie customizada com debounce de 800ms */
  const validateCustomSpeciesDebounced = (species: string) => {
    if (validationTimeout) {
      clearTimeout(validationTimeout);
    }

    setSpeciesValidationResult(null);
    
    if (!species || species.trim().length < 2) {
      setSpeciesValidationResult(null);
      return;
    }

    const timeout = setTimeout(async () => {
      const isValid = await validateCustomSpecies(species);
      setSpeciesValidationResult(isValid ? 'valid' : 'invalid');
    }, 800);

    setValidationTimeout(timeout);
  };

  /** Verifica se a espécie está na lista de animais permitidos */
  const validateCustomSpecies = async (species: string): Promise<boolean> => {
    if (!species || species.trim().length < 2) return false;
    
    setValidatingSpecies(true);
    try {
      const validAnimals = [
        'coelho', 'hamster', 'porquinho da índia', 'chinchila', 'ferret', 'furão',
        'rato', 'camundongo', 'gerbil', 'esquilo', 'twister',
        'tartaruga', 'jabuti', 'iguana', 'camaleão', 'cobra', 'lagarto', 'gecko', 'dragão barbudo',
        'peixe', 'beta', 'goldfish', 'kinguio', 'guppy', 'neon', 'oscar', 'koi',
        'periquito', 'papagaio', 'calopsita', 'canário', 'agapornis', 'cacatua', 'arara',
        'galinha', 'pato', 'ganso', 'codorna', 'faisão',
        'cavalo', 'égua', 'pônei', 'burro', 'jumento',
        'cabra', 'ovelha', 'porco', 'mini pig', 'lhama', 'alpaca',
        'vaca', 'boi', 'búfalo',
        'porquinho', 'ouriço', 'sugar glider', 'miniporco',
      ];

      const normalized = species.toLowerCase().trim();
      
      const isInList = validAnimals.some(animal => {
        return normalized === animal || normalized.includes(animal) || animal.includes(normalized);
      });

      if (!isInList) {
        return false;
      }

      const invalidPatterns = [
        /\d{3,}/,
        /[!@#$%^&*()+=\[\]{};':"\\|,.<>?]/g,
        /^[a-z]$/i,
        /[0-9]/g,
      ];

      if (invalidPatterns.some(pattern => pattern.test(normalized))) {
        return false;
      }

      if (normalized.length < 3 || normalized.length > 30) {
        return false;
      }

      return true;
    } finally {
      setValidatingSpecies(false);
    }
  };

  /** Abre a galeria para trocar a foto do pet */
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão necessária', 'Precisamos de acesso à galeria para adicionar foto do pet.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
      setPhotoChanged(true);
    }
  };

  /** Abre a câmera para tirar uma nova foto do pet */
  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão necessária', 'Precisamos de acesso à câmera para tirar foto do pet.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
      setPhotoChanged(true);
    }
  };

  /** Exibe as opções para alterar a foto (câmera ou galeria) */
  const showPhotoOptions = () => {
    Alert.alert('Alterar Foto', 'Como você deseja alterar a foto?', [
      { text: 'Câmera', onPress: takePhoto },
      { text: 'Galeria', onPress: pickImage },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  /** Faz upload da nova foto para o Firebase Storage e retorna a URL pública */
  const uploadPhoto = async (uri: string): Promise<string | null> => {
    try {
      const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
      const contentType = fileExt === 'png' ? 'image/png' : 'image/jpeg';
      const fileName = `pet-photos/${user?.uid}/${Date.now()}.${fileExt}`;

      const response = await fetch(uri);
      const blob = await response.blob();
      const storageRef = ref(storage, fileName);
      await uploadBytes(storageRef, blob, { contentType });
      return await getDownloadURL(storageRef);
    } catch (error) {
      console.error('Photo upload failed:', error);
      return null;
    }
  };

  /**
   * handleUpdate — valida e persiste as alterações do pet no Firestore.
   * Faz upload da foto apenas se ela foi alterada (photoChanged === true).
   */
  const handleUpdate = async () => {
    if (!formData.name || !formData.ownerName || !formData.ownerPhone) {
      Alert.alert('Campos obrigatórios', 'Preencha nome do pet, nome do tutor e telefone.');
      return;
    }

    if (formData.species === 'other' && !customSpecies.trim()) {
      Alert.alert('Espécie necessária', 'Por favor, especifique a espécie do seu pet.');
      return;
    }

    if (formData.species === 'other') {
      if (speciesValidationResult === 'invalid') {
        Alert.alert('Espécie inválida', 'Por favor, verifique o nome da espécie e tente novamente.');
        return;
      }
      if (speciesValidationResult !== 'valid') {
        const isValid = await validateCustomSpecies(customSpecies);
        if (!isValid) {
          Alert.alert('Espécie inválida', 'Por favor, verifique o nome da espécie e tente novamente.');
          return;
        }
      }
    }

    setLoading(true);

    try {
      let photoUrl = pet.photo_url;
      if (photoChanged && photoUri && photoUri !== pet.photo_url) {
        photoUrl = await uploadPhoto(photoUri);
      }

      const fullAddress = buildFullAddress(street, number, complement);

      await updateDoc(doc(firestore, 'pets', pet.id), {
        name: formData.name,
        species: formData.species,
        custom_species: formData.species === 'other' ? customSpecies.trim() : null,
        breed: formData.breed || null,
        birth_date: formatDateForDB(birthDate),
        photo_url: photoUrl,
        owner_name: formData.ownerName,
        owner_phone: formData.ownerPhone,
        owner_email: formData.ownerEmail || null,
        address: fullAddress || null,
        notes: formData.notes || null,
        updated_at: new Date().toISOString(),
      });

      await syncPublicPet({
        id: pet.id,
        pet_id: pet.pet_id,
        name: formData.name,
        species: formData.species,
        breed: formData.breed || null,
        photo_url: photoUrl,
        owner_name: formData.ownerName,
        owner_phone: formData.ownerPhone,
      });

      setShowSuccessModal(true);
    } catch (error) {
      console.error(error);
      Alert.alert('Erro', 'Ocorreu um erro ao atualizar o pet.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Excluir Pet',
      `Tem certeza que deseja excluir ${pet.name}? Esta ação não pode ser desfeita.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              // Deleta o documento espelho na coleção 'pet' (4YouPet), se existir
              const mirrorSnap = await getDocs(
                query(collection(firestore, 'pet'), where('epet_id', '==', pet.id))
              );
              await Promise.all(mirrorSnap.docs.map(d => deleteDoc(d.ref)));
              // A ficha pública precisa ser removida antes do documento privado,
              // pois a regra valida a posse a partir do pet de origem.
              await removePublicPet(pet.pet_id);
              await deleteDoc(doc(firestore, 'pets', pet.id));
              // Limpa o cache de último pet acessado para este usuário
              if (user) {
                const cached = await AsyncStorage.getItem(lastPetKey(user.uid)).catch(() => null);
                if (cached) {
                  try {
                    const cachedPet = JSON.parse(cached);
                    if (cachedPet?.id === pet.id) {
                      await AsyncStorage.removeItem(lastPetKey(user.uid));
                    }
                  } catch { /* ignora */ }
                }
              }
              navigation.popToTop();
            } catch (err) {
              Alert.alert('Erro', 'Não foi possível excluir o pet.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Editar Pet</Text>
        <TouchableOpacity onPress={handleDelete} style={styles.backButton}>
          <Ionicons name="trash-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Pet ID (Não editável) */}
        <View style={styles.petIdContainer}>
          <Ionicons name="id-card" size={18} color={colors.primary} />
          <Text style={styles.petIdLabel}>ID do Pet:</Text>
          <Text style={styles.petIdValue}>{pet.pet_id}</Text>
        </View>

        {/* Foto do Pet */}
        <View style={styles.photoSection}>
          <TouchableOpacity style={styles.photoContainer} onPress={showPhotoOptions}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.photo} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Ionicons name="camera" size={40} color={colors.gray500} />
                <Text style={styles.photoText}>Adicionar foto</Text>
              </View>
            )}
            <View style={styles.editPhotoButton}>
              <Ionicons name="pencil" size={14} color="#fff" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Seleção de Espécie */}
        <Text style={styles.sectionTitle}>Espécie</Text>
        <View style={styles.speciesContainer}>
          {speciesOptions.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.speciesOption,
                formData.species === option.id && styles.speciesOptionActive,
              ]}
              onPress={() => setFormData({ ...formData, species: option.id as 'dog' | 'cat' | 'bird' | 'other' })}
            >
              <View style={[
                styles.speciesIconContainer,
                formData.species === option.id && styles.speciesIconContainerActive
              ]}>
                <Ionicons
                  name={option.icon}
                  size={24}
                  color={formData.species === option.id ? '#fff' : colors.primary}
                />
              </View>
              <Text
                style={[
                  styles.speciesLabel,
                  formData.species === option.id && styles.speciesLabelActive,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Campo de espécie customizada */}
        {formData.species === 'other' && (
          <View style={styles.customSpeciesContainer}>
            <View style={styles.inputContainer}>
              <Ionicons name="create-outline" size={20} color={colors.gray500} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Qual é a espécie? (ex: Coelho, Hamster, Tartaruga)"
                placeholderTextColor={colors.gray500}
                value={customSpecies}
                onChangeText={(text) => {
                  setCustomSpecies(text);
                  validateCustomSpeciesDebounced(text);
                }}
                autoCapitalize="words"
              />
              {validatingSpecies && (
                <ActivityIndicator size="small" color={colors.primary} style={{ marginLeft: 8 }} />
              )}
              {!validatingSpecies && speciesValidationResult === 'valid' && (
                <Ionicons name="checkmark-circle" size={24} color="#10B981" style={{ marginLeft: 8 }} />
              )}
              {!validatingSpecies && speciesValidationResult === 'invalid' && (
                <Ionicons name="close-circle" size={24} color="#EF4444" style={{ marginLeft: 8 }} />
              )}
            </View>
          </View>
        )}

        {/* Dados do Pet */}
        <Text style={styles.sectionTitle}>Dados do Pet</Text>
        <View style={styles.inputGroup}>
          <View style={styles.inputContainer}>
            <Ionicons name="paw-outline" size={20} color={colors.gray500} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Nome do pet *"
              placeholderTextColor={colors.gray500}
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="heart-outline" size={20} color={colors.gray500} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Raça"
              placeholderTextColor={colors.gray500}
              value={formData.breed}
              onChangeText={(text) => setFormData({ ...formData, breed: text })}
            />
          </View>

          {/* DatePicker para Data de Nascimento */}
          <TouchableOpacity
            style={styles.inputContainer}
            onPress={() => setShowDatePicker(true)}
          >
            <Ionicons name="calendar-outline" size={20} color={colors.gray500} style={styles.inputIcon} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.input, styles.dateText, { paddingVertical: 8 }]}>
                {formatDateForDisplay(birthDate)}
              </Text>
              <Text style={styles.ageText}>
                {calculateAgeFromDate(birthDate)}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={20} color={colors.gray500} />
          </TouchableOpacity>
        </View>

        {/* DatePicker Modal para iOS */}
        {Platform.OS === 'ios' && (
          <Modal
            visible={showDatePicker}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowDatePicker(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.datePickerModal}>
                <View style={styles.datePickerHeader}>
                  <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                    <Text style={styles.datePickerCancel}>Cancelar</Text>
                  </TouchableOpacity>
                  <Text style={styles.datePickerTitle}>Data de Nascimento</Text>
                  <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                    <Text style={styles.datePickerDone}>OK</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={birthDate}
                  mode="date"
                  display="spinner"
                  onChange={onDateChange}
                  maximumDate={new Date()}
                  locale="pt-BR"
                />
              </View>
            </View>
          </Modal>
        )}

        {/* DatePicker para Android */}
        {Platform.OS === 'android' && showDatePicker && (
          <DateTimePicker
            value={birthDate}
            mode="date"
            display="default"
            onChange={onDateChange}
            maximumDate={new Date()}
          />
        )}

        {/* Dados do Tutor */}
        <Text style={styles.sectionTitle}>Dados do Tutor</Text>
        <View style={styles.inputGroup}>
          <View style={styles.inputContainer}>
            <Ionicons name="person-outline" size={20} color={colors.gray500} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Nome do tutor *"
              placeholderTextColor={colors.gray500}
              value={formData.ownerName}
              onChangeText={(text) => setFormData({ ...formData, ownerName: text })}
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="call-outline" size={20} color={colors.gray500} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Telefone *"
              placeholderTextColor={colors.gray500}
              value={formData.ownerPhone}
              onChangeText={(text) => setFormData({ ...formData, ownerPhone: text })}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color={colors.gray500} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="E-mail"
              placeholderTextColor={colors.gray500}
              value={formData.ownerEmail}
              onChangeText={(text) => setFormData({ ...formData, ownerEmail: text })}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
        </View>

        {/* Endereço - Seletor de endereços salvos */}
        <View style={styles.addressHeader}>
          <Text style={styles.sectionTitle}>Endereço</Text>
          {savedAddresses.length > 0 && (
            <TouchableOpacity
              style={styles.selectAddressButton}
              onPress={() => setShowAddressModal(true)}
            >
              <Ionicons name="location" size={18} color={colors.primary} />
              <Text style={styles.selectAddressText}>
                {selectedAddressId ? 'Trocar endereço' : 'Selecionar endereço'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {selectedAddressId && (
          <View style={styles.selectedAddressBanner}>
            <Ionicons name="checkmark-circle" size={20} color="#10B981" />
            <Text style={styles.selectedAddressText}>
              Usando: {savedAddresses.find(a => a.id === selectedAddressId)?.label}
            </Text>
            <TouchableOpacity onPress={handleClearAddress}>
              <Ionicons name="close-circle" size={20} color="#EF4444" />
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.inputGroup}>
          <View style={styles.inputContainer}>
            <Ionicons name="location-outline" size={20} color={colors.gray500} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Rua / Logradouro"
              placeholderTextColor={colors.gray500}
              value={street}
              onChangeText={setStreet}
              editable={!selectedAddressId}
            />
          </View>

          {street.length > 0 && (
            <>
              <View style={styles.rowInputs}>
                <View style={[styles.inputContainer, { flex: 1 }]}>
                  <Ionicons name="home-outline" size={20} color={colors.gray500} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Número"
                    placeholderTextColor={colors.gray500}
                    value={number}
                    onChangeText={setNumber}
                    keyboardType="numeric"
                    editable={!selectedAddressId}
                  />
                </View>
                
                <View style={[styles.inputContainer, { flex: 1.5 }]}>
                  <Ionicons name="business-outline" size={20} color={colors.gray500} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Complemento"
                    placeholderTextColor={colors.gray500}
                    value={complement}
                    onChangeText={setComplement}
                    editable={!selectedAddressId}
                  />
                </View>
              </View>
            </>
          )}
        </View>

        {/* Observações */}
        <Text style={styles.sectionTitle}>Observações</Text>
        <View style={[styles.inputContainer, styles.textAreaContainer]}>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Informações adicionais sobre o pet..."
            placeholderTextColor={colors.gray500}
            value={formData.notes}
            onChangeText={(text) => setFormData({ ...formData, notes: text })}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Botão de Salvar */}
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleUpdate}
          disabled={loading}
        >
          {loading ? (
            <Text style={styles.submitButtonText}>Salvando...</Text>
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={22} color="#fff" />
              <Text style={styles.submitButtonText}>Salvar Alterações</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Modal de Seleção de Endereços */}
      <Modal 
        visible={showAddressModal} 
        transparent 
        animationType="slide"
        onRequestClose={() => setShowAddressModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowAddressModal(false)}
        >
          <TouchableOpacity 
            activeOpacity={1} 
            onPress={(e) => e.stopPropagation()}
            style={{ flex: 1, justifyContent: 'flex-end' }}
          >
            <View style={styles.addressModalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Selecionar Endereço</Text>
                <TouchableOpacity onPress={() => setShowAddressModal(false)}>
                  <Ionicons name="close" size={24} color={colors.gray600} />
                </TouchableOpacity>
              </View>

              <ScrollView 
                style={styles.addressList} 
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled={true}
              >
              {savedAddresses.map((address) => (
                <TouchableOpacity
                  key={address.id}
                  style={[
                    styles.addressItem,
                    selectedAddressId === address.id && styles.addressItemSelected,
                  ]}
                  onPress={() => handleSelectAddress(address)}
                >
                  <View style={styles.addressItemHeader}>
                    <View style={styles.addressLabelContainer}>
                      <Ionicons
                        name="location"
                        size={20}
                        color={selectedAddressId === address.id ? colors.primary : colors.gray600}
                      />
                      <Text
                        style={[
                          styles.addressLabel,
                          selectedAddressId === address.id && styles.addressLabelSelected,
                        ]}
                      >
                        {address.label}
                      </Text>
                      {address.is_default && (
                        <View style={styles.defaultBadge}>
                          <Text style={styles.defaultBadgeText}>Padrão</Text>
                        </View>
                      )}
                    </View>
                    {selectedAddressId === address.id && (
                      <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                    )}
                  </View>
                  <Text style={styles.addressItemText}>
                    {address.street}, {address.number}
                    {address.complement && ` - ${address.complement}`}
                  </Text>
                  <Text style={styles.addressItemCep}>CEP: {address.cep}</Text>
                </TouchableOpacity>
              ))}

              <TouchableOpacity
                style={styles.manualAddressOption}
                onPress={() => {
                  handleClearAddress();
                  setShowAddressModal(false);
                }}
              >
                <Ionicons name="create-outline" size={20} color={colors.primary} />
                <Text style={styles.manualAddressText}>Editar endereço manualmente</Text>
              </TouchableOpacity>
              </ScrollView>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={() => { setShowSuccessModal(false); navigation.goBack(); }}
      >
        <View style={styles.successOverlay}>
          <View style={styles.successModalCard}>
            <Ionicons name="checkmark-circle" size={64} color="#10B981" style={{ marginBottom: 12 }} />
            <Text style={styles.successTitle}>Pet atualizado!</Text>
            <Text style={styles.successDescription}>
              As informações do pet foram salvas com sucesso.
            </Text>
            <TouchableOpacity
              style={styles.successButton}
              onPress={() => { setShowSuccessModal(false); navigation.goBack(); }}
            >
              <Text style={styles.successButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
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
  backButton: {
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
    padding: 24,
  },
  petIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.tertiary,
    padding: 14,
    borderRadius: 12,
    marginBottom: 20,
    gap: 8,
  },
  petIdLabel: {
    fontSize: 14,
    color: colors.gray600,
  },
  petIdValue: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
  },
  photoSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  photoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'visible',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  photoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.gray200,
    borderRadius: 60,
  },
  photoText: {
    fontSize: 12,
    color: colors.gray500,
    marginTop: 4,
  },
  editPhotoButton: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 12,
    marginTop: 8,
  },
  speciesContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  speciesOption: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: colors.gray300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  speciesOptionActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  speciesLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.gray600,
    textAlign: 'center',
  },
  speciesLabelActive: {
    color: '#fff',
  },
  speciesIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  speciesIconContainerActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  customSpeciesContainer: {
    marginBottom: 16,
  },
  inputGroup: {
    gap: 12,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.gray300,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 15,
    color: colors.textPrimary,
  },
  dateText: {
    color: colors.textPrimary,
  },
  ageText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
    marginTop: -8,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 12,
  },
  textAreaContainer: {
    alignItems: 'flex-start',
    paddingVertical: 12,
    marginBottom: 24,
  },
  textArea: {
    height: 100,
    paddingVertical: 0,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  datePickerModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  datePickerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  datePickerCancel: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.gray600,
  },
  datePickerDone: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 18,
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
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomPadding: {
    height: 40,
  },
  addressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  selectAddressButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.tertiary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  selectAddressText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
  },
  selectedAddressBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  selectedAddressText: {
    flex: 1,
    fontSize: 14,
    color: '#15803D',
    fontWeight: '500',
  },
  addressModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingTop: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  addressList: {
    paddingHorizontal: 24,
  },
  addressItem: {
    backgroundColor: colors.backgroundLight,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  addressItemSelected: {
    backgroundColor: colors.tertiary,
    borderColor: colors.primary,
  },
  addressItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  addressLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  addressLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  addressLabelSelected: {
    color: colors.primary,
  },
  defaultBadge: {
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  defaultBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.primary,
  },
  addressItemText: {
    fontSize: 14,
    color: colors.gray700,
    marginBottom: 4,
  },
  addressItemCep: {
    fontSize: 12,
    color: colors.gray500,
  },
  manualAddressOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: colors.gray300,
    marginTop: 8,
  },
  manualAddressText: {
    fontSize: 15,
    color: colors.primary,
    fontWeight: '600',
  },
  successOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  successModalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  successDescription: {
    fontSize: 15,
    color: colors.gray700,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  successButton: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  successButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
