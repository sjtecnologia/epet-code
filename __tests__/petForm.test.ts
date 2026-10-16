/**
 * Testes dos utilitários compartilhados de formulário de pet (src/lib/petForm.ts).
 * São funções puras usadas por NewPetScreen, EditPetScreen, VaccinesScreen e
 * FourYouPetPetScreen — os testes cobrem os casos de borda das máscaras/validações.
 */
import {
  generatePetId,
  maskDateInput,
  isValidDateBR,
  parseDateBR,
  formatDateBR,
  formatDateForDB,
  buildFullAddress,
  calculateAgeFromDate,
  speciesOptions,
  COMMON_VACCINES,
} from '../src/lib/petForm';

describe('generatePetId', () => {
  it('gera IDs no formato PET-XXXX-XXXX', () => {
    expect(generatePetId()).toMatch(/^PET-[0-9A-F]{4}-[0-9A-F]{4}$/);
  });

  it('não repete o mesmo ID em chamadas seguidas', () => {
    const ids = new Set(Array.from({ length: 50 }, () => generatePetId()));
    expect(ids.size).toBe(50);
  });
});

describe('maskDateInput', () => {
  it('aplica a máscara DD/MM/AAAA conforme a digitação', () => {
    expect(maskDateInput('1')).toBe('1');
    expect(maskDateInput('12')).toBe('12');
    expect(maskDateInput('120')).toBe('12/0');
    expect(maskDateInput('1203')).toBe('12/03');
    expect(maskDateInput('120320')).toBe('12/03/20');
    expect(maskDateInput('12032024')).toBe('12/03/2024');
  });

  it('ignora caracteres não numéricos', () => {
    expect(maskDateInput('12/03/2024')).toBe('12/03/2024');
  });

  it('limita o dia a 31 e o mês a 12 durante a digitação', () => {
    expect(maskDateInput('9999')).toBe('31/12');
    expect(maskDateInput('32')).toBe('31');
    expect(maskDateInput('123')).toBe('12/1');
  });

  it('descarta dígitos além de 8', () => {
    expect(maskDateInput('12032024999')).toBe('12/03/2024');
  });
});

describe('isValidDateBR', () => {
  it('aceita datas reais', () => {
    expect(isValidDateBR('29/02/2024')).toBe(true);
    expect(isValidDateBR('31/12/1999')).toBe(true);
  });

  it('rejeita datas inexistentes', () => {
    expect(isValidDateBR('29/02/2023')).toBe(false);
    expect(isValidDateBR('31/04/2024')).toBe(false);
  });

  it('rejeita entradas incompletas ou não numéricas', () => {
    expect(isValidDateBR('')).toBe(false);
    expect(isValidDateBR('01/01')).toBe(false);
    expect(isValidDateBR('abcdefgh')).toBe(false);
  });
});

describe('parseDateBR', () => {
  it('converte DD/MM/AAAA para AAAA-MM-DD', () => {
    expect(parseDateBR('29/02/2024')).toBe('2024-02-29');
  });

  it('retorna string vazia quando a entrada é inválida', () => {
    expect(parseDateBR('29/02')).toBe('');
    expect(parseDateBR('')).toBe('');
  });
});

describe('formatDateBR', () => {
  it('converte ISO para DD/MM/AAAA', () => {
    expect(formatDateBR('2024-02-29')).toBe('29/02/2024');
  });

  it('retorna texto padrão para valor vazio', () => {
    expect(formatDateBR(null)).toBe('Não informado');
    expect(formatDateBR('')).toBe('Não informado');
  });
});

describe('formatDateForDB', () => {
  it('formata Date como AAAA-MM-DD', () => {
    expect(formatDateForDB(new Date(2024, 1, 9))).toBe('2024-02-09');
  });

  it('retorna null para data ausente', () => {
    expect(formatDateForDB(null)).toBeNull();
  });
});

describe('buildFullAddress', () => {
  it('monta o endereço com número e complemento', () => {
    expect(buildFullAddress('Rua A', '10', 'Apto 2')).toBe('Rua A, 10 - Apto 2');
  });

  it('omite número e complemento quando vazios', () => {
    expect(buildFullAddress('Rua A', '', '')).toBe('Rua A');
  });

  it('retorna vazio quando não há rua', () => {
    expect(buildFullAddress('', '10', 'Apto 2')).toBe('');
  });
});

describe('calculateAgeFromDate', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2024, 5, 15)); // 15/06/2024
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('retorna vazio quando não há data', () => {
    expect(calculateAgeFromDate(null)).toBe('');
  });

  it('conta anos completos', () => {
    expect(calculateAgeFromDate(new Date(2020, 5, 15))).toBe('4 anos');
    expect(calculateAgeFromDate(new Date(2023, 5, 15))).toBe('1 ano');
  });

  it('conta meses quando menos de um ano', () => {
    expect(calculateAgeFromDate(new Date(2024, 2, 15))).toBe('3 meses');
    expect(calculateAgeFromDate(new Date(2024, 4, 15))).toBe('1 mês');
  });

  it('conta dias quando menos de um mês', () => {
    expect(calculateAgeFromDate(new Date(2024, 5, 10))).toBe('5 dias');
    expect(calculateAgeFromDate(new Date(2024, 5, 14))).toBe('1 dia');
  });
});

describe('constantes compartilhadas', () => {
  it('speciesOptions cobre as quatro espécies esperadas', () => {
    expect(speciesOptions.map(o => o.id)).toEqual(['dog', 'cat', 'bird', 'other']);
  });

  it('COMMON_VACCINES não contém entradas duplicadas', () => {
    expect(new Set(COMMON_VACCINES).size).toBe(COMMON_VACCINES.length);
  });
});
