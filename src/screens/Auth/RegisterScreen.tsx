/**
 * RegisterScreen — tela de cadastro de novo usuário.
 *
 * Coleta: nome completo, telefone, e-mail, senha e confirmação de senha.
 * Validações antes do envio:
 *  - Todos os campos obrigatórios preenchidos
 *  - Senhas coincidem
 *  - Senha com no mínimo 6 caracteres
 *
 * Após o cadastro:
 *  - Se o Supabase exigir confirmação de e-mail: exibe alerta e volta para o Login
 *  - Se já criar sessão: o AuthProvider detecta e navega automaticamente
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
} from 'react-native';
import { Alert } from '../../lib/alert';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth, FirebaseLikeError } from '../../contexts/AuthContext';
import { RootStackParamList } from '../../types/navigation.types';
import { colors } from '../../constants/colors';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList>;
};

export default function RegisterScreen({ navigation }: Props) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);              // Indicador de carregamento durante o cadastro
  const [showPassword, setShowPassword] = useState(false);    // Alterna visibilidade da senha
  const [showConfirmPassword, setShowConfirmPassword] = useState(false); // Alterna visibilidade da confirmação
  const { signUp } = useAuth();

  /**
   * handleRegister — valida os campos e chama signUp do AuthContext.
   * O signUp também cria a conta no Firebase e o documento no Firestore.
   */
  /** Valida formato básico de e-mail */
  const isValidEmail = (value: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());

  const handleRegister = async () => {
    if (!name.trim() || !phone.trim() || !email.trim() || !password || !confirmPassword) {
      Alert.alert('Erro', 'Por favor, preencha todos os campos');
      return;
    }

    if (!isValidEmail(email)) {
      Alert.alert('Erro', 'Informe um endereço de e-mail válido.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Erro', 'As senhas não coincidem');
      return;
    }

    if (password.length < 8) {
      Alert.alert('Erro', 'A senha deve ter pelo menos 8 caracteres.');
      return;
    }

    if (!/[A-Z]/.test(password)) {
      Alert.alert('Erro', 'A senha deve conter pelo menos uma letra maiúscula.');
      return;
    }

    if (!/[0-9]/.test(password)) {
      Alert.alert('Erro', 'A senha deve conter pelo menos um número.');
      return;
    }

    setLoading(true);
    const result = await signUp(email.trim().toLowerCase(), password, name.trim(), phone.trim());
    setLoading(false);

    if (result.error) {
      const code = (result.error as FirebaseLikeError).code;
      const msg = code === 'auth/email-already-in-use'
        ? 'Este e-mail já está em uso.'
        : code === 'auth/invalid-email'
        ? 'Endereço de e-mail inválido.'
        : code === 'auth/network-request-failed'
        ? 'Sem conexão com a internet. Tente novamente.'
        : 'Não foi possível criar a conta. Tente novamente.';
      Alert.alert('Erro', msg);
    }
    // Se sem erro, o onAuthStateChanged detecta o user e navega automaticamente
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>

        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Image 
              source={require('../../../logoepet/logo.png')} 
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.title}>Criar Conta</Text>
          <Text style={styles.subtitle}>Cadastre-se para começar</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.inputContainer}>
            <Ionicons name="person-outline" size={20} color={colors.primary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Nome completo"
              placeholderTextColor={colors.gray500}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="call-outline" size={20} color={colors.primary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Telefone"
              placeholderTextColor={colors.gray500}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color={colors.primary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="E-mail"
              placeholderTextColor={colors.gray500}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color={colors.primary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Senha"
              placeholderTextColor={colors.gray500}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
              <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color={colors.gray500} />
            </TouchableOpacity>
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color={colors.primary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Confirmar Senha"
              placeholderTextColor={colors.gray500}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
            />
            <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeIcon}>
              <Ionicons name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} size={20} color={colors.gray500} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.buttonText}>Cadastrar</Text>
                <Ionicons name="checkmark" size={20} color="#fff" />
              </>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.linkText}>Já tem conta? </Text>
          <Text style={styles.linkTextBold}>Fazer login</Text>
        </TouchableOpacity>
      </ScrollView>
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
    padding: Platform.OS === 'ios' ? 20 : 24,
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 62 : 50,
    left: 0,
    padding: 8,
  },
  header: {
    alignItems: 'center',
    marginBottom: Platform.OS === 'ios' ? 28 : 40,
  },
  logoContainer: {
    width: Platform.OS === 'ios' ? 116 : 100,
    height: Platform.OS === 'ios' ? 116 : 100,
    borderRadius: Platform.OS === 'ios' ? 30 : 24,
    backgroundColor: Platform.OS === 'ios' ? 'rgba(255,255,255,0.98)' : 'rgba(255,255,255,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Platform.OS === 'ios' ? 20 : 16,
    padding: Platform.OS === 'ios' ? 12 : 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: Platform.OS === 'ios' ? 8 : 0 },
    shadowOpacity: Platform.OS === 'ios' ? 0.22 : 0,
    shadowRadius: Platform.OS === 'ios' ? 16 : 0,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: Platform.OS === 'ios' ? 38 : 32,
    fontWeight: Platform.OS === 'ios' ? '800' : '700',
    color: '#fff',
    marginBottom: 8,
    letterSpacing: Platform.OS === 'ios' ? -0.4 : 0,
  },
  subtitle: {
    fontSize: Platform.OS === 'ios' ? 17 : 16,
    color: Platform.OS === 'ios' ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.8)',
    letterSpacing: Platform.OS === 'ios' ? -0.2 : 0,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: Platform.OS === 'ios' ? 22 : 24,
    padding: Platform.OS === 'ios' ? 20 : 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: Platform.OS === 'ios' ? 2 : 10 },
    shadowOpacity: Platform.OS === 'ios' ? 0.08 : 0.15,
    shadowRadius: Platform.OS === 'ios' ? 8 : 20,
    elevation: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Platform.OS === 'ios' ? '#F2F3F7' : colors.gray200,
    borderRadius: Platform.OS === 'ios' ? 14 : 12,
    marginBottom: 16,
    paddingHorizontal: Platform.OS === 'ios' ? 14 : 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: Platform.OS === 'ios' ? 15 : 16,
    fontSize: Platform.OS === 'ios' ? 17 : 16,
    color: colors.textPrimary,
  },
  eyeIcon: {
    padding: 4,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: Platform.OS === 'ios' ? 14 : 12,
    paddingVertical: Platform.OS === 'ios' ? 15 : 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: Platform.OS === 'ios' ? 3 : 0 },
    shadowOpacity: Platform.OS === 'ios' ? 0.28 : 0,
    shadowRadius: Platform.OS === 'ios' ? 8 : 0,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  linkButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Platform.OS === 'ios' ? 20 : 24,
  },
  linkText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
  },
  linkTextBold: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});
