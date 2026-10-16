/** Tipos dos documentos persistidos no Firebase pelo e-Pet. */

export type Pet = {
  id: string;
  user_id: string;
  pet_id: string;
  name: string;
  species: 'dog' | 'cat' | 'bird' | 'other';
  custom_species: string | null;
  breed: string | null;
  birth_date: string | null;
  photo_url: string | null;
  qr_code: string;
  owner_name: string;
  owner_phone: string;
  owner_email: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type Profile = {
  id: string;
  name: string | null;
  phone?: string | null;
  celular?: string | null;
  avatar_url: string | null;
  email: string | null;
  created_at?: string;
  updated_at?: string;
};

/** Documento do usuário em Firestore `users/{uid}` */
export type UserDoc = {
  name?: string | null;
  email?: string | null;
  celular?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  street?: string | null;
  number?: string | null;
  complement?: string | null;
};

export type FourYouPetAplic = {
  aplicated: boolean;
  dataaplicacao: unknown;
  lote: string | null;
  marca: string | null;
  scheduleid: number;
};

export type FourYouPetVacina = {
  aplic: FourYouPetAplic[];
};

export type FourYouPet = {
  id: string;
  pet_id?: string;
  epet_id?: string;
  name: string;
  breed: string | null;
  birth: unknown;
  size: string | null;
  color: string | null;
  castrado: boolean;
  images: string[];
  vacinas: FourYouPetVacina[];
  user_id: string;
};

export type Address = {
  id: string;
  user_id: string;
  label: string;
  cep: string;
  street: string;
  number: string;
  complement: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
};

export type Vaccine = {
  id: string;
  pet_id: string;
  name: string;
  date_applied: string;
  next_due_date: string | null;
  veterinarian: string | null;
  batch: string | null;
  notes: string | null;
  created_at: string;
  updated_at?: string;
};
