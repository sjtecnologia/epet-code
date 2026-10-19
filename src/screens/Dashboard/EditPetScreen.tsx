/**
 * EditPetScreen — tela de edição dos dados de um pet e-Pet.
 *
 * Pré-popula o formulário com os dados existentes (recebidos via navegação),
 * permite alterar foto, espécie, raça, data de nascimento, endereço e dados
 * do tutor. Ao salvar, atualiza o documento na coleção 'pets' do Firestore
 * e faz novo upload de foto no Firebase Storage se ela foi alterada.
 *
 * A UI de formulário é compartilhada com NewPetScreen via
 * src/components/petForm.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Alert } from '../../lib/alert';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { doc, updateDoc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { firestore } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Address } from '../../types/database.types';
import { colors } from '../../constants/colors';
import { DashboardStackParamList } from '../../types/navigation.types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lastPetKey } from './DashboardScreen';
import { removePublicPet, syncPublicPet } from '../../lib/publicPet';
import { uploadImageToStorage } from '../../lib/storage';
import { SpeciesId, formatDateForDB, buildFullAddress } from '../../lib/petForm';
import { isValidCustomSpecies } from '../../lib/species';
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
      const date = new Date(
        parseInt(parts[2]),
        parseInt(parts[1]) - 1,
        parseInt(parts[0]),
        12,
        0,
        0,
      );
      if (!isNaN(date.getTime())) return date;
    }
  }

  return new Date();
};

/** Desmonta a string de endereço completo em campos separados (rua, número, complemento) */
// Parse address into separate fields
const parseAddress = (
  address: string | null,
): { street: string; number: string; complement: string } => {
  if (!address) return { street: '', number: '', complement: '' };

  // Try to parse "Rua, Número - Complemento" or "Rua, Número, Complemento" format
  const parts = address.split(/[,-]/).map((p) => p.trim());

  if (parts.length >= 3) {
    return { street: parts[0], number: parts[1], complement: parts.slice(2).join(', ') };
  } else if (parts.length === 2) {
    return { street: parts[0], number: parts[1], complement: '' };
  }

  return { street: address, number: '', complement: '' };
};

export default function EditPetScreen({ navigation, route }: Props) {
  const { pet } = route.params; // dados atuais do pet a editar
  const { user } = useAuth(); // usuário autenticado
  const [loading, setLoading] = useState(false); // envio em andamento
  const [photoUri, setPhotoUri] = useState<string | null>(pet.photo_url); // URL/URI da foto atual
  const [photoChanged, setPhotoChanged] = useState(false); // indica se a foto foi trocada

  // --- Data de nascimento -------------------------------------------------------
  const [birthDate, setBirthDate] = useState<Date>(parseDate(pet.birth_date));

  // --- Endereço ------------------------------------------------------------------
  const parsedAddress = parseAddress(pet.address); // desmonta o endereço salvo
  const [street, setStreet] = useState(parsedAddress.street);
  const [number, setNumber] = useState(parsedAddress.number);
  const [complement, setComplement] = useState(parsedAddress.complement);
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // --- Espécie personalizada ---------------------------------------------------
  const [customSpecies, setCustomSpecies] = useState(pet.custom_species || '');
  const {
    validating: validatingSpecies,
    result: speciesValidationResult,
    validate: validateCustomSpeciesDebounced,
  } = useSpeciesValidation();

  // Seleção de foto (galeria/câmera) compartilhada — marca a foto como alterada
  const { showPhotoOptions } = usePhotoPicker(
    (uri) => {
      setPhotoUri(uri);
      setPhotoChanged(true);
    },
    {
      alertTitle: 'Alterar Foto',
      alertMessage: 'Como você deseja alterar a foto?',
      galleryDeniedMessage: 'Precisamos de acesso à galeria para adicionar foto do pet.',
      cameraDeniedMessage: 'Precisamos de acesso à câmera para tirar foto do pet.',
    },
  );

  /** Busca os endereços salvos do usuário para o seletor de endereço */
  const fetchSavedAddresses = useCallback(async () => {
    if (!user) return;

    try {
      const snapshot = await getDocs(
        query(
          collection(firestore, 'users', user.uid, 'addresses'),
          where('user_id', '==', user.uid),
        ),
      );
      const addrs = snapshot.docs
        .map((d) => ({ id: d.id, ...d.data() }) as Address)
        .sort((a, b) => (b.is_default ? 1 : 0) - (a.is_default ? 1 : 0));
      setSavedAddresses(addrs);
    } catch (err) {
      console.error('Erro ao buscar endereços:', err);
    }
  }, [user]);

  useEffect(() => {
    fetchSavedAddresses();
  }, [fetchSavedAddresses]);

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
      let photoUrl = pet.photo_url;
      if (photoChanged && photoUri && photoUri !== pet.photo_url) {
        photoUrl = (await uploadImageToStorage(photoUri, `pet-photos/${user!.uid}`)) ?? photoUrl;
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
                query(collection(firestore, 'pet'), where('epet_id', '==', pet.id)),
              );
              await Promise.all(mirrorSnap.docs.map((d) => deleteDoc(d.ref)));
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
                  } catch {
                    /* ignora */
                  }
                }
              }
              navigation.popToTop();
            } catch {
              Alert.alert('Erro', 'Não foi possível excluir o pet.');
            } finally {
              setLoading(false);
            }
          },
        },
      ],
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <PetFormHeader
        title="Editar Pet"
        onBack={() => navigation.goBack()}
        rightIcon="trash-outline"
        onRightPress={handleDelete}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Pet ID (Não editável) */}
        <View style={styles.petIdContainer}>
          <Ionicons name="id-card" size={18} color={colors.primary} />
          <Text style={styles.petIdLabel}>ID do Pet:</Text>
          <Text style={styles.petIdValue}>{pet.pet_id}</Text>
        </View>

        {/* Foto do Pet */}
        <PhotoPicker
          photoUri={photoUri}
          onPress={showPhotoOptions}
          badgeIcon="pencil"
          badgeIconSize={14}
        />

        {/* Seleção de Espécie */}
        <Text style={styles.sectionTitle}>Espécie</Text>
        <SpeciesSelector
          value={formData.species as SpeciesId}
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
            placeholder="Nome do pet *"
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
            placeholder="Nome do tutor *"
            value={formData.ownerName}
            onChangeText={(text) => setFormData({ ...formData, ownerName: text })}
          />
          <FormInput
            icon="call-outline"
            placeholder="Telefone *"
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
          placeholder="Informações adicionais sobre o pet..."
          value={formData.notes}
          onChangeText={(text) => setFormData({ ...formData, notes: text })}
        />

        {/* Botão de Salvar */}
        <SubmitButton
          onPress={handleUpdate}
          loading={loading}
          label="Salvar Alterações"
          loadingLabel="Salvando..."
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
        manualOptionText="Editar endereço manualmente"
      />

      <SuccessModal
        visible={showSuccessModal}
        title="Pet atualizado!"
        description="As informações do pet foram salvas com sucesso."
        buttonText="OK"
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
  bottomPadding: {
    height: 40,
  },
});
