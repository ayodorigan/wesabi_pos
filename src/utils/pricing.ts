export const MARKUP_MULTIPLIER = 1.33;
export const DEFAULT_VAT_RATE = 16;

export type PriceType = 'MINIMUM' | 'TARGET';

export interface PricingInput {
  originalCost: number;
  discountPercent?: number;
  hasVAT?: boolean;
  vatRate?: number;
}

export interface PricingResult {
  discountedCost: number | null;
  actualCost: number;
  minimumSellingPrice: number | null;
  targetSellingPrice: number;
  minimumPriceExVAT: number | null;
  targetPriceExVAT: number;
  minimumPriceWithVAT: number | null;
  targetPriceWithVAT: number;
  minimumPriceRounded: number | null;
  targetPriceRounded: number;
  hasDiscount: boolean;
}

export interface SalePricingInput {
  actualCost: number;
  sellingPriceExVAT: number;
  hasVAT?: boolean;
  vatRate?: number;
  priceType: PriceType;
}

export interface SalePricingResult {
  sellingPriceExVAT: number;
  vatAmount: number;
  finalPriceRaw: number;
  finalPriceRounded: number;
  roundingExtra: number;
  profit: number;
  priceType: PriceType;
  actualCost: number;
}

export function roundUpToNearest5Or10(value: number): number {
  const intValue = Math.ceil(value);
  const lastDigit = intValue % 10;

  if (lastDigit === 0 || lastDigit === 5) {
    return intValue;
  }

  if (lastDigit < 5) {
    return intValue + (5 - lastDigit);
  }

  return intValue + (10 - lastDigit);
}

export function calculateProductPricing(input: PricingInput): PricingResult {
  const {
    originalCost,
    discountPercent = 0,
    hasVAT = true,
    vatRate = DEFAULT_VAT_RATE
  } = input;

  const hasDiscount = discountPercent > 0;

  const discountedCost = hasDiscount
    ? originalCost * (1 - discountPercent / 100)
    : null;

  const actualCost = discountedCost ?? originalCost;

  const minimumPriceExVAT = hasDiscount
    ? discountedCost! * MARKUP_MULTIPLIER
    : null;

  const targetPriceExVAT = originalCost * MARKUP_MULTIPLIER;

  const vatMultiplier = hasVAT ? (1 + vatRate / 100) : 1;

  const minimumPriceWithVAT = minimumPriceExVAT
    ? minimumPriceExVAT * vatMultiplier
    : null;

  const targetPriceWithVAT = targetPriceExVAT * vatMultiplier;

  const minimumPriceRounded = minimumPriceWithVAT
    ? roundUpToNearest5Or10(minimumPriceWithVAT)
    : null;

  const targetPriceRounded = roundUpToNearest5Or10(targetPriceWithVAT);

  const minimumSellingPrice = minimumPriceRounded;
  const targetSellingPrice = targetPriceRounded;

  return {
    discountedCost,
    actualCost,
    minimumSellingPrice,
    targetSellingPrice,
    minimumPriceExVAT,
    targetPriceExVAT,
    minimumPriceWithVAT,
    targetPriceWithVAT,
    minimumPriceRounded,
    targetPriceRounded,
    hasDiscount
  };
}

export function calculateSalePricing(input: SalePricingInput): SalePricingResult {
  const {
    actualCost,
    sellingPriceExVAT,
    hasVAT = true,
    vatRate = DEFAULT_VAT_RATE,
    priceType
  } = input;

  const vatAmount = hasVAT
    ? sellingPriceExVAT * (vatRate / 100)
    : 0;

  const finalPriceRaw = sellingPriceExVAT + vatAmount;

  const finalPriceRounded = roundUpToNearest5Or10(finalPriceRaw);

  const roundingExtra = finalPriceRounded - finalPriceRaw;

  const profit = (sellingPriceExVAT - actualCost) + roundingExtra;

  return {
    sellingPriceExVAT,
    vatAmount,
    finalPriceRaw,
    finalPriceRounded,
    roundingExtra,
    profit,
    priceType,
    actualCost
  };
}

export function validateMinimumPrice(
  sellingPrice: number,
  minimumPrice: number | null
): boolean {
  if (minimumPrice === null) {
    return true;
  }

  return sellingPrice >= minimumPrice;
}

export function formatCurrency(amount: number): string {
  return `KES ${amount.toFixed(2)}`;
}

export function calculateProfitBreakdown(salesData: {
  profit: number;
  actualCost: number;
  sellingPriceExVAT: number;
  roundingExtra: number;
  discountedCost?: number | null;
  originalCost?: number;
}[]): {
  totalProfit: number;
  discountDrivenProfit: number;
  roundingDrivenProfit: number;
  baseProfit: number;
  averageMargin: number;
} {
  let totalProfit = 0;
  let discountDrivenProfit = 0;
  let roundingDrivenProfit = 0;
  let totalRevenue = 0;
  let totalCost = 0;

  for (const sale of salesData) {
    totalProfit += sale.profit;
    roundingDrivenProfit += sale.roundingExtra;
    totalRevenue += sale.sellingPriceExVAT;
    totalCost += sale.actualCost;

    if (sale.discountedCost && sale.originalCost) {
      const discountSavings = sale.originalCost - sale.discountedCost;
      const discountProfit = discountSavings * MARKUP_MULTIPLIER;
      discountDrivenProfit += discountProfit;
    }
  }

  const baseProfit = totalProfit - discountDrivenProfit - roundingDrivenProfit;
  const averageMargin = totalRevenue > 0
    ? (totalProfit / totalRevenue) * 100
    : 0;

  return {
    totalProfit,
    discountDrivenProfit,
    roundingDrivenProfit,
    baseProfit,
    averageMargin
  };
}

export function getPriceTypeLabel(priceType: PriceType): string {
  return priceType === 'MINIMUM' ? 'Minimum Price' : 'Target Price';
}

export function shouldWarnLowMargin(
  sellingPrice: number,
  minimumPrice: number | null,
  targetPrice: number
): boolean {
  if (!minimumPrice) {
    return false;
  }

  const priceRange = targetPrice - minimumPrice;
  const threshold = minimumPrice + (priceRange * 0.2);

  return sellingPrice <= threshold;
}
