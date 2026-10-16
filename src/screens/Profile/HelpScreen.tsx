/**
 * HelpScreen — tela de ajuda e perguntas frequentes (FAQ).
 *
 * Exibe perguntas agrupadas por categoria em um acordeão animado.
 * Usa LayoutAnimation para animar a abertura/fechamento das respostas.
 * Também provê link direto para o suporte via e-mail.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  LayoutAnimation,
  Platform,
  UIManager,
  Linking,
} from 'react-native';
import { Alert } from '../../lib/alert';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ProfileStackParamList } from '../../types/navigation.types';
import { colors } from '../../constants/colors';

// Habilita animações de layout no Android (necessário para o acordeão do FAQ)
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Props = {
  navigation: NativeStackNavigationProp<ProfileStackParamList>;
};

/** Dados das perguntas frequentes, agrupados por categoria */
const faqData = [
  {
    category: 'Geral',
    questions: [
      {
        question: 'O que é o e-Pet?',
        answer: 'O e-Pet é um aplicativo de carteira digital para pets. Você pode cadastrar seus animais de estimação, gerar QR Codes de identificação e compartilhar as informações de contato caso o pet seja encontrado.',
      },
      {
        question: 'O app é gratuito?',
        answer: 'Sim! O e-Pet é totalmente gratuito para cadastro de pets e geração de carteiras digitais.',
      },
      {
        question: 'Quantos pets posso cadastrar?',
        answer: 'Não há limite! Você pode cadastrar quantos pets quiser na sua conta.',
      },
    ],
  },
  {
    category: 'Cadastro de Pets',
    questions: [
      {
        question: 'Como cadastrar um pet?',
        answer: 'Na tela inicial, toque no botão "+" para adicionar um novo pet. Preencha as informações como nome, espécie, raça e dados do tutor. Você também pode adicionar uma foto.',
      },
      {
        question: 'O que é o Pet ID?',
        answer: 'O Pet ID é um identificador único do seu pet no formato Pet-XXX-XXX. Ele é gerado automaticamente ao cadastrar e pode ser usado para identificação.',
      },
      {
        question: 'Como adicionar foto do pet?',
        answer: 'Ao cadastrar ou editar um pet, toque na área da foto para escolher entre tirar uma nova foto ou selecionar da galeria.',
      },
    ],
  },
  {
    category: 'QR Code',
    questions: [
      {
        question: 'Para que serve o QR Code?',
        answer: 'O QR Code contém as informações do pet e do tutor. Se alguém encontrar seu pet perdido, pode escanear o código para ver como entrar em contato.',
      },
      {
        question: 'Como compartilhar a carteira do pet?',
        answer: 'Na tela da carteira do pet, toque em "Compartilhar Carteira" para enviar as informações por WhatsApp, e-mail ou outras formas.',
      },
    ],
  },
  {
    category: 'Conta e Perfil',
    questions: [
      {
        question: 'Como alterar meus dados?',
        answer: 'Acesse a aba "Perfil" e toque em "Editar Perfil" para alterar seu nome, telefone, endereço e foto.',
      },
      {
        question: 'Esqueci minha senha, o que fazer?',
        answer: 'Na tela de login, toque em "Esqueceu a senha?" e informe seu e-mail. Você receberá um link para criar uma nova senha.',
      },
      {
        question: 'Como excluir minha conta?',
        answer: 'Acesse Perfil > Privacidade > Excluir Meus Dados. Você receberá um e-mail de confirmação antes da exclusão.',
      },
    ],
  },
];

export default function HelpScreen({ navigation }: Props) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>('Geral');
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);

  const toggleCategory = (category: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedCategory(expandedCategory === category ? null : category);
    setExpandedQuestion(null);
  };

  const toggleQuestion = (question: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedQuestion(expandedQuestion === question ? null : question);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ajuda</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header Card */}
        <View style={styles.helpCard}>
          <View style={styles.helpIconContainer}>
            <Ionicons name="help-buoy" size={40} color={colors.primary} />
          </View>
          <Text style={styles.helpTitle}>Como podemos ajudar?</Text>
          <Text style={styles.helpSubtitle}>
            Encontre respostas para as perguntas mais frequentes
          </Text>
        </View>

        {/* FAQ Categories */}
        <Text style={styles.sectionTitle}>Perguntas Frequentes</Text>
        
        {faqData.map((category) => (
          <View key={category.category} style={styles.categoryContainer}>
            <TouchableOpacity
              style={styles.categoryHeader}
              onPress={() => toggleCategory(category.category)}
            >
              <Text style={styles.categoryTitle}>{category.category}</Text>
              <Ionicons
                name={expandedCategory === category.category ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={colors.gray600}
              />
            </TouchableOpacity>

            {expandedCategory === category.category && (
              <View style={styles.questionsContainer}>
                {category.questions.map((item) => (
                  <View key={item.question} style={styles.questionItem}>
                    <TouchableOpacity
                      style={styles.questionHeader}
                      onPress={() => toggleQuestion(item.question)}
                    >
                      <Text style={styles.questionText}>{item.question}</Text>
                      <Ionicons
                        name={expandedQuestion === item.question ? 'remove-circle' : 'add-circle'}
                        size={22}
                        color={colors.primary}
                      />
                    </TouchableOpacity>
                    
                    {expandedQuestion === item.question && (
                      <Text style={styles.answerText}>{item.answer}</Text>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        ))}

        {/* Contact Section */}
        <Text style={styles.sectionTitle}>Ainda precisa de ajuda?</Text>
        <View style={styles.contactCard}>
          <TouchableOpacity
            style={styles.contactItem}
            onPress={() =>
              Linking.openURL('mailto:support.epet@gmail.com?subject=Suporte e-Pet').catch(() =>
                Alert.alert('Erro', 'Não foi possível abrir o aplicativo de e-mail.')
              )
            }
          >
            <View style={styles.contactIcon}>
              <Ionicons name="mail" size={22} color={colors.primary} />
            </View>
            <View style={styles.contactContent}>
              <Text style={styles.contactTitle}>E-mail</Text>
              <Text style={styles.contactValue}>support.epet@gmail.com</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.gray400} />
          </TouchableOpacity>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
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
  headerButton: {
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
  helpCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  helpIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  helpTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  helpSubtitle: {
    fontSize: 14,
    color: colors.gray600,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray600,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
    marginTop: 8,
  },
  categoryContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  questionsContainer: {
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
  },
  questionItem: {
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  questionText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: colors.gray700,
    marginRight: 12,
  },
  answerText: {
    fontSize: 14,
    color: colors.gray600,
    lineHeight: 22,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: colors.backgroundLight,
  },
  contactCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  contactIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contactContent: {
    flex: 1,
  },
  contactTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  contactValue: {
    fontSize: 13,
    color: colors.gray600,
    marginTop: 2,
  },
  bottomPadding: {
    height: 40,
  },
});
