/**
 * vaccines — utilitários puros para status e validação de vacinas.
 *
 * Centraliza a lógica de status (vencida, vence em breve, em dia,
 * dose única) e a contagem por status que estavam em VaccinesScreen,
 * além da validação comum do formulário de vacina.
 *
 * Mantido sem dependências de React para ser facilmente testável.
 */
import { colors } from '../constants/colors';
import { isValidDateBR } from './petForm';

/** Possíveis status de uma vacina baseados na data do próximo reforço */
export type VaccineStatus = 'up_to_date' | 'upcoming' | 'overdue' | 'no_reapply';

/** Shape mínimo necessário para calcular o status */
export type VaccineStatusInput = {
  next_due_date?: string | null;
};

/**
 * getVaccineStatus — calcula o status da vacina com base na data do próximo reforço.
 * - overdue: reforço já venceu
 * - upcoming: vence em até 30 dias
 * - up_to_date: ainda tem mais de 30 dias
 * - no_reapply: sem data de reforço (dose única)
 */
export function getVaccineStatus(vaccine: VaccineStatusInput): VaccineStatus {
  if (!vaccine.next_due_date) return 'no_reapply';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const nextDue = new Date(vaccine.next_due_date + 'T00:00:00');
  const diffDays = Math.ceil((nextDue.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 'overdue';
  if (diffDays <= 30) return 'upcoming';
  return 'up_to_date';
}

/** Configurações visuais (rótulo, cor e ícone) para cada status de vacina */
export const statusConfig: Record<VaccineStatus, { label: string; color: string; icon: string }> = {
  up_to_date: { label: 'Em dia', color: colors.primary, icon: 'checkmark-circle' },
  upcoming: { label: 'Vence em breve', color: colors.warning, icon: 'time' },
  overdue: { label: 'Vencida', color: colors.error, icon: 'alert-circle' },
  no_reapply: { label: 'Dose única', color: colors.info, icon: 'information-circle' },
};

/** Conta quantas vacinas há em cada status (usada nos badges de resumo) */
export function countVaccinesByStatus<T extends VaccineStatusInput>(
  vaccines: T[],
): Record<VaccineStatus, number> {
  const counts: Record<VaccineStatus, number> = {
    up_to_date: 0,
    upcoming: 0,
    overdue: 0,
    no_reapply: 0,
  };
  for (const vaccine of vaccines) {
    counts[getVaccineStatus(vaccine)]++;
  }
  return counts;
}

/** Campos do formulário de vacina */
export type VaccineFormData = {
  name: string;
  date_applied: string;
  next_due_date: string;
  veterinarian: string;
  batch?: string;
  notes?: string;
};

/**
 * validateVaccineForm — valida os campos do formulário de vacina.
 * Retorna a mensagem de erro da primeira regra violada, ou null se válido.
 */
export function validateVaccineForm(form: VaccineFormData): string | null {
  if (!form.name.trim()) return 'Informe o nome da vacina.';
  if (!isValidDateBR(form.date_applied)) {
    return 'Informe uma data de aplicação válida (dd/mm/aaaa).';
  }
  if (form.next_due_date && !isValidDateBR(form.next_due_date)) {
    return 'Data do próximo reforço inválida (dd/mm/aaaa).';
  }
  return null;
}
