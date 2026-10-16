/**
 * AddAddressScreen — tela de onboarding de endereço, exibida após o cadastro.
 *
 * Permite ao usuário cadastrar seu primeiro endereço para facilitar o
 * preenchimento automático ao cadastrar pets.
 *
 * Funcionalidades:
 *  - Busca automática de endereço por CEP via ViaCEP API
 *  - Salva o endereço na tabela 'addresses' do Supabase
 *  - Botão "Pular" que salva um flag no AsyncStorage para não exibir novamente
 *
 * Props:
 *  navigation — para navegar entre telas
 *  onComplete — callback chamado ao salvar ou pular o endereço
 *               (usado pelo Navigation para avançar ao app principal)
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  Image,
  Modal,
} from 'react-native';
import { Alert } from '../../lib/alert';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, addDoc } from 'firebase/firestore';
import { firestore } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { RootStackParamList } from '../../types/navigation.types';
import { colors } from '../../constants/colors';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList>;
  onComplete?: () => void; // Callback para avançar ao app após concluir ou pular
};

export default function AddAddressScreen({ navigation, onComplete }: Props) {
  const { user } = useAuth();
  const [cep, setCep] = useState('');
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [complement, setComplement] = useState('');
  const [loading, setLoading] = useState(false);    // Indicador do botão Salvar
  const [loadingCep, setLoadingCep] = useState(false); // Indicador do botão de busca de CEP
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  /**
   * searchCep — consulta o CEP na API ViaCEP e preenche o campo de rua automaticamente.
   * Remove caracteres não numéricos do CEP antes de enviar a requisição.
   */
  const searchCep = async () => {
    if (cep.replace(/\D/g, '').length !== 8) {
      Alert.alert('Erro', 'CEP inválido. Digite 8 dígitos.');
      return;
    }

    setLoadingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep.replace(/\D/g, '')}/json/`);
      const data = await response.json();

      if (data.erro) {
        Alert.alert('Erro', 'CEP não encontrado');
      } else {
        // Preenche automaticamente o campo de rua com o logradouro retornado
        setStreet(data.logradouro || '');
      }
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível buscar o CEP');
    } finally {
      setLoadingCep(false);
    }
  };

  /**
   * handleSave — valida os campos obrigatórios e insere o endereço na tabela 'addresses'.
   * O primeiro endereço é automaticamente marcado como padrão (is_default = true).
   */
  const handleSave = async () => {
    if (!cep || !street || !number) {
      Alert.alert('Erro', 'Por favor, preencha CEP, endereço e número');
      return;
    }

    setLoading(true);
    try {
      const addressesRef = collection(firestore, 'users', user!.uid, 'addresses');
      await addDoc(addressesRef, {
        user_id: user!.uid,
        label: 'Principal',
        cep,
        street,
        number,
        complement: complement || null,
        is_default: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      setShowSuccessModal(true);
    } catch (error) {
      console.error('Erro ao salvar endereço:', error);
      Alert.alert('Erro', 'Não foi possível salvar o endereço');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    Alert.alert(
      'Pular cadastro?',
      'Você pode adicionar seu endereço depois no perfil.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Pular', 
          onPress: async () => {
            if (user) {
              await AsyncStorage.setItem(`address_onboarding_skipped_${user.uid}`, 'true');
            }
            if (onComplete) {
              onComplete();
            }
          } 
        },
      ]
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Image 
              source={require('../../../logoepet/logo.png')} 
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.title}>Seu Endereço</Text>
          <Text style={styles.subtitle}>Para facilitar o cadastro dos seus pets</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cepContainer}>
            <View style={[styles.inputContainer, { flex: 1 }]}>
              <Ionicons name="map-outline" size={20} color={colors.primary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="CEP"
                placeholderTextColor={colors.gray500}
                value={cep}
                onChangeText={setCep}
                keyboardType="numeric"
                maxLength={9}
              />
            </View>
            <TouchableOpacity
              style={styles.searchButton}
              onPress={searchCep}
              disabled={loadingCep}
            >
              {loadingCep ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Ionicons name="search" size={20} color="#fff" />
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="location-outline" size={20} color={colors.primary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Rua / Logradouro"
              placeholderTextColor={colors.gray500}
              value={street}
              onChangeText={setStreet}
            />
          </View>

          <View style={styles.rowInputs}>
            <View style={[styles.inputContainer, { flex: 1 }]}>
              <Ionicons name="home-outline" size={20} color={colors.primary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Número"
                placeholderTextColor={colors.gray500}
                value={number}
                onChangeText={setNumber}
                keyboardType="numeric"
              />
            </View>

            <View style={[styles.inputContainer, { flex: 1.5 }]}>
              <Ionicons name="business-outline" size={20} color={colors.primary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Complemento"
                placeholderTextColor={colors.gray500}
                value={complement}
                onChangeText={setComplement}
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.buttonText}>Concluir Cadastro</Text>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <Text style={styles.skipText}>Pular esta etapa</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowSuccessModal(false);
          if (onComplete) onComplete();
        }}
      >
        <View style={styles.successOverlay}>
          <View style={styles.successModalCard}>
            <Ionicons name="checkmark-circle" size={64} color="#10B981" style={{ marginBottom: 12 }} />
            <Text style={styles.successTitle}>Cadastro concluído!</Text>
            <Text style={styles.successDescription}>
              Seu endereço foi salvo com sucesso. Vamos começar?
            </Text>
            <TouchableOpacity
              style={styles.successButton}
              onPress={() => {
                setShowSuccessModal(false);
                if (onComplete) onComplete();
              }}
            >
              <Text style={styles.successButtonText}>Ir para o app</Text>
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
    backgroundColor: colors.primary,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    padding: 8,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  cepContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray200,
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: colors.textPrimary,
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
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  skipButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  skipText: {
    color: colors.gray600,
    fontSize: 14,
    textDecorationLine: 'underline',
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
