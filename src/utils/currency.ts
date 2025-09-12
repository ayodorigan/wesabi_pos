export const formatKES = (amount: number): string => {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KSH',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

export const parseKES = (value: string): number => {
  const cleaned = value.replace(/[^\d.-]/g, '');
  return parseFloat(cleaned) || 0;
};

export const calculateSellingPrice = (costPrice: number): number => {
  return Math.round(costPrice * 1.33 * 10) / 10; // 1 decimal place
};

export const getMinimumSellingPrice = (costPrice: number): number => {
  return calculateSellingPrice(costPrice);
};