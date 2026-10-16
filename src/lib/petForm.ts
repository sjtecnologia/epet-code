/**
 * petForm — utilitários puros compartilhados pelos formulários e telas de pet.
 *
 * Centraliza lógica que estava duplicada entre NewPetScreen, EditPetScreen,
 * VaccinesScreen e FourYouPetPetScreen (máscaras e validação de data, cálculo
 * de idade, geração de ID, opções de espécie e lista de vacinas comuns).
 *
 * Mantido sem dependências de React para ser facilmente testável.
 */
import uuid from 'react-native-uuid';

/** Espécies suportadas no cadastro (as demais entram em "other") */
export type SpeciesId = 'dog' | 'cat' | 'bird' | 'other';

/** Opções de espécie exibidas como botões selecionáveis */
export const speciesOptions = [
  { id: 'dog' as SpeciesId, label: 'Cachorro', icon: 'paw' as const },
  { id: 'cat' as SpeciesId, label: 'Gato', icon: 'paw' as const },
  { id: 'bird' as SpeciesId, label: 'Pássaro', icon: 'leaf' as const },
  { id: 'other' as SpeciesId, label: 'Outro', icon: 'ellipse' as const },
];

/**
 * generatePetId — gera um ID único e legível para o pet no formato PET-XXXX-XXXX.
 * Usa UUID v4 como base garantindo unicidade global.
 */
export const generatePetId = (): string => {
  const raw = (uuid.v4() as string).replace(/-/g, '').toUpperCase();
  return `PET-${raw.substring(0, 4)}-${raw.substring(4, 8)}`;
};

/** Lista de vacinas comuns pré-definidas para facilitar o preenchimento */
export const COMMON_VACCINES = [
  'V8 / V10 (Polivalente)',
  'Antirrábica',
  'Gripe Canina (Tosse de Canil)',
  'Leishmaniose',
  'Giárdia',
  'Tríplice Felina (V3)',
  'Quádrupla Felina (V4)',
  'FeLV (Leucemia Felina)',
  'FIV / FeLV',
  'Raiva Felina',
  'Outra',
];

/** Vacina em preenchimento antes de ser salva no banco */
export type VaccineDraft = {
  name: string;
  date_applied: string;
  next_due_date: string;
  veterinarian: string;
};

/** Valor inicial vazio para o formulário de vacina */
export const emptyVaccineForm: VaccineDraft = {
  name: '',
  date_applied: '',
  next_due_date: '',
  veterinarian: '',
};

/** Aplica máscara de data no formato DD/MM/AAAA conforme o usuário digita, impedindo valores inválidos */
export function maskDateInput(value: string): string {
  let nums = value.replace(/\D/g, '');
  // Clamp dia: primeiro dígito 0-3; se 3, segundo dígito só 0-1
  if (nums.length >= 1 && parseInt(nums[0]) > 3) nums = '3' + nums.slice(1);
  if (nums.length >= 2) {
    if (nums[0] === '3' && parseInt(nums[1]) > 1) nums = nums[0] + '1' + nums.slice(2);
    if (nums[0] === '0' && nums[1] === '0') nums = nums[0] + '1' + nums.slice(2);
  }
  // Clamp mês: primeiro dígito 0-1; se 1, segundo dígito só 0-2
  if (nums.length >= 3 && parseInt(nums[2]) > 1) nums = nums.slice(0, 2) + '1' + nums.slice(3);
  if (nums.length >= 4) {
    if (nums[2] === '1' && parseInt(nums[3]) > 2) nums = nums.slice(0, 3) + '2' + nums.slice(4);
    if (nums[2] === '0' && nums[3] === '0') nums = nums.slice(0, 3) + '1' + nums.slice(4);
  }
  nums = nums.slice(0, 8);
  if (nums.length <= 2) return nums;
  if (nums.length <= 4) return `${nums.slice(0, 2)}/${nums.slice(2)}`;
  return `${nums.slice(0, 2)}/${nums.slice(2, 4)}/${nums.slice(4)}`;
}

/** Valida se uma string no formato DD/MM/AAAA representa uma data válida */
export function isValidDateBR(value: string): boolean {
  const d = value.replace(/\D/g, '');
  if (d.length !== 8) return false;
  const day = parseInt(d.slice(0, 2), 10);
  const month = parseInt(d.slice(2, 4), 10);
  const year = parseInt(d.slice(4, 8), 10);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

/**
 * Converte data no formato DD/MM/AAAA para AAAA-MM-DD (padrão ISO para o banco).
 * Retorna '' quando a entrada não tem 8 dígitos — chame sempre após `isValidDateBR`.
 */
export function parseDateBR(value: string): string {
  const cleaned = value.replace(/\D/g, '');
  if (cleaned.length !== 8) return '';
  return `${cleaned.slice(4, 8)}-${cleaned.slice(2, 4)}-${cleaned.slice(0, 2)}`;
}

/** Formata uma data ISO (AAAA-MM-DD) para o padrão brasileiro DD/MM/AAAA */
export function formatDateBR(dateString: string | null): string {
  if (!dateString) return 'Não informado';
  const [year, month, day] = dateString.split('-');
  return `${day}/${month}/${year}`;
}

/** Converte um objeto Date para a string AAAA-MM-DD usada no banco de dados */
export function formatDateForDB(date: Date | null): string | null {
  if (!date) return null;
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Normaliza um valor de data vindo do Firestore (Timestamp), Date, string ISO
 * ou época em milissegundos em um objeto Date. Retorna null quando o valor é
 * vazio ou não representa uma data válida.
 */
export function toDate(value: unknown): Date | null {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date) return value;
  if (typeof value === 'object' && 'toDate' in value) {
    const fn = (value as { toDate: unknown }).toDate;
    if (typeof fn === 'function') return (fn as () => Date).call(value);
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

/** Concatena rua, número e complemento em uma única string de endereço */
export function buildFullAddress(street: string, number: string, complement: string): string {
  if (!street) return '';
  let address = street;
  if (number) address += `, ${number}`;
  if (complement) address += ` - ${complement}`;
  return address;
}

/**
 * Calcula e formata a idade do pet a partir da data de nascimento.
 * Retorna texto como "2 anos", "3 meses" ou "5 dias" — ou '' se não houver data.
 */
export function calculateAgeFromDate(date: Date | null): string {
  if (!date) return '';

  const today = new Date();
  const birth = new Date(date);

  let years = today.getFullYear() - birth.getFullYear();
  let months = today.getMonth() - birth.getMonth();
  let days = today.getDate() - birth.getDate();

  if (days < 0) {
    months--;
    const lastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
    days += lastMonth.getDate();
  }

  if (months < 0) {
    years--;
    months += 12;
  }

  if (years > 0) {
    return years === 1 ? '1 ano' : `${years} anos`;
  } else if (months > 0) {
    return months === 1 ? '1 mês' : `${months} meses`;
  } else {
    return days === 1 ? '1 dia' : `${days} dias`;
  }
}
