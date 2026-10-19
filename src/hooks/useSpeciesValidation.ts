/**
 * useSpeciesValidation — valida a espécie digitada em campos "Outro" com debounce.
 *
 * Compartilhado por NewPetScreen e EditPetScreen (a lógica estava duplicada):
 * agenda a validação 800ms após o usuário parar de digitar e expõe
 * o estado "validando" e o resultado ('valid' | 'invalid' | null).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { isValidCustomSpecies } from '../lib/species';

export type SpeciesValidationResult = 'valid' | 'invalid' | null;

export function useSpeciesValidation() {
  const [validating, setValidating] = useState(false);
  const [result, setResult] = useState<SpeciesValidationResult>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Cancela o debounce pendente, se houver */
  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  /**
   * validate — agenda a validação da espécie com debounce de 800ms.
   * Limpa o resultado anterior imediatamente; valores com menos de
   * 2 caracteres apenas resetam o estado (sem agendar).
   */
  const validate = useCallback(
    (species: string) => {
      cancel();
      setResult(null);

      if (!species || species.trim().length < 2) {
        setValidating(false);
        return;
      }

      setValidating(true);
      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null;
        setResult(isValidCustomSpecies(species) ? 'valid' : 'invalid');
        setValidating(false);
      }, 800);
    },
    [cancel],
  );

  /** Reseta validação e resultado (ex.: quando o campo de espécie muda para uma opção padrão) */
  const reset = useCallback(() => {
    cancel();
    setValidating(false);
    setResult(null);
  }, [cancel]);

  // Cancela timers pendentes ao desmontar
  useEffect(() => cancel, [cancel]);

  return { validating, result, validate, reset };
}
