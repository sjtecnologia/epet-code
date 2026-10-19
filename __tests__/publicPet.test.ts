/**
 * Testes de regressão de privacidade da ficha pública do pet.
 *
 * A ficha em `publicPets` é a única exposta pela busca pública (QR/perdidos).
 * Qualquer dado privado (endereço, e-mail, saúde, notas) que vaze para cá
 * é uma falha de privacidade — estes testes garantem que o conjunto de
 * campos enviado ao Firestore permanece restrito ao allowlist.
 */
import { setDoc, deleteDoc, doc } from 'firebase/firestore';
import { syncPublicPet, removePublicPet, PublicPetSource } from '../src/lib/publicPet';

jest.mock('../src/lib/firebase', () => ({ firestore: {} }));

jest.mock('firebase/firestore', () => ({
  setDoc: jest.fn(async () => undefined),
  deleteDoc: jest.fn(async () => undefined),
  doc: jest.fn((_db: unknown, collection: string, id: string) => ({
    path: `${collection}/${id}`,
  })),
}));

const setDocMock = setDoc as jest.Mock;
const deleteDocMock = deleteDoc as jest.Mock;

const pet: PublicPetSource = {
  id: 'doc-1',
  pet_id: 'PET-ABCD-1234',
  name: 'Rex',
  species: 'canino',
  breed: 'SRD',
  photo_url: 'https://example.com/rex.jpg',
  owner_name: 'Maria',
  owner_phone: '11999998888',
};

/** Campos que, por decisão de produto/privacidade, podem aparecer na ficha pública. */
const ALLOWED_FIELDS = [
  'source_pet_id',
  'pet_id',
  'name',
  'species',
  'breed',
  'photo_url',
  'owner_name',
  'owner_phone',
  'updated_at',
];

beforeEach(() => {
  jest.clearAllMocks();
});

describe('syncPublicPet', () => {
  it('envia somente os campos do allowlist para o Firestore', async () => {
    await syncPublicPet(pet);

    expect(setDocMock).toHaveBeenCalledTimes(1);
    const [, payload] = setDocMock.mock.calls[0] as [unknown, Record<string, unknown>];

    expect(Object.keys(payload).sort()).toEqual([...ALLOWED_FIELDS].sort());
  });

  it('nunca inclui dados privados mesmo que existam no objeto de origem', async () => {
    await syncPublicPet({
      ...pet,
      // campos privados que jamais podem ser expostos publicamente
      address: 'Rua das Flores, 100',
      email: 'maria@example.com',
      notes: 'pet medicado',
      vaccines: [{ name: 'Raiva' }],
      birth_date: '2020-01-01',
    } as PublicPetSource);

    const [, payload] = setDocMock.mock.calls[0] as [unknown, Record<string, unknown>];

    for (const forbidden of ['address', 'email', 'notes', 'vaccines', 'birth_date']) {
      expect(payload).not.toHaveProperty(forbidden);
    }
  });

  it('grava no documento indexado pelo pet_id público', async () => {
    await syncPublicPet(pet);

    const [db, collection, id] = (jest.mocked(doc).mock.calls[0] ?? []) as unknown[];
    expect(collection).toBe('publicPets');
    expect(id).toBe('PET-ABCD-1234');
    expect(db).toBeDefined();
  });

  it('registra updated_at como ISO 8601 válido', async () => {
    await syncPublicPet(pet);

    const [, payload] = setDocMock.mock.calls[0] as [unknown, Record<string, unknown>];
    expect(new Date(payload.updated_at as string).toISOString()).toBe(payload.updated_at);
  });
});

describe('removePublicPet', () => {
  it('deleta o documento pelo pet_id informado', async () => {
    await removePublicPet('PET-ABCD-1234');

    expect(deleteDocMock).toHaveBeenCalledTimes(1);
    const ref = deleteDocMock.mock.calls[0][0];
    expect(ref.path).toBe('publicPets/PET-ABCD-1234');
  });
});
