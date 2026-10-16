/**
 * NewPetScreen — formulário de cadastro de novo pet.
 *
 * Permite ao usuário preencher todos os dados do pet (nome, espécie, raça,
 * data de nascimento, foto, endereço, tutor e vacinas iniciais),
 * fazer upload da foto para o Firebase Storage, salvar o pet no
 * Firestore (coleção 'pets') e registrar na coleção 4YouPet.
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
import * as ImagePicker from 'expo-image-picker';            // seletor de imagem da galeria / câmera
import DateTimePicker from '@react-native-community/datetimepicker'; // seletor nativo de data
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { firestore, firebaseAuth, storage } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';         // usuário autenticado
import { Address } from '../../types/database.types';         // tipo do endereço
import { colors } from '../../constants/colors';              // paleta de cores
import { syncPublicPet } from '../../lib/publicPet';
import {
  speciesOptions,
  generatePetId,
  COMMON_VACCINES,
  emptyVaccineForm,
  VaccineDraft,
  maskDateInput,
  isValidDateBR,
  parseDateBR,
  formatDateForDB,
  buildFullAddress,
  calculateAgeFromDate,
} from '../../lib/petForm';

type Props = {
  navigation: NativeStackNavigationProp<any>;
};

export default function NewPetScreen({ navigation }: Props) {
  const { user } = useAuth(); // usuário autenticado

  // --- Estados gerais -----------------------------------------------------------
  const [loading, setLoading] = useState(false);            // indica envio em andamento
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdPetName, setCreatedPetName] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null); // URI local da foto escolhida
  const [birthDate, setBirthDate] = useState<Date | null>(null); // data de nascimento do pet
  const [showDatePicker, setShowDatePicker] = useState(false);   // controla o DateTimePicker

  // --- Endereço ------------------------------------------------------------------
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [complement, setComplement] = useState('');
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]); // endereços salvos do usuário
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showAddressModal, setShowAddressModal] = useState(false);     // modal de seleção de endereço

  // --- Espécie customizada -------------------------------------------------------
  const [customSpecies, setCustomSpecies] = useState('');              // texto da espécie "Outro"
  const [validatingSpecies, setValidatingSpecies] = useState(false);   // indicador de validação assíncrona
  const [speciesValidationResult, setSpeciesValidationResult] = useState<'valid' | 'invalid' | null>(null);
  const [validationTimeout, setValidationTimeout] = useState<ReturnType<typeof setTimeout> | null>(null); // debounce timer

  // --- Vacinas iniciais ----------------------------------------------------------
  const [initialVaccines, setInitialVaccines] = useState<VaccineDraft[]>([]); // lista de vacinas a cadastrar
  const [showVaccineModal, setShowVaccineModal] = useState(false);             // modal de adicionar vacina
  const [showCommonVaccines, setShowCommonVaccines] = useState(false);         // lista de vacinas comuns
  const [vaccineForm, setVaccineForm] = useState<VaccineDraft>(emptyVaccineForm); // campos do formulário de vacina

  // --- Peso inicial -------------------------------------------------------------
  const [initialPeso, setInitialPeso] = useState(''); // peso em kg ao cadastrar o pet

  // --- Dados principais do pet ---------------------------------------------------
  const [formData, setFormData] = useState({
    name: '',
    species: 'dog' as 'dog' | 'cat' | 'bird' | 'other',
    breed: '',
    ownerName: '',
    ownerPhone: '',
    ownerEmail: '',
    notes: '',
  });

  // Carrega os endereços salvos ao montar o componente
  useEffect(() => {
    fetchSavedAddresses();
  }, []);

  /** Busca os endereços cadastrados do usuário no Firestore e auto-seleciona o padrão */
  const fetchSavedAddresses = async () => {
    if (!user) return;

    try {
      const { getDocs, collection: col, query: q, where, orderBy } = await import('firebase/firestore');
      const snapshot = await getDocs(
        q(col(firestore, 'users', user.uid, 'addresses'), where('user_id', '==', user.uid))
      );
      const addrs = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() } as Address))
        .sort((a, b) => (b.is_default ? 1 : 0) - (a.is_default ? 1 : 0));

      setSavedAddresses(addrs);
      const defaultAddr = addrs.find(a => a.is_default);
      if (defaultAddr) handleSelectAddress(defaultAddr);
    } catch (err) {
      console.error('Erro ao buscar endereços:', err);
    }
  };

  /** Preenche os campos de endereço com os dados do endereço selecionado */
  const handleSelectAddress = (address: Address) => {
    setSelectedAddressId(address.id);
    setStreet(address.street);
    setNumber(address.number);
    setComplement(address.complement || '');
    setShowAddressModal(false);
  };

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

  /** Formata uma data para exibição no padrão brasileiro DD/MM/AAAA */
  const formatDateDisplay = (date: Date) => {
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  /** Limpa os campos de endereço e a seleção ativa */
  const handleClearAddress = () => {
    setSelectedAddressId(null);
    setStreet('');
    setNumber('');
    setComplement('');
  };

  /**
   * validateCustomSpeciesDebounced — aciona a validação da espécie com debounce de 800ms.
   * Evita chamadas excessivas enquanto o usuário ainda está digitando.
   */
  const validateCustomSpeciesDebounced = (species: string) => {
    // Limpa timeout anterior
    if (validationTimeout) {
      clearTimeout(validationTimeout);
    }

    setSpeciesValidationResult(null);
    
    if (!species || species.trim().length < 2) {
      setSpeciesValidationResult(null);
      return;
    }

    // Aguarda 800ms após usuário parar de digitar
    const timeout = setTimeout(async () => {
      const isValid = await validateCustomSpecies(species);
      setSpeciesValidationResult(isValid ? 'valid' : 'invalid');
    }, 800);

    setValidationTimeout(timeout);
  };

  /**
   * validateCustomSpecies — verifica se a espécie digitada está na lista de animais aceitos.
   * Rejeita números, caracteres especiais e strings muito curtas/longas.
   * Retorna true somente se a espécie for reconhecida e válida.
   */
  const validateCustomSpecies = async (species: string): Promise<boolean> => {
    if (!species || species.trim().length < 2) return false;
    
    setValidatingSpecies(true);
    try {
      // Lista COMPLETA de animais aceitos (validação rigorosa)
      const validAnimals = [
        // Roedores e pequenos mamíferos
        'coelho', 'hamster', 'porquinho da índia', 'chinchila', 'ferret', 'furão',
        'rato', 'camundongo', 'gerbil', 'esquilo', 'twister',
        // Répteis
        'tartaruga', 'jabuti', 'iguana', 'camaleão', 'cobra', 'lagarto', 'gecko', 'dragão barbudo',
        // Peixes
        'peixe', 'beta', 'goldfish', 'kinguio', 'guppy', 'neon', 'oscar', 'koi',
        // Aves
        'periquito', 'papagaio', 'calopsita', 'canário', 'agapornis', 'cacatua', 'arara',
        'galinha', 'pato', 'ganso', 'codorna', 'faisão',
        // Animais de fazenda
        'cavalo', 'égua', 'pônei', 'burro', 'jumento',
        'cabra', 'ovelha', 'porco', 'mini pig', 'lhama', 'alpaca',
        'vaca', 'boi', 'búfalo',
        // Outros
        'porquinho', 'ouriço', 'sugar glider', 'miniporco',
      ];

      const normalized = species.toLowerCase().trim();
      
      // Verificação estrita: deve estar na lista OU ser uma variação clara
      const isInList = validAnimals.some(animal => {
        // Aceita palavra exata ou palavra contida (para variações como "mini porco")
        return normalized === animal || normalized.includes(animal) || animal.includes(normalized);
      });

      if (!isInList) {
        return false;
      }

      // Validações de formato
      const invalidPatterns = [
        /\d{3,}/, // números longos
        /[!@#$%^&*()+=\[\]{};':"\\|,.<>?]/g, // caracteres especiais
        /^[a-z]$/i, // apenas uma letra
        /[0-9]/g, // qualquer número
      ];

      if (invalidPatterns.some(pattern => pattern.test(normalized))) {
        return false;
      }

      // Limite de tamanho
      if (normalized.length < 3 || normalized.length > 30) {
        return false;
      }

      return true;
    } finally {
      setValidatingSpecies(false);
    }
  };

  /** Abre a galeria de fotos para escolher a foto do pet */
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão necessária', 'Precisamos de acesso à galeria.');
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
    }
  };

  /** Abre a câmera para tirar uma foto do pet */
  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão necessária', 'Precisamos de acesso à câmera.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  /** Exibe um Alert com as opções de adicionar foto (câmera ou galeria) */
  const showPhotoOptions = () => {
    Alert.alert('Adicionar Foto', 'Como você deseja adicionar a foto?', [
      { text: 'Câmera', onPress: takePhoto },
      { text: 'Galeria', onPress: pickImage },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  /**
   * uploadPhoto — faz upload da foto do pet para o Firebase Storage.
   *
   * envia ao Firebase Storage
   * e retorna a URL pública gerada.
   */
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
   * handleSubmit — valida o formulário, salva o pet no Firestore ('pets')
   * e registra na coleção 4YouPet ('pet').
   *
   * Etapas:
   * 1. Valida campos obrigatórios e espécie customizada.
   * 2. Faz upload da foto (se houver).
   * 3. Insere o pet na coleção 'pets' do Firestore.
   * 4. Insere as vacinas iniciais na subcoleção 'pets/{petId}/vaccines'.
   * 5. Cria o documento correspondente na coleção 'pet' do Firestore (4YouPet).
   */
  const handleSubmit = async () => {
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
      let photoUrl: string | null = null;
      if (photoUri) {
        photoUrl = await uploadPhoto(photoUri);
      }

      const fullAddress = buildFullAddress(street, number, complement);
      const petId = generatePetId();
      const uid = user!.uid;

      // Salva o pet na coleção 'pets'
      const petDocRef = await addDoc(collection(firestore, 'pets'), {
        user_id: uid,
        pet_id: petId,
        name: formData.name,
        species: formData.species,
        custom_species: formData.species === 'other' ? customSpecies.trim() : null,
        breed: formData.breed || null,
        birth_date: formatDateForDB(birthDate),
        photo_url: photoUrl,
        qr_code: petId,
        owner_name: formData.ownerName,
        owner_phone: formData.ownerPhone,
        owner_email: formData.ownerEmail || null,
        address: fullAddress || null,
        notes: formData.notes || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      await syncPublicPet({
        id: petDocRef.id,
        pet_id: petId,
        name: formData.name,
        species: formData.species,
        breed: formData.breed || null,
        photo_url: photoUrl,
        owner_name: formData.ownerName,
        owner_phone: formData.ownerPhone,
      });

      // Salva as vacinas iniciais na subcoleção
      const validVaccines = initialVaccines.filter(v => v.name && isValidDateBR(v.date_applied));
      await Promise.all(validVaccines.map(v =>
        addDoc(collection(firestore, 'pets', petDocRef.id, 'vaccines'), {
          pet_id: petDocRef.id,
          name: v.name,
          date_applied: parseDateBR(v.date_applied),
          next_due_date: v.next_due_date && isValidDateBR(v.next_due_date)
            ? parseDateBR(v.next_due_date)
            : null,
          veterinarian: v.veterinarian || null,
          batch: null,
          notes: null,
          created_at: new Date().toISOString(),
        })
      ));

      // Salva o peso inicial na subcoleção 'weights' (se informado)
      const pesoNum = parseFloat(initialPeso.replace(',', '.'));
      if (initialPeso.trim() && !isNaN(pesoNum) && pesoNum > 0) {
        await addDoc(collection(firestore, 'pets', petDocRef.id, 'weights'), {
          peso: pesoNum,
          data: new Date().toLocaleDateString('pt-BR'),
          observacao: 'Peso inicial ao cadastro',
          created_at: new Date().toISOString(),
        });
      }

      // Sincroniza o pet com o 4YouPet (coleção 'pet')
      try {
        const firebaseUid = firebaseAuth.currentUser?.uid;
        if (firebaseUid) {
          await addDoc(collection(firestore, 'pet'), {
            pet_id: petId,
            epet_id: petDocRef.id,
            name: formData.name,
            breed: formData.breed || null,
            birth: birthDate ? Timestamp.fromDate(birthDate) : null,
            size: null,
            color: null,
            castrado: false,
            images: photoUrl ? [photoUrl] : [],
            vacinas: [],
            user_id: firebaseUid,
          });
        }
      } catch (fbErr: any) {
        console.warn('[Firebase] Falha ao espelhar pet no 4YouPet:', fbErr.message);
      }

      setCreatedPetName(formData.name);
      setShowSuccessModal(true);
    } catch (error) {
      console.error(error);
      Alert.alert('Erro', 'Ocorreu um erro ao cadastrar o pet.');
    } finally {
      setLoading(false);
    }
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
        <Text style={styles.headerTitle}>Novo Pet</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
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
            <View style={styles.addPhotoButton}>
              <Ionicons name="add" size={20} color="#fff" />
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
              onPress={() => setFormData({ ...formData, species: option.id })}
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
              placeholder="Nome do pet"
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

          {/* DatePicker */}
          <TouchableOpacity
            style={styles.inputContainer}
            onPress={() => setShowDatePicker(true)}
          >
            <Ionicons name="calendar-outline" size={20} color={colors.gray500} style={styles.inputIcon} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.input, styles.dateText, !birthDate && styles.placeholderText, { paddingVertical: 8 }]}>
                {birthDate ? formatDateDisplay(birthDate) : 'Data de nascimento'}
              </Text>
              {birthDate && (
                <Text style={styles.ageText}>
                  {calculateAgeFromDate(birthDate)}
                </Text>
              )}
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
                  value={birthDate || new Date()}
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
            value={birthDate || new Date()}
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
              placeholder="Nome do tutor"
              placeholderTextColor={colors.gray500}
              value={formData.ownerName}
              onChangeText={(text) => setFormData({ ...formData, ownerName: text })}
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="call-outline" size={20} color={colors.gray500} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Telefone"
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
          )}
        </View>

        {/* Observações */}
        <Text style={styles.sectionTitle}>Observações</Text>
        <View style={[styles.inputContainer, styles.textAreaContainer]}>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Informações adicionais..."
            placeholderTextColor={colors.gray500}
            value={formData.notes}
            onChangeText={(text) => setFormData({ ...formData, notes: text })}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Peso Inicial */}
        <View style={styles.vaccineHeader}>
          <Text style={styles.sectionTitle}>Peso Atual</Text>
          <Text style={styles.sectionSubtitle}>Opcional</Text>
        </View>
        <View style={styles.inputContainer}>
          <Ionicons name="scale-outline" size={20} color={colors.gray500} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Ex: 4.5"
            placeholderTextColor={colors.gray500}
            value={initialPeso}
            onChangeText={setInitialPeso}
            keyboardType="decimal-pad"
          />
          <Text style={styles.inputSuffix}>kg</Text>
        </View>

        {/* Vacinas Iniciais */}
        <View style={styles.vaccineHeader}>
          <Text style={styles.sectionTitle}>Vacinas</Text>
          <Text style={styles.sectionSubtitle}>Opcional</Text>
        </View>

        {initialVaccines.length > 0 && (
          <View style={styles.vaccineList}>
            {initialVaccines.map((vaccine, index) => (
              <View key={index} style={styles.vaccineCard}>
                <View style={styles.vaccineCardInfo}>
                  <View style={styles.vaccineIconContainer}>
                    <Ionicons name="medical" size={18} color={colors.primary} />
                  </View>
                  <View style={styles.vaccineCardText}>
                    <Text style={styles.vaccineCardName}>{vaccine.name}</Text>
                    <Text style={styles.vaccineCardDate}>Aplicada em: {vaccine.date_applied}</Text>
                    {vaccine.next_due_date ? (
                      <Text style={styles.vaccineCardNext}>Próxima: {vaccine.next_due_date}</Text>
                    ) : null}
                    {vaccine.veterinarian ? (
                      <Text style={styles.vaccineCardVet}>Vet: {vaccine.veterinarian}</Text>
                    ) : null}
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => setInitialVaccines(prev => prev.filter((_, i) => i !== index))}
                  style={styles.vaccineRemoveButton}
                >
                  <Ionicons name="close-circle" size={22} color={colors.error} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity
          style={styles.addVaccineButton}
          onPress={() => {
            setVaccineForm(emptyVaccineForm);
            setShowCommonVaccines(false);
            setShowVaccineModal(true);
          }}
        >
          <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
          <Text style={styles.addVaccineText}>Adicionar Vacina</Text>
        </TouchableOpacity>

        {/* Botão de Cadastrar */}
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <Text style={styles.submitButtonText}>Cadastrando...</Text>
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={22} color="#fff" />
              <Text style={styles.submitButtonText}>Cadastrar Pet</Text>
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
                <Text style={styles.manualAddressText}>Digitar endereço manualmente</Text>
              </TouchableOpacity>
              </ScrollView>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Modal de Adicionar Vacina */}
      <Modal
        visible={showVaccineModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowVaccineModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <TouchableOpacity
            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}
            activeOpacity={1}
            onPress={() => setShowVaccineModal(false)}
          />
          <View style={styles.vaccineModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nova Vacina</Text>
              <TouchableOpacity onPress={() => setShowVaccineModal(false)}>
                <Ionicons name="close" size={24} color={colors.gray600} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} nestedScrollEnabled>
              {/* Nome */}
              <Text style={styles.vaccineFieldLabel}>Nome da vacina *</Text>
              <View style={[styles.vaccineInputContainer, showCommonVaccines && styles.vaccineInputActive]}>
                <Ionicons name="medical-outline" size={20} color={colors.gray500} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Nome da vacina"
                  placeholderTextColor={colors.gray500}
                  value={vaccineForm.name}
                  onChangeText={(text) => setVaccineForm({ ...vaccineForm, name: text })}
                  onFocus={() => setShowCommonVaccines(false)}
                />
                <TouchableOpacity onPress={() => setShowCommonVaccines(!showCommonVaccines)}>
                  <Ionicons
                    name={showCommonVaccines ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={colors.gray500}
                  />
                </TouchableOpacity>
              </View>

              {showCommonVaccines && (
                <View style={styles.commonVaccinesList}>
                  {COMMON_VACCINES.map((v) => (
                    <TouchableOpacity
                      key={v}
                      style={[
                        styles.commonVaccineItem,
                        vaccineForm.name === v && styles.commonVaccineItemSelected,
                      ]}
                      onPress={() => {
                        setVaccineForm({ ...vaccineForm, name: v === 'Outra' ? '' : v });
                        setShowCommonVaccines(false);
                      }}
                    >
                      <Text style={[
                        styles.commonVaccineText,
                        vaccineForm.name === v && styles.commonVaccineTextSelected,
                      ]}>
                        {v}
                      </Text>
                      {vaccineForm.name === v && (
                        <Ionicons name="checkmark" size={16} color={colors.primary} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Data de aplicação */}
              <Text style={styles.vaccineFieldLabel}>Data de aplicação *</Text>
              <View style={styles.vaccineInputContainer}>
                <Ionicons name="calendar-outline" size={20} color={colors.gray500} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="dd/mm/aaaa"
                  placeholderTextColor={colors.gray500}
                  value={vaccineForm.date_applied}
                  onChangeText={(text) =>
                    setVaccineForm({ ...vaccineForm, date_applied: maskDateInput(text) })
                  }
                  keyboardType="numeric"
                  maxLength={10}
                />
                {vaccineForm.date_applied.length === 10 && (
                  <Ionicons
                    name={
                      isValidDateBR(vaccineForm.date_applied) ? 'checkmark-circle' : 'close-circle'
                    }
                    size={20}
                    color={isValidDateBR(vaccineForm.date_applied) ? '#10B981' : colors.error}
                  />
                )}
              </View>

              {/* Próxima dose */}
              <Text style={styles.vaccineFieldLabel}>
                Próxima dose{' '}
                <Text style={styles.optionalLabel}>(opcional)</Text>
              </Text>
              <View style={styles.vaccineInputContainer}>
                <Ionicons name="calendar-outline" size={20} color={colors.gray500} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="dd/mm/aaaa"
                  placeholderTextColor={colors.gray500}
                  value={vaccineForm.next_due_date}
                  onChangeText={(text) =>
                    setVaccineForm({ ...vaccineForm, next_due_date: maskDateInput(text) })
                  }
                  keyboardType="numeric"
                  maxLength={10}
                />
              </View>

              {/* Veterinário */}
              <Text style={styles.vaccineFieldLabel}>
                Veterinário{' '}
                <Text style={styles.optionalLabel}>(opcional)</Text>
              </Text>
              <View style={[styles.vaccineInputContainer, { marginBottom: 8 }]}>
                <Ionicons name="person-outline" size={20} color={colors.gray500} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Nome do veterinário"
                  placeholderTextColor={colors.gray500}
                  value={vaccineForm.veterinarian}
                  onChangeText={(text) => setVaccineForm({ ...vaccineForm, veterinarian: text })}
                />
              </View>
            </ScrollView>

            <View style={styles.vaccineModalButtons}>
              <TouchableOpacity
                style={styles.vaccineCancelButton}
                onPress={() => setShowVaccineModal(false)}
              >
                <Text style={styles.vaccineCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.vaccineSaveButton}
                onPress={() => {
                  if (!vaccineForm.name.trim()) {
                    Alert.alert('Atenção', 'Informe o nome da vacina.');
                    return;
                  }
                  if (!isValidDateBR(vaccineForm.date_applied)) {
                    Alert.alert('Atenção', 'Informe uma data de aplicação válida (dd/mm/aaaa).');
                    return;
                  }
                  if (vaccineForm.next_due_date && !isValidDateBR(vaccineForm.next_due_date)) {
                    Alert.alert('Atenção', 'A data da próxima dose está inválida.');
                    return;
                  }
                  setInitialVaccines(prev => [...prev, { ...vaccineForm }]);
                  setShowVaccineModal(false);
                }}
              >
                <Ionicons name="add-circle" size={20} color="#fff" />
                <Text style={styles.vaccineSaveText}>Adicionar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowSuccessModal(false);
          navigation.goBack();
        }}
      >
        <View style={styles.successOverlay}>
          <View style={styles.successModalCard}>
            <View style={styles.successIconContainer}>
              <Ionicons name="checkmark-circle" size={64} color="#10B981" />
            </View>
            <Text style={styles.successTitle}>Pet cadastrado!</Text>
            <Text style={styles.successDescription}>
              {createdPetName
                ? `${createdPetName} foi cadastrado com sucesso.`
                : 'Seu pet foi cadastrado com sucesso.'}
            </Text>

            <TouchableOpacity
              style={styles.successButton}
              onPress={() => {
                setShowSuccessModal(false);
                navigation.goBack();
              }}
            >
              <Text style={styles.successButtonText}>Ir para meus pets</Text>
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
  addPhotoButton: {
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
  inputSuffix: {
    fontSize: 14,
    color: colors.gray500,
    paddingRight: 4,
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
  placeholderText: {
    color: colors.gray500,
  },
  ageText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
    marginTop: -8,
  },
  addressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
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
  useAddressButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  useAddressText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
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
  addressModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
    paddingTop: 24,
    paddingBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
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
    maxHeight: 400,
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
  vaccineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: colors.gray500,
    fontWeight: '500',
  },
  vaccineList: {
    gap: 10,
    marginBottom: 12,
  },
  vaccineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.gray300,
    padding: 12,
  },
  vaccineCardInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  vaccineIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  vaccineCardText: {
    flex: 1,
  },
  vaccineCardName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  vaccineCardDate: {
    fontSize: 12,
    color: colors.gray600,
  },
  vaccineCardNext: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '500',
    marginTop: 1,
  },
  vaccineCardVet: {
    fontSize: 12,
    color: colors.gray500,
    marginTop: 1,
  },
  vaccineRemoveButton: {
    padding: 4,
  },
  addVaccineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.tertiary,
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 24,
    borderWidth: 1.5,
    borderColor: colors.secondary,
  },
  addVaccineText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
  },
  vaccineModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '88%',
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  vaccineFieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
    marginTop: 16,
  },
  optionalLabel: {
    fontSize: 12,
    color: colors.gray500,
    fontWeight: '400',
  },
  vaccineInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundLight,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.gray300,
    paddingHorizontal: 16,
  },
  vaccineInputActive: {
    borderColor: colors.primary,
  },
  commonVaccinesList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.gray300,
    marginTop: 4,
    marginBottom: 4,
    overflow: 'hidden',
  },
  commonVaccineItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  commonVaccineItemSelected: {
    backgroundColor: colors.tertiary,
  },
  commonVaccineText: {
    fontSize: 14,
    color: colors.textPrimary,
  },
  commonVaccineTextSelected: {
    fontWeight: '600',
    color: colors.primary,
  },
  vaccineModalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  vaccineCancelButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gray200,
    borderRadius: 12,
  },
  vaccineCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.gray700,
  },
  vaccineSaveButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
  },
  vaccineSaveText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
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
  successIconContainer: {
    marginBottom: 12,
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
