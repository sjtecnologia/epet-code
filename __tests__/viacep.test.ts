import { onlyDigits, isValidCep, fetchAddressByCep, viaCepMessages } from '../src/lib/viacep';

describe('viacep helper', () => {
  describe('onlyDigits', () => {
    it('remove máscara e caracteres não numéricos', () => {
      expect(onlyDigits('01310-100')).toBe('01310100');
      expect(onlyDigits('01.310.100')).toBe('01310100');
      expect(onlyDigits('abc 123')).toBe('123');
    });
  });

  describe('isValidCep', () => {
    it('aceita CEP com 8 dígitos (com ou sem máscara)', () => {
      expect(isValidCep('01310100')).toBe(true);
      expect(isValidCep('01310-100')).toBe(true);
    });

    it('rejeita CEPs incompletos ou vazios', () => {
      expect(isValidCep('0131010')).toBe(false);
      expect(isValidCep('')).toBe(false);
      expect(isValidCep('abcdefgh')).toBe(false);
    });
  });

  describe('fetchAddressByCep', () => {
    const originalFetch = globalThis.fetch;

    afterEach(() => {
      globalThis.fetch = originalFetch;
      jest.restoreAllMocks();
    });

    it('retorna erro invalid_cep sem chamar a API para CEP inválido', async () => {
      const fetchSpy = jest.fn();
      globalThis.fetch = fetchSpy as unknown as typeof fetch;

      const result = await fetchAddressByCep('123');
      expect(result).toEqual({ ok: false, error: 'invalid_cep' });
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('retorna o logradouro quando a API responde com sucesso', async () => {
      globalThis.fetch = jest.fn().mockResolvedValue({
        json: async () => ({ logradouro: 'Avenida Paulista' }),
      }) as unknown as typeof fetch;

      const result = await fetchAddressByCep('01310-100');
      expect(result).toEqual({ ok: true, logradouro: 'Avenida Paulista' });
      expect(globalThis.fetch).toHaveBeenCalledWith('https://viacep.com.br/ws/01310100/json/');
    });

    it('retorna not_found quando a API marca erro', async () => {
      globalThis.fetch = jest.fn().mockResolvedValue({
        json: async () => ({ erro: true }),
      }) as unknown as typeof fetch;

      const result = await fetchAddressByCep('00000000');
      expect(result).toEqual({ ok: false, error: 'not_found' });
    });

    it('retorna network_error quando a requisição falha', async () => {
      globalThis.fetch = jest
        .fn()
        .mockRejectedValue(new Error('offline')) as unknown as typeof fetch;

      const result = await fetchAddressByCep('01310100');
      expect(result).toEqual({ ok: false, error: 'network_error' });
    });
  });

  describe('viaCepMessages', () => {
    it('possui mensagem para cada tipo de erro', () => {
      expect(viaCepMessages.invalid_cep.message).toContain('8 dígitos');
      expect(viaCepMessages.not_found.message).toBe('CEP não encontrado');
      expect(viaCepMessages.network_error.message).toBe('Não foi possível buscar o CEP');
    });
  });
});
