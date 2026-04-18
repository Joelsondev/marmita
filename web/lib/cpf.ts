export function validateCpf(cpf: string): boolean {
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false; // all same digit

  const calc = (len: number) => {
    const sum = digits
      .slice(0, len)
      .split('')
      .reduce((acc, d, i) => acc + parseInt(d) * (len + 1 - i), 0);
    const rem = (sum * 10) % 11;
    return rem >= 10 ? 0 : rem;
  };

  return calc(9) === parseInt(digits[9]) && calc(10) === parseInt(digits[10]);
}

export function formatCpf(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}
