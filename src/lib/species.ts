/**
 * species — utilitários puros para espécies de pet.
 *
 * Centraliza a lista de animais aceitos na espécie "Outro"
 * e os rótulos/ícones de espécie que estavam duplicados em
 * SearchScreen, PetCardScreen e FourYouPetPetScreen.
 *
 * Mantido sem dependências de React para ser facilmente testável.
 */

/** Lista COMPLETA de animais aceitos na espécie "Outro" (validação rigorosa) */
export const VALID_ANIMALS = [
  // Roedores e pequenos mamíferos
  'coelho',
  'hamster',
  'porquinho da índia',
  'chinchila',
  'ferret',
  'furão',
  'rato',
  'camundongo',
  'gerbil',
  'esquilo',
  'twister',
  // Répteis
  'tartaruga',
  'jabuti',
  'iguana',
  'camaleão',
  'cobra',
  'lagarto',
  'gecko',
  'dragão barbudo',
  // Peixes
  'peixe',
  'beta',
  'goldfish',
  'kinguio',
  'guppy',
  'neon',
  'oscar',
  'koi',
  // Aves
  'periquito',
  'papagaio',
  'calopsita',
  'canário',
  'agapornis',
  'cacatua',
  'arara',
  'galinha',
  'pato',
  'ganso',
  'codorna',
  'faisão',
  // Animais de fazenda
  'cavalo',
  'égua',
  'pônei',
  'burro',
  'jumento',
  'cabra',
  'ovelha',
  'porco',
  'mini pig',
  'lhama',
  'alpaca',
  'vaca',
  'boi',
  'búfalo',
  // Outros
  'porquinho',
  'ouriço',
  'sugar glider',
  'miniporco',
];

/** Padrões de formato rejeitados: números longos, caracteres especiais, letra única e qualquer número */
const INVALID_PATTERNS = [/\d{3,}/, /[!@#$%^&*()+=\[\]{};':"\\|,.<>?]/g, /^[a-z]$/i, /[0-9]/g];

/**
 * isValidCustomSpecies — verifica se a espécie digitada está na lista de animais aceitos.
 * Rejeita números, caracteres especiais e strings muito curtas/longas.
 * Retorna true somente se a espécie for reconhecida e válida.
 */
export function isValidCustomSpecies(species: string): boolean {
  if (!species || species.trim().length < 2) return false;

  const normalized = species.toLowerCase().trim();

  // Verificação estrita: deve estar na lista OU ser uma variação clara
  const isInList = VALID_ANIMALS.some((animal) => {
    // Aceita palavra exata ou palavra contida (para variações como "mini porco")
    return normalized === animal || normalized.includes(animal) || animal.includes(normalized);
  });

  if (!isInList) return false;
  if (INVALID_PATTERNS.some((pattern) => pattern.test(normalized))) return false;
  if (normalized.length < 3 || normalized.length > 30) return false;

  return true;
}

/** Retorna o rótulo legível da espécie em português */
export function getSpeciesLabel(species?: string): string {
  switch (species) {
    case 'dog':
      return 'Cachorro';
    case 'cat':
      return 'Gato';
    case 'bird':
      return 'Pássaro';
    default:
      return 'Outro';
  }
}

/** Retorna o nome do ícone Ionicons para a espécie do pet */
export function getSpeciesIcon(species?: string): 'paw' | 'leaf' {
  switch (species) {
    case 'bird':
      return 'leaf';
    default:
      return 'paw';
  }
}
