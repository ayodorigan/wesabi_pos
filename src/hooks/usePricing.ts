import { useState, useCallback } from 'react';
import { Product, SaleItem } from '../types';
import {
  calculateProductPricing,
  calculateSalePricing,
  validateMinimumPrice,
  PriceType
} from '../utils/pricing';

export function usePricing() {
  const getProductPricing = useCallback((product: Product) => {
    return calculateProductPricing({
      originalCost: product.costPrice,
      discountPercent: product.supplierDiscountPercent || 0,
      hasVAT: product.hasVat ?? true,
      vatRate: product.vatRate || 16
    });
  }, []);

  const calculateSaleItemPricing = useCallback((
    product: Product,
    quantity: number,
    selectedPrice: number,
    priceType: PriceType
  ): SaleItem => {
    const pricing = getProductPricing(product);

    const actualCost = pricing.actualCost;

    let sellingPriceExVAT: number;
    if (priceType === 'MINIMUM') {
      sellingPriceExVAT = pricing.minimumPriceExVAT || pricing.targetPriceExVAT;
    } else {
      sellingPriceExVAT = pricing.targetPriceExVAT;
    }

    if (selectedPrice !== pricing.minimumPriceRounded &&
        selectedPrice !== pricing.targetPriceRounded) {
      const hasVAT = product.hasVat ?? true;
      if (hasVAT) {
        sellingPriceExVAT = selectedPrice / 1.16;
      } else {
        sellingPriceExVAT = selectedPrice;
      }
    }

    const salePricing = calculateSalePricing({
      actualCost,
      sellingPriceExVAT,
      hasVAT: product.hasVat ?? true,
      vatRate: product.vatRate || 16,
      priceType
    });

    return {
      productId: product.id,
      productName: product.name,
      quantity,
      unitPrice: salePricing.finalPriceRounded,
      totalPrice: salePricing.finalPriceRounded * quantity,
      originalPrice: pricing.targetPriceRounded,
      priceAdjusted: selectedPrice !== pricing.targetPriceRounded,
      batchNumber: product.batchNumber,
      costPrice: product.costPrice,
      sellingPriceExVat: salePricing.sellingPriceExVAT,
      vatAmount: salePricing.vatAmount,
      finalPriceRounded: salePricing.finalPriceRounded,
      roundingExtra: salePricing.roundingExtra,
      profit: salePricing.profit * quantity,
      priceTypeUsed: salePricing.priceType,
      actualCostAtSale: salePricing.actualCost
    };
  }, [getProductPricing]);

  const validatePrice = useCallback((product: Product, price: number): { valid: boolean; message?: string } => {
    const pricing = getProductPricing(product);

    if (pricing.minimumPriceRounded) {
      if (price < pricing.minimumPriceRounded) {
        return {
          valid: false,
          message: `Price cannot be less than minimum selling price: KES ${pricing.minimumPriceRounded.toFixed(2)}`
        };
      }
    }

    return { valid: true };
  }, [getProductPricing]);

  return {
    getProductPricing,
    calculateSaleItemPricing,
    validatePrice
  };
}
