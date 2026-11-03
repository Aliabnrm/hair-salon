export function formatPrice(irr: number): string {
  if (!Number.isSafeInteger(irr) || irr < 0 || irr % 10 !== 0)
    throw new Error('Invalid IRR amount');
  return new Intl.NumberFormat('fa-IR').format(irr / 10) + ' تومان';
}
