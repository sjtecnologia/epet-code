/**
 * NewPetScreen — formulário de cadastro de novo pet.
 *
 * Permite ao usuário preencher todos os dados do pet (nome, espécie, raça,
 * data de nascimento, foto, endereço, tutor e vacinas iniciais),
 * fazer upload da foto para o Firebase Storage, salvar o pet no
 * Firestore (coleção 'pets') e registrar na coleção 4YouPet.
 *
 * A UI de formulário é compartilhada com EditPetScreen via
 * src/components/petForm.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Alert } from '../../lib/alert';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { firestore, firebaseAuth } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext'; // usuário autenticado
import { Address } from '../../types/database.types'; // tipo do endereço
import { DashboardStackParamList } from '../../types/navigation.types';
import { colors } from '../../constants/colors'; // paleta de cores
import { syncPublicPet } from '../../lib/publicPet';
import { uploadImageToStorage } from '../../lib/storage';
import {
  generatePetId,
  emptyVaccineForm,
  VaccineDraft,
  isValidDateBR,
  parseDateBR,
  formatDateForDB,
  buildFullAddress,
} from '../../lib/petForm';
import { isValidCustomSpecies } from '../../lib/species';
import { validateVaccineForm } from '../../lib/vaccines';
import { VaccineFormModal } from '../../components/vaccineForm/VaccineFormModal';
import { useSpeciesValidation } from '../../hooks/useSpeciesValidation';
import {
  PetFormHeader,
  PhotoPicker,
  usePhotoPicker,
  SpeciesSelector,
  CustomSpeciesField,
  FormInput,
  BirthDateField,
  AddressFields,
  AddressModal,
  SubmitButton,
  SuccessModal,
} from '../../components/petForm';

type Props = {
  navigation: NativeStackNavigationProp<DashboardStackParamList>;
};

export default function NewPetScreen({ navigation }: Props) {
  const { user } = useAuth(); // usuário autenticado

  // --- Estados gerais -----------------------------------------------------------
  const [loading, setLoading] = useState(false); // indica envio em andamento
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdPetName, setCreatedPetName] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null); // URI local da foto escolhida
  const [birthDate, setBirthDate] = useState<Date | null>(null); // data de nascimento do pet

  // --- Endereço ------------------------------------------------------------------
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [complement, setComplement] = useState('');
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]); // endereços salvos do usuário
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showAddressModal, setShowAddressModal] = useState(false); // modal de seleção de endereço

  // --- Espécie customizada -------------------------------------------------------
  const [customSpecies, setCustomSpecies] = useState(''); // texto da espécie "Outro"
  const {
    validating: validatingSpecies,
    result: speciesValidationResult,
    validate: validateCustomSpeciesDebounced,
  } = useSpeciesValidation();

  // --- Vacinas iniciais ----------------------------------------------------------
  const [initialVaccines, setInitialVaccines] = useState<VaccineDraft[]>([]); // lista de vacinas a cadastrar
  const [showVaccineModal, setShowVaccineModal] = useState(false); // modal de adicionar vacina
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

  // Seleção de foto (galeria/câmera) compartilhada
  const { showPhotoOptions } = usePhotoPicker((uri) => setPhotoUri(uri));

  /** Preenche os campos de endereço com os dados do endereço selecionado */
  const handleSelectAddress = useCallback((address: Address) => {
    setSelectedAddressId(address.id);
    setStreet(address.street);
    setNumber(address.number);
    setComplement(address.complement || '');
    setShowAddressModal(false);
  }, []);

  /** Busca os endereços cadastrados do usuário no Firestore e auto-seleciona o padrão */
  const fetchSavedAddresses = useCallback(async () => {
    if (!user) return;

    try {
      const { getDocs, collection: col, query: q, where } = await import('firebase/firestore');
      const snapshot = await getDocs(
        q(col(firestore, 'users', user.uid, 'addresses'), where('user_id', '==', user.uid)),
      );
      const addrs = snapshot.docs
        .map((d) => ({ id: d.id, ...d.data() }) as Address)
        .sort((a, b) => (b.is_default ? 1 : 0) - (a.is_default ? 1 : 0));

      setSavedAddresses(addrs);
      const defaultAddr = addrs.find((a) => a.is_default);
      if (defaultAddr) handleSelectAddress(defaultAddr);
    } catch (err) {
      console.error('Erro ao buscar endereços:', err);
    }
  }, [user, handleSelectAddress]);

  // Carrega os endereços salvos ao montar o componente
  useEffect(() => {
    fetchSavedAddresses();
  }, [fetchSavedAddresses]);

  /** Limpa os campos de endereço e a seleção ativa */
  const handleClearAddress = () => {
    setSelectedAddressId(null);
    setStreet('');
    setNumber('');
    setComplement('');
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
        Alert.alert(
          'Espécie inválida',
          'Por favor, verifique o nome da espécie e tente novamente.',
        );
        return;
      }
      if (speciesValidationResult !== 'valid') {
        const isValid = isValidCustomSpecies(customSpecies);
        if (!isValid) {
          Alert.alert(
            'Espécie inválida',
            'Por favor, verifique o nome da espécie e tente novamente.',
          );
          return;
        }
      }
    }

    setLoading(true);

    try {
      let photoUrl: string | null = null;
      if (photoUri) {
        photoUrl = await uploadImageToStorage(photoUri, `pet-photos/${user!.uid}`);
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
      const validVaccines = initialVaccines.filter((v) => v.name && isValidDateBR(v.date_applied));
      await Promise.all(
        validVaccines.map((v) =>
          addDoc(collection(firestore, 'pets', petDocRef.id, 'vaccines'), {
            pet_id: petDocRef.id,
            name: v.name,
            date_applied: parseDateBR(v.date_applied),
            next_due_date:
              v.next_due_date && isValidDateBR(v.next_due_date)
                ? parseDateBR(v.next_due_date)
                : null,
            veterinarian: v.veterinarian || null,
            batch: null,
            notes: null,
            created_at: new Date().toISOString(),
          }),
        ),
      );

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
      } catch (fbErr) {
        const message = fbErr instanceof Error ? fbErr.message : String(fbErr);
        console.warn('[Firebase] Falha ao espelhar pet no 4YouPet:', message);
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
      <PetFormHeader title="Novo Pet" onBack={() => navigation.goBack()} />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Foto do Pet */}
        <PhotoPicker photoUri={photoUri} onPress={showPhotoOptions} />

        {/* Seleção de Espécie */}
        <Text style={styles.sectionTitle}>Espécie</Text>
        <SpeciesSelector
          value={formData.species}
          onChange={(species) => setFormData({ ...formData, species })}
        />

        {/* Campo de espécie customizada */}
        {formData.species === 'other' && (
          <CustomSpeciesField
            value={customSpecies}
            onChangeText={(text) => {
              setCustomSpecies(text);
              validateCustomSpeciesDebounced(text);
            }}
            validating={validatingSpecies}
            validationResult={speciesValidationResult}
          />
        )}

        {/* Dados do Pet */}
        <Text style={styles.sectionTitle}>Dados do Pet</Text>
        <View style={styles.inputGroup}>
          <FormInput
            icon="paw-outline"
            placeholder="Nome do pet"
            value={formData.name}
            onChangeText={(text) => setFormData({ ...formData, name: text })}
          />
          <FormInput
            icon="heart-outline"
            placeholder="Raça"
            value={formData.breed}
            onChangeText={(text) => setFormData({ ...formData, breed: text })}
          />
          <BirthDateField value={birthDate} onChange={setBirthDate} />
        </View>

        {/* Dados do Tutor */}
        <Text style={styles.sectionTitle}>Dados do Tutor</Text>
        <View style={styles.inputGroup}>
          <FormInput
            icon="person-outline"
            placeholder="Nome do tutor"
            value={formData.ownerName}
            onChangeText={(text) => setFormData({ ...formData, ownerName: text })}
          />
          <FormInput
            icon="call-outline"
            placeholder="Telefone"
            value={formData.ownerPhone}
            onChangeText={(text) => setFormData({ ...formData, ownerPhone: text })}
            keyboardType="phone-pad"
          />
          <FormInput
            icon="mail-outline"
            placeholder="E-mail"
            value={formData.ownerEmail}
            onChangeText={(text) => setFormData({ ...formData, ownerEmail: text })}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        {/* Endereço - Seletor de endereços salvos */}
        <AddressFields
          savedAddresses={savedAddresses}
          selectedAddressId={selectedAddressId}
          onOpenModal={() => setShowAddressModal(true)}
          onClearAddress={handleClearAddress}
          street={street}
          number={number}
          complement={complement}
          onChangeStreet={setStreet}
          onChangeNumber={setNumber}
          onChangeComplement={setComplement}
        />

        {/* Observações */}
        <Text style={styles.sectionTitle}>Observações</Text>
        <FormInput
          multiline
          placeholder="Informações adicionais..."
          value={formData.notes}
          onChangeText={(text) => setFormData({ ...formData, notes: text })}
        />

        {/* Peso Inicial */}
        <View style={styles.vaccineHeader}>
          <Text style={styles.sectionTitle}>Peso Atual</Text>
          <Text style={styles.sectionSubtitle}>Opcional</Text>
        </View>
        <FormInput
          icon="scale-outline"
          placeholder="Ex: 4.5"
          value={initialPeso}
          onChangeText={setInitialPeso}
          keyboardType="decimal-pad"
          suffix="kg"
        />

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
                  onPress={() => setInitialVaccines((prev) => prev.filter((_, i) => i !== index))}
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
            setShowVaccineModal(true);
          }}
        >
          <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
          <Text style={styles.addVaccineText}>Adicionar Vacina</Text>
        </TouchableOpacity>

        {/* Botão de Cadastrar */}
        <SubmitButton
          onPress={handleSubmit}
          loading={loading}
          label="Cadastrar Pet"
          loadingLabel="Cadastrando..."
        />

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Modal de Seleção de Endereços */}
      <AddressModal
        visible={showAddressModal}
        onClose={() => setShowAddressModal(false)}
        addresses={savedAddresses}
        selectedAddressId={selectedAddressId}
        onSelect={handleSelectAddress}
        onManual={() => {
          handleClearAddress();
          setShowAddressModal(false);
        }}
        manualOptionText="Digitar endereço manualmente"
      />

      {/* Modal de Adicionar Vacina */}
      <VaccineFormModal
        visible={showVaccineModal}
        title="Nova Vacina"
        value={vaccineForm}
        onChange={(next) =>
          setVaccineForm({
            name: next.name,
            date_applied: next.date_applied,
            next_due_date: next.next_due_date,
            veterinarian: next.veterinarian,
          })
        }
        onClose={() => setShowVaccineModal(false)}
        onSave={() => {
          const validationError = validateVaccineForm(vaccineForm);
          if (validationError) {
            Alert.alert('Atenção', validationError);
            return;
          }
          setInitialVaccines((prev) => [...prev, { ...vaccineForm }]);
          setShowVaccineModal(false);
        }}
        saveLabel="Adicionar"
        cancelLabel="Cancelar"
        showDateValidityIcon
      />

      <SuccessModal
        visible={showSuccessModal}
        title="Pet cadastrado!"
        description={
          createdPetName
            ? `${createdPetName} foi cadastrado com sucesso.`
            : 'Seu pet foi cadastrado com sucesso.'
        }
        buttonText="Ir para meus pets"
        onClose={() => {
          setShowSuccessModal(false);
          navigation.goBack();
        }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 12,
    marginTop: 8,
  },
  inputGroup: {
    gap: 12,
    marginBottom: 8,
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
  bottomPadding: {
    height: 40,
  },
});
