/**
 * CustomAlert — substitui o Alert nativo por um modal estilizado.
 *
 * Uso via API estática (idêntica ao Alert do React Native):
 *   import { Alert } from '../../lib/alert';
 *   Alert.alert('Título', 'Mensagem', [{ text: 'OK' }]);
 */
import React, {
  forwardRef,
  useImperativeHandle,
  useState,
} from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/colors';

export type AlertButton = {
  text?: string;
  onPress?: (() => void) | null;
  style?: 'default' | 'cancel' | 'destructive';
};

type AlertConfig = {
  title: string;
  message?: string;
  buttons?: AlertButton[];
};

export interface CustomAlertRef {
  show: (title: string, message?: string, buttons?: AlertButton[]) => void;
}

/** Escolhe ícone e cor com base nas palavras do título */
function resolveIcon(title: string): { name: keyof typeof Ionicons.glyphMap; color: string } {
  const t = title.toLowerCase();
  if (t.includes('erro') || t.includes('error') || t.includes('inválid') || t.includes('falha'))
    return { name: 'close-circle', color: colors.error };
  if (t.includes('sucesso') || t.includes('copiado') || t.includes('salvo') || t.includes('concluí'))
    return { name: 'checkmark-circle', color: colors.primary };
  if (t.includes('atenção') || t.includes('aviso') || t.includes('permissão') || t.includes('cuidado'))
    return { name: 'warning', color: colors.warning };
  if (t.includes('excluir') || t.includes('remover') || t.includes('deletar') || t.includes('apagar'))
    return { name: 'trash', color: colors.error };
  if (t.includes('sair') || t.includes('logout'))
    return { name: 'log-out', color: colors.error };
  return { name: 'information-circle', color: colors.primary };
}

const CustomAlertComponent = forwardRef<CustomAlertRef>((_, ref) => {
  const [visible, setVisible] = useState(false);
  const [config, setConfig] = useState<AlertConfig>({ title: '' });

  useImperativeHandle(ref, () => ({
    show: (title, message, buttons) => {
      setConfig({ title, message, buttons: buttons?.length ? buttons : [{ text: 'OK' }] });
      setVisible(true);
    },
  }));

  const dismiss = () => setVisible(false);

  const handlePress = (btn: AlertButton) => {
    dismiss();
    btn.onPress?.();
  };

  const { name: iconName, color: iconColor } = resolveIcon(config.title);
  const buttons = config.buttons ?? [{ text: 'OK' }];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={dismiss}
      statusBarTranslucent
    >
      <Pressable style={styles.overlay} onPress={dismiss}>
        <Pressable style={styles.card} onPress={() => {}}>
          {/* Ícone */}
          <View style={[styles.iconWrap, { backgroundColor: iconColor + '18' }]}>
            <Ionicons name={iconName} size={32} color={iconColor} />
          </View>

          {/* Título */}
          <Text style={styles.title}>{config.title}</Text>

          {/* Mensagem */}
          {!!config.message && (
            <Text style={styles.message}>{config.message}</Text>
          )}

          {/* Divisor */}
          <View style={styles.divider} />

          {/* Botões */}
          <View style={[styles.buttonsRow, buttons.length > 2 && styles.buttonsColumn]}>
            {buttons.map((btn, i) => {
              const isCancel = btn.style === 'cancel';
              const isDestructive = btn.style === 'destructive';
              const isLast = i === buttons.length - 1;
              return (
                <React.Fragment key={i}>
                  {i > 0 && buttons.length <= 2 && (
                    <View style={styles.btnDividerV} />
                  )}
                  <TouchableOpacity
                    style={[
                      styles.btn,
                      buttons.length === 1 && styles.btnFull,
                      buttons.length > 2 && styles.btnWide,
                      !isLast && buttons.length > 2 && styles.btnBorderBottom,
                    ]}
                    onPress={() => handlePress(btn)}
                    activeOpacity={0.6}
                  >
                    <Text
                      style={[
                        styles.btnText,
                        isCancel && styles.btnTextCancel,
                        isDestructive && styles.btnTextDestructive,
                        !isCancel && !isDestructive && styles.btnTextDefault,
                      ]}
                    >
                      {btn.text ?? 'OK'}
                    </Text>
                  </TouchableOpacity>
                </React.Fragment>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
});

export default CustomAlertComponent;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  card: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingTop: 28,
    paddingBottom: 0,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 12,
  },
  iconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: colors.gray600,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: colors.gray200,
    marginTop: 4,
  },
  buttonsRow: {
    flexDirection: 'row',
    width: '100%',
  },
  buttonsColumn: {
    flexDirection: 'column',
  },
  btn: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnFull: {
    flex: 1,
  },
  btnWide: {
    flex: undefined,
    width: '100%',
  },
  btnBorderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  btnDividerV: {
    width: 1,
    backgroundColor: colors.gray200,
  },
  btnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  btnTextDefault: {
    color: colors.primary,
  },
  btnTextCancel: {
    color: colors.gray500,
    fontWeight: '400',
  },
  btnTextDestructive: {
    color: colors.error,
  },
});
