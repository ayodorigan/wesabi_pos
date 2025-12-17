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

interface PricingInputs {
  invoicePrice?: number;
  supplierDiscountPercent?: number;
  vatRate?: number;
  otherCharges?: number;
  costPrice?: number;
}

export const calculateNetCost = (inputs: PricingInputs): number => {
  const invoicePrice = inputs.invoicePrice ?? inputs.costPrice ?? 0;
  const supplierDiscountPercent = inputs.supplierDiscountPercent ?? 0;
  const vatRate = inputs.vatRate ?? 0;
  const otherCharges = inputs.otherCharges ?? 0;

  const discountedAmount = invoicePrice - (invoicePrice * supplierDiscountPercent / 100);
  const vatAmount = discountedAmount * (vatRate / 100);
  const netCost = discountedAmount + vatAmount + otherCharges;

  return Math.round(netCost * 100) / 100;
};

export const calculateSellingPrice = (inputs: PricingInputs | number): number => {
  const netCost = typeof inputs === 'number'
    ? inputs
    : calculateNetCost(inputs);

  return Math.round(netCost * 1.33 * 100) / 100;
};

export const getMinimumSellingPrice = (inputs: PricingInputs | number): number => {
  return calculateSellingPrice(inputs);
};

export const validateSellingPrice = (
  sellingPrice: number,
  inputs: PricingInputs | number
): boolean => {
  const minPrice = getMinimumSellingPrice(inputs);
  return sellingPrice >= minPrice;
};

export const enforceMinimumSellingPrice = (
  sellingPrice: number,
  inputs: PricingInputs | number
): number => {
  const minPrice = getMinimumSellingPrice(inputs);
  return Math.max(sellingPrice, minPrice);
};