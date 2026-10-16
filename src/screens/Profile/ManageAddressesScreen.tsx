/**
 * ManageAddressesScreen — tela de gerenciamento de endereços do usuário.
 *
 * Permite listar, adicionar, editar, excluir e definir o endereço padrão.
 * Usa a API ViaCEP para preenchimento automático a partir do CEP.
 * Os dados são persistidos na subcoleção 'users/{uid}/addresses' do Firestore.
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Alert } from '../../lib/alert';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, writeBatch } from 'firebase/firestore';
import { firestore } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Address } from '../../types/database.types';
import { colors } from '../../constants/colors';

type Props = {
  navigation: NativeStackNavigationProp<any>;
};

export default function ManageAddressesScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [addresses, setAddresses] = useState<Address[]>([]);  // lista de endereços do usuário
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);          // modal de adicionar/editar endereço
  const [editingAddress, setEditingAddress] = useState<Address | null>(null); // endereço em edição (null = novo)
  const [saving, setSaving] = useState(false);
  const [searchingCep, setSearchingCep] = useState(false);    // indica consulta à API ViaCEP
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Campos do formulário de endereço
  const [formData, setFormData] = useState({
    label: '',
    cep: '',
    street: '',
    number: '',
    complement: '',
  });

  useEffect(() => {
    fetchAddresses();
  }, []);

  /** Busca os endereços salvos do usuário no Firestore */
  const fetchAddresses = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const snapshot = await getDocs(
        query(collection(firestore, 'users', user.uid, 'addresses'), where('user_id', '==', user.uid))
      );
      const data = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() } as Address))
        .sort((a, b) => (b.is_default ? 1 : 0) - (a.is_default ? 1 : 0));
      setAddresses(data);
    } catch (err) {
      console.error('Erro ao buscar endereços:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * searchCep — consulta a API pública ViaCEP para preencher o campo de rua
   * automaticamente a partir do CEP informado.
   */
  const searchCep = async () => {
    if (formData.cep.replace(/\D/g, '').length !== 8) {
      Alert.alert('Erro', 'CEP inválido. Digite 8 dígitos.');
      return;
    }

    setSearchingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${formData.cep.replace(/\D/g, '')}/json/`);
      const data = await response.json();

      if (data.erro) {
        Alert.alert('Erro', 'CEP não encontrado');
      } else {
        setFormData(prev => ({ ...prev, street: data.logradouro || '' }));
      }
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível buscar o CEP');
    } finally {
      setSearchingCep(false);
    }
  };

  const openAddModal = () => {
    setEditingAddress(null);
    setFormData({ label: '', cep: '', street: '', number: '', complement: '' });
    setShowModal(true);
  };

  const openEditModal = (address: Address) => {
    setEditingAddress(address);
    setFormData({
      label: address.label,
      cep: address.cep,
      street: address.street,
      number: address.number,
      complement: address.complement || '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.label || !formData.cep || !formData.street || !formData.number) {
      Alert.alert('Erro', 'Preencha nome, CEP, rua e número');
      return;
    }

    setSaving(true);
    try {
      const isFirstAddress = addresses.length === 0;
      const addressesRef = collection(firestore, 'users', user!.uid, 'addresses');

      if (editingAddress) {
        await updateDoc(doc(firestore, 'users', user!.uid, 'addresses', editingAddress.id), {
          label: formData.label,
          cep: formData.cep,
          street: formData.street,
          number: formData.number,
          complement: formData.complement,
          updated_at: new Date().toISOString(),
        });
        setShowModal(false);
        fetchAddresses();
        setSuccessMessage('Endereço atualizado com sucesso!');
        setShowSuccessModal(true);
      } else {
        await addDoc(addressesRef, {
          user_id: user!.uid,
          label: formData.label,
          cep: formData.cep,
          street: formData.street,
          number: formData.number,
          complement: formData.complement,
          is_default: isFirstAddress,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        setShowModal(false);
        fetchAddresses();
        setSuccessMessage('Endereço adicionado com sucesso!');
        setShowSuccessModal(true);
      }
    } catch (error) {
      Alert.alert('Erro', 'Ocorreu um erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (address: Address) => {
    Alert.alert(
      'Excluir endereço',
      `Deseja excluir o endereço "${address.label}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(firestore, 'users', user!.uid, 'addresses', address.id));
              fetchAddresses();
              setSuccessMessage('Endereço excluído!');
              setShowSuccessModal(true);
            } catch {
              Alert.alert('Erro', 'Não foi possível excluir o endereço');
            }
          },
        },
      ]
    );
  };

  const handleSetDefault = async (address: Address) => {
    try {
      const batch = writeBatch(firestore);
      // Remove default de todos
      addresses.forEach(a => {
        batch.update(doc(firestore, 'users', user!.uid, 'addresses', a.id), { is_default: false });
      });
      // Define o novo padrão
      batch.update(doc(firestore, 'users', user!.uid, 'addresses', address.id), { is_default: true });
      await batch.commit();
      fetchAddresses();
    } catch (err) {
      console.error('Erro ao definir padrão:', err);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Meus Endereços</Text>
        <TouchableOpacity onPress={openAddModal} style={styles.addButton}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : addresses.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="location-outline" size={80} color={colors.gray400} />
            <Text style={styles.emptyTitle}>Nenhum endereço cadastrado</Text>
            <Text style={styles.emptySubtitle}>
              Adicione endereços para facilitar o cadastro dos seus pets
            </Text>
            <TouchableOpacity style={styles.emptyButton} onPress={openAddModal}>
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.emptyButtonText}>Adicionar Endereço</Text>
            </TouchableOpacity>
          </View>
        ) : (
          addresses.map((address) => (
            <View key={address.id} style={styles.addressCard}>
              <View style={styles.addressHeader}>
                <View style={styles.labelContainer}>
                  <Ionicons name="location" size={20} color={colors.primary} />
                  <Text style={styles.addressLabel}>{address.label}</Text>
                  {address.is_default && (
                    <View style={styles.defaultBadge}>
                      <Text style={styles.defaultBadgeText}>Padrão</Text>
                    </View>
                  )}
                </View>
                <View style={styles.addressActions}>
                  <TouchableOpacity onPress={() => openEditModal(address)} style={styles.actionButton}>
                    <Ionicons name="create-outline" size={20} color={colors.gray600} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(address)} style={styles.actionButton}>
                    <Ionicons name="trash-outline" size={20} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
              <Text style={styles.addressText}>
                {address.street}, {address.number}
                {address.complement && ` - ${address.complement}`}
              </Text>
              <Text style={styles.addressCep}>CEP: {address.cep}</Text>
              {!address.is_default && (
                <TouchableOpacity
                  style={styles.setDefaultButton}
                  onPress={() => handleSetDefault(address)}
                >
                  <Text style={styles.setDefaultText}>Definir como padrão</Text>
                </TouchableOpacity>
              )}
            </View>
          ))
        )}
        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Modal de Adicionar/Editar */}
      <Modal visible={showModal} transparent animationType="slide">
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingAddress ? 'Editar Endereço' : 'Novo Endereço'}
              </Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color={colors.gray600} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.inputContainer}>
                <Ionicons name="pricetag-outline" size={20} color={colors.gray500} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Nome (ex: Casa, Trabalho, Casa dos Pais)"
                  placeholderTextColor={colors.gray500}
                  value={formData.label}
                  onChangeText={(text) => setFormData({ ...formData, label: text })}
                />
              </View>

              <View style={styles.cepContainer}>
                <View style={[styles.inputContainer, { flex: 1 }]}>
                  <Ionicons name="map-outline" size={20} color={colors.gray500} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="CEP"
                    placeholderTextColor={colors.gray500}
                    value={formData.cep}
                    onChangeText={(text) => setFormData({ ...formData, cep: text })}
                    keyboardType="numeric"
                    maxLength={9}
                  />
                </View>
                <TouchableOpacity
                  style={styles.searchButton}
                  onPress={searchCep}
                  disabled={searchingCep}
                >
                  {searchingCep ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Ionicons name="search" size={20} color="#fff" />
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.inputContainer}>
                <Ionicons name="location-outline" size={20} color={colors.gray500} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Rua / Logradouro"
                  placeholderTextColor={colors.gray500}
                  value={formData.street}
                  onChangeText={(text) => setFormData({ ...formData, street: text })}
                />
              </View>

              <View style={styles.rowInputs}>
                <View style={[styles.inputContainer, { flex: 1 }]}>
                  <Ionicons name="home-outline" size={20} color={colors.gray500} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Número"
                    placeholderTextColor={colors.gray500}
                    value={formData.number}
                    onChangeText={(text) => setFormData({ ...formData, number: text })}
                    keyboardType="numeric"
                  />
                </View>

                <View style={[styles.inputContainer, { flex: 1.5 }]}>
                  <Ionicons name="business-outline" size={20} color={colors.gray500} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Complemento"
                    placeholderTextColor={colors.gray500}
                    value={formData.complement}
                    onChangeText={(text) => setFormData({ ...formData, complement: text })}
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
                    <Text style={styles.saveButtonText}>Salvar Endereço</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal de sucesso */}
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.successOverlay}>
          <View style={styles.successModalCard}>
            <Ionicons name="checkmark-circle" size={64} color="#10B981" style={{ marginBottom: 12 }} />
            <Text style={styles.successTitle}>Pronto!</Text>
            <Text style={styles.successDescription}>{successMessage}</Text>
            <TouchableOpacity
              style={styles.successButton}
              onPress={() => setShowSuccessModal(false)}
            >
              <Text style={styles.successButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
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
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.gray600,
    textAlign: 'center',
    marginTop: 8,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 24,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  addressCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  addressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  labelContainer: {
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
  defaultBadge: {
    backgroundColor: colors.tertiary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  defaultBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
  },
  addressActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  addressText: {
    fontSize: 14,
    color: colors.gray700,
    marginBottom: 4,
  },
  addressCep: {
    fontSize: 12,
    color: colors.gray500,
  },
  setDefaultButton: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
  },
  setDefaultText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundLight,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.gray300,
    paddingHorizontal: 16,
    marginBottom: 12,
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
  cepContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  searchButton: {
    width: 56,
    height: 56,
    backgroundColor: colors.primary,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 12,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomPadding: {
    height: 40,
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
