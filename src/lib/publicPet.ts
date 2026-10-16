import { deleteDoc, doc, setDoc } from 'firebase/firestore';
import { firestore } from './firebase';

export type PublicPetSource = {
  id: string;
  pet_id: string;
  name: string;
  species: string;
  breed: string | null;
  photo_url: string | null;
  owner_name: string;
  owner_phone: string;
};

/**
 * Mantém a ficha usada pela busca separada do prontuário privado do pet.
 * Nunca inclua endereço, e-mail, notas, vacinas ou outros dados de saúde
 * neste documento.
 */
export async function syncPublicPet(pet: PublicPetSource): Promise<void> {
  await setDoc(doc(firestore, 'publicPets', pet.pet_id), {
    source_pet_id: pet.id,
    pet_id: pet.pet_id,
    name: pet.name,
    species: pet.species,
    breed: pet.breed,
    photo_url: pet.photo_url,
    owner_name: pet.owner_name,
    owner_phone: pet.owner_phone,
    updated_at: new Date().toISOString(),
  });
}

export async function removePublicPet(petId: string): Promise<void> {
  await deleteDoc(doc(firestore, 'publicPets', petId));
}
