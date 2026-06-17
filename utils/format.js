export function toRupiah(value) {
  if (value == null || Number.isNaN(Number(value))) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(value));
}

export function toTanggal(value) {
  if (!value) return '-';
  const date = new Date(value);
  return date.toLocaleDateString('id-ID');
}

export function toNumber(value) {
  if (value == null) return '0';
  return new Intl.NumberFormat('id-ID').format(Number(value));
}
