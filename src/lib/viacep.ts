/**
 * viacep.ts — helper compartilhado para consulta à API pública ViaCEP.
 *
 * Usado pelas telas de cadastro e gestão de endereços para preencher
 * automaticamente o campo de rua a partir do CEP informado.
 */

export type ViaCepError = 'invalid_cep' | 'not_found' | 'network_error';

export type ViaCepResult = { ok: true; logradouro: string } | { ok: false; error: ViaCepError };

/** Remove caracteres não numéricos do CEP */
export const onlyDigits = (cep: string): string => cep.replace(/\D/g, '');

/** Valida se o CEP possui exatamente 8 dígitos */
export const isValidCep = (cep: string): boolean => onlyDigits(cep).length === 8;

/**
 * Consulta o ViaCEP e retorna o logradouro do endereço.
 * Nunca lança exceção — retorna resultado discriminado para a tela
 * exibir o alerta correspondente.
 */
export async function fetchAddressByCep(cep: string): Promise<ViaCepResult> {
  if (!isValidCep(cep)) {
    return { ok: false, error: 'invalid_cep' };
  }

  try {
    const response = await fetch(`https://viacep.com.br/ws/${onlyDigits(cep)}/json/`);
    const data = await response.json();

    if (data.erro) {
      return { ok: false, error: 'not_found' };
    }
    return { ok: true, logradouro: data.logradouro || '' };
  } catch {
    return { ok: false, error: 'network_error' };
  }
}

/** Mensagens de erro padrão para cada tipo de falha */
export const viaCepMessages: Record<ViaCepError, { title: string; message: string }> = {
  invalid_cep: { title: 'Erro', message: 'CEP inválido. Digite 8 dígitos.' },
  not_found: { title: 'Erro', message: 'CEP não encontrado' },
  network_error: { title: 'Erro', message: 'Não foi possível buscar o CEP' },
};
