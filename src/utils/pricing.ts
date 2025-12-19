export const MARKUP_MULTIPLIER = 1.33;
export const DEFAULT_VAT_RATE = 0;

export type PriceType = 'DISCOUNTED' | 'SELLING';

export interface PricingInput {
  originalCost: number;
  discountPercent?: number;
  hasVAT?: boolean;
  vatRate?: number;
}

export interface PricingResult {
  discountedCost: number | null;
  actualCost: number;
  discountedPrice: number | null;
  sellingPrice: number;
  discountedPriceExVAT: number | null;
  sellingPriceExVAT: number;
  discountedPriceWithVAT: number | null;
  sellingPriceWithVAT: number;
  discountedPriceRounded: number | null;
  sellingPriceRounded: number;
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
  return Math.ceil(value / 5) * 5;
}

export function calculateProductPricing(input: PricingInput): PricingResult {
  const {
    originalCost,
    discountPercent = 0,
    hasVAT = false,
    vatRate = DEFAULT_VAT_RATE
  } = input;

  const hasDiscount = discountPercent > 0;

  const discountedCost = hasDiscount
    ? originalCost * (1 - discountPercent / 100)
    : null;

  const actualCost = discountedCost ?? originalCost;

  const discountedPriceExVAT = hasDiscount
    ? discountedCost! * MARKUP_MULTIPLIER
    : null;

  const sellingPriceExVAT = originalCost * MARKUP_MULTIPLIER;

  const vatMultiplier = hasVAT ? (1 + vatRate / 100) : 1;

  const discountedPriceWithVAT = discountedPriceExVAT
    ? discountedPriceExVAT * vatMultiplier
    : null;

  const sellingPriceWithVAT = sellingPriceExVAT * vatMultiplier;

  const discountedPriceRounded = discountedPriceWithVAT
    ? roundUpToNearest5Or10(discountedPriceWithVAT)
    : null;

  const sellingPriceRounded = roundUpToNearest5Or10(sellingPriceWithVAT);

  const discountedPrice = discountedPriceRounded;
  const sellingPrice = sellingPriceRounded;

  return {
    discountedCost,
    actualCost,
    discountedPrice,
    sellingPrice,
    discountedPriceExVAT,
    sellingPriceExVAT,
    discountedPriceWithVAT,
    sellingPriceWithVAT,
    discountedPriceRounded,
    sellingPriceRounded,
    hasDiscount
  };
}

export function calculateSalePricing(input: SalePricingInput): SalePricingResult {
  const {
    actualCost,
    sellingPriceExVAT,
    hasVAT = false,
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

export function validateDiscountedPrice(
  sellingPrice: number,
  discountedPrice: number | null
): boolean {
  if (discountedPrice === null) {
    return true;
  }

  return sellingPrice >= discountedPrice;
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
  return priceType === 'DISCOUNTED' ? 'Discounted Price' : 'Selling Price';
}

export function shouldWarnLowMargin(
  currentPrice: number,
  discountedPrice: number | null,
  sellingPrice: number
): boolean {
  if (!discountedPrice) {
    return false;
  }

  const priceRange = sellingPrice - discountedPrice;
  const threshold = discountedPrice + (priceRange * 0.2);

  return currentPrice <= threshold;
}
