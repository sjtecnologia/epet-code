import {
  isValidCustomSpecies,
  getSpeciesLabel,
  getSpeciesIcon,
  VALID_ANIMALS,
} from '../src/lib/species';

describe('isValidCustomSpecies', () => {
  it('aceita animais da lista oficial', () => {
    expect(isValidCustomSpecies('coelho')).toBe(true);
    expect(isValidCustomSpecies('Hamster')).toBe(true);
    expect(isValidCustomSpecies('tartaruga')).toBe(true);
    expect(isValidCustomSpecies('dragão barbudo')).toBe(true);
  });

  it('aceita variações que contêm o nome do animal', () => {
    expect(isValidCustomSpecies('mini porco')).toBe(true);
    expect(isValidCustomSpecies('porquinho da índia')).toBe(true);
    expect(isValidCustomSpecies('camundongo preto')).toBe(true); // contém "camundongo"
  });

  it('rejeita valores vazios ou muito curtos', () => {
    expect(isValidCustomSpecies('')).toBe(false);
    expect(isValidCustomSpecies('   ')).toBe(false);
    expect(isValidCustomSpecies('c')).toBe(false);
  });

  it('rejeita animais fora da lista', () => {
    expect(isValidCustomSpecies('dinossauro')).toBe(false);
    expect(isValidCustomSpecies('dragão de komodo')).toBe(false);
  });

  it('rejeita números e caracteres especiais', () => {
    expect(isValidCustomSpecies('coelho123')).toBe(false);
    expect(isValidCustomSpecies('co@elho')).toBe(false);
    expect(isValidCustomSpecies('coelho$')).toBe(false);
  });

  it('respeita o limite de tamanho', () => {
    expect(isValidCustomSpecies('a'.repeat(31))).toBe(false);
    expect(isValidCustomSpecies('beta')).toBe(true);
  });

  it('a lista oficial não está vazia', () => {
    expect(VALID_ANIMALS.length).toBeGreaterThan(50);
  });
});

describe('getSpeciesLabel', () => {
  it('mapeia espécies conhecidas para português', () => {
    expect(getSpeciesLabel('dog')).toBe('Cachorro');
    expect(getSpeciesLabel('cat')).toBe('Gato');
    expect(getSpeciesLabel('bird')).toBe('Pássaro');
  });

  it('usa "Outro" como padrão', () => {
    expect(getSpeciesLabel('other')).toBe('Outro');
    expect(getSpeciesLabel('')).toBe('Outro');
    expect(getSpeciesLabel(undefined)).toBe('Outro');
  });
});

describe('getSpeciesIcon', () => {
  it('usa leaf para pássaro e paw para os demais', () => {
    expect(getSpeciesIcon('bird')).toBe('leaf');
    expect(getSpeciesIcon('dog')).toBe('paw');
    expect(getSpeciesIcon('other')).toBe('paw');
    expect(getSpeciesIcon(undefined)).toBe('paw');
  });
});
