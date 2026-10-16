/**
 * lib/alert.ts — substituto do Alert nativo com design customizado.
 *
 * Uso nos screens:
 *   import { Alert } from '../../lib/alert';
 *   Alert.alert('Título', 'Mensagem', buttons?);
 *
 * A API é idêntica ao Alert do React Native, então nenhuma chamada
 * existente precisa ser alterada — apenas o import muda.
 */
import { CustomAlertRef, AlertButton } from '../components/CustomAlert';

// Ref global injetada pelo CustomAlertComponent montado em App.tsx
let _ref: CustomAlertRef | null = null;

/** Registra a referência do componente (chamado em App.tsx via ref callback) */
export function registerAlertRef(ref: CustomAlertRef | null) {
  _ref = ref;
}

/** Objeto com a mesma interface do Alert do React Native */
export const Alert = {
  alert: (title: string, message?: string, buttons?: AlertButton[]) => {
    _ref?.show(title, message, buttons);
  },
};
