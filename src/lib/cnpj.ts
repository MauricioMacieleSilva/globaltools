/**
 * Utilities for Brazilian CNPJ validation and formatting.
 */

export const onlyDigits = (value: string) => (value || '').replace(/\D/g, '');

export const formatCnpj = (value: string) => {
  const digits = onlyDigits(value).slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
};

/**
 * Validates a CNPJ: must have exactly 14 digits and pass the check-digit algorithm.
 */
export const isValidCnpj = (value: string | null | undefined): boolean => {
  const cnpj = onlyDigits(value || '');
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cnpj)) return false;

  const calc = (base: string) => {
    const weights = base.length === 12
      ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
      : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const sum = base.split('').reduce((acc, d, i) => acc + parseInt(d, 10) * weights[i], 0);
    const mod = sum % 11;
    return mod < 2 ? 0 : 11 - mod;
  };

  const d1 = calc(cnpj.slice(0, 12));
  const d2 = calc(cnpj.slice(0, 12) + d1);
  return d1 === parseInt(cnpj[12], 10) && d2 === parseInt(cnpj[13], 10);
};