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
  return Math.round(costPrice * 1.33 * 100) / 100; // 2 decimal places
};

export const getMinimumSellingPrice = (costPrice: number): number => {
  return calculateSellingPrice(costPrice);
};

export const validateSellingPrice = (sellingPrice: number, costPrice: number): boolean => {
  const minPrice = getMinimumSellingPrice(costPrice);
  return sellingPrice >= minPrice;
};

export const enforceMinimumSellingPrice = (sellingPrice: number, costPrice: number): number => {
  const minPrice = getMinimumSellingPrice(costPrice);
  return Math.max(sellingPrice, minPrice);
};