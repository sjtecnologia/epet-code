/**
 * LoginScreen — tela de login do app e-Pet.
 *
 * Funcionalidades:
 *  - Login com e-mail e senha via Firebase Auth
 *  - Fallback automático: se o usuário só tem conta no 4YouPet (Firebase),
 *    a conta e-Pet é criada automaticamente no login (lógica no AuthContext)
 *  - Modal de redefinição de senha via Firebase Auth (envio de e-mail de reset)
 *  - Botão para mostrar/ocultar senha
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
  Image,
  SafeAreaView,
  Modal,
} from 'react-native';
import { Alert } from '../../lib/alert';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { sendPasswordResetEmail } from 'firebase/auth';
import { firebaseAuth } from '../../lib/firebase';
import { useAuth, FirebaseLikeError } from '../../contexts/AuthContext';
import { RootStackParamList } from '../../types/navigation.types';
import { colors } from '../../constants/colors';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList>;
};

export default function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);          // Controla o indicador de carregamento do login
  const [showPassword, setShowPassword] = useState(false); // Alterna visibilidade da senha
  const [showForgotModal, setShowForgotModal] = useState(false); // Controla o modal de recuperação
  const [resetEmail, setResetEmail] = useState('');        // E-mail digitado no modal de reset
  const [resetLoading, setResetLoading] = useState(false); // Indicador do botão de envio de reset
  const { signIn } = useAuth();

  /**
   * handleLogin — valida os campos e chama signIn do AuthContext.
   * Se o usuário precisar confirmar o e-mail (conta importada do 4YouPet),
   * exibe uma mensagem orientando-o a verificar a caixa de entrada.
   */
  /** Valida formato básico de e-mail */
  const isValidEmail = (value: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Erro', 'Por favor, preencha todos os campos');
      return;
    }

    if (!isValidEmail(email)) {
      Alert.alert('Erro', 'Informe um endereço de e-mail válido.');
      return;
    }

    setLoading(true);
    const { error } = await signIn(email.trim().toLowerCase(), password);
    setLoading(false);

    if (error) {
      const code = (error as FirebaseLikeError).code;
      const msg = code === 'auth/network-request-failed'
        ? 'Sem conexão com a internet. Tente novamente.'
        : 'E-mail ou senha incorretos.';
      Alert.alert('Erro', msg);
    }
    // Se sem erro, o onAuthStateChanged detecta o user e navega automaticamente
  };

  /**
   * handleForgotPassword — envia o e-mail de recuperação de senha via Firebase Auth.
   */
  const handleForgotPassword = async () => {
    if (!resetEmail.trim()) {
      Alert.alert('Erro', 'Por favor, informe seu e-mail.');
      return;
    }

    setResetLoading(true);
    try {
      await sendPasswordResetEmail(firebaseAuth, resetEmail.trim());
      setShowForgotModal(false);
      setResetEmail('');
      Alert.alert(
        'E-mail enviado!',
        'Verifique sua caixa de entrada e siga as instruções para redefinir sua senha.'
      );
    } catch {
      Alert.alert('Erro', 'Não foi possível enviar o e-mail. Verifique o endereço informado.');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={Platform.OS === 'ios' ? styles.logoContainerIOS : styles.logoContainer}>
              <Image 
                source={require('../../../logoepet/logo.png')} 
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
            <Text style={Platform.OS === 'ios' ? styles.titleIOS : styles.title}>Login</Text>
            <Text style={Platform.OS === 'ios' ? styles.subtitleIOS : styles.subtitle}>Seu Pet precisa de um PetID.</Text>
          </View>

        <View style={Platform.OS === 'ios' ? styles.cardIOS : styles.card}>
          <View style={Platform.OS === 'ios' ? styles.inputContainerIOS : styles.inputContainer}>
            <Ionicons name="mail-outline" size={22} color={colors.primary} style={styles.inputIcon} />
            <TextInput
              style={Platform.OS === 'ios' ? styles.inputIOS : styles.input}
              placeholder="E-mail"
              placeholderTextColor={colors.gray500}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={Platform.OS === 'ios' ? styles.inputContainerIOS : styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={22} color={colors.primary} style={styles.inputIcon} />
            <TextInput
              style={Platform.OS === 'ios' ? styles.inputIOS : styles.input}
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

          <TouchableOpacity
            style={[
              Platform.OS === 'ios' ? styles.buttonIOS : styles.button,
              loading && styles.buttonDisabled
            ]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={Platform.OS === 'ios' ? styles.buttonTextIOS : styles.buttonText}>Entrar</Text>
                <Ionicons name="arrow-forward" size={22} color="#fff" />
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.forgotButton}
            onPress={() => {
              setResetEmail(email);
              setShowForgotModal(true);
            }}
          >
            <Text style={styles.forgotText}>Esqueceu a senha?</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => navigation.navigate('Register')}
        >
          <Text style={styles.linkText}>Não tem conta? </Text>
          <Text style={styles.linkTextBold}>Cadastre-se</Text>
        </TouchableOpacity>
      </View>
      </KeyboardAvoidingView>

      {/* Modal de recuperação de senha */}
      <Modal
        visible={showForgotModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowForgotModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Recuperar senha</Text>
              <TouchableOpacity onPress={() => setShowForgotModal(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>
              Informe seu e-mail e enviaremos um link para redefinir sua senha.
            </Text>
            <View style={styles.modalInputContainer}>
              <Ionicons name="mail-outline" size={20} color={colors.primary} style={styles.inputIcon} />
              <TextInput
                style={styles.modalInput}
                placeholder="Seu e-mail"
                placeholderTextColor={colors.gray500}
                value={resetEmail}
                onChangeText={setResetEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            <TouchableOpacity
              style={[styles.modalButton, resetLoading && styles.buttonDisabled]}
              onPress={handleForgotPassword}
              disabled={resetLoading}
              activeOpacity={0.8}
            >
              {resetLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.modalButtonText}>Enviar link</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  content: {
    flex: 1,
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
  logoContainerIOS: {
    width: 120,
    height: 120,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.98)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  titleIOS: {
    fontSize: 40,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
  },
  subtitleIOS: {
    fontSize: 17,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: -0.3,
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
  cardIOS: {
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderRadius: 28,
    padding: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray200,
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  inputContainerIOS: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(242,242,247,0.95)',
    borderRadius: 14,
    marginBottom: 18,
    paddingHorizontal: 18,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.04)',
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
  inputIOS: {
    flex: 1,
    paddingVertical: 18,
    fontSize: 17,
    fontWeight: '500',
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  eyeIcon: {
    padding: 4,
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
  buttonIOS: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 12,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonTextIOS: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  linkButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  linkText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
  },
  linkTextBold: {
    color: colors.secondary,
    fontWeight: '600',
    fontSize: 14,
  },
  forgotButton: {
    alignItems: 'center',
    marginTop: 14,
  },
  forgotText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  modalSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 20,
    lineHeight: 20,
  },
  modalInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray200,
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  modalInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.textPrimary,
  },
  modalButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
