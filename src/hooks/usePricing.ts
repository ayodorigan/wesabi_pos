import { useState, useCallback } from 'react';
import { Product, SaleItem } from '../types';
import {
  calculateProductPricing,
  calculateSalePricing,
  validateDiscountedPrice,
  PriceType
} from '../utils/pricing';

export function usePricing() {
  const getProductPricing = useCallback((product: Product) => {
    return calculateProductPricing({
      originalCost: product.costPrice,
      discountPercent: product.supplierDiscountPercent || 0,
      hasVAT: product.hasVat ?? false,
      vatRate: product.vatRate || 0
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
    if (priceType === 'DISCOUNTED') {
      sellingPriceExVAT = pricing.discountedPriceExVAT || pricing.sellingPriceExVAT;
    } else {
      sellingPriceExVAT = pricing.sellingPriceExVAT;
    }

    if (selectedPrice !== pricing.discountedPriceRounded &&
        selectedPrice !== pricing.sellingPriceRounded) {
      const hasVAT = product.hasVat ?? false;
      const vatRate = product.vatRate || 0;
      if (hasVAT && vatRate > 0) {
        sellingPriceExVAT = selectedPrice / (1 + vatRate / 100);
      } else {
        sellingPriceExVAT = selectedPrice;
      }
    }

    const salePricing = calculateSalePricing({
      actualCost,
      sellingPriceExVAT,
      hasVAT: product.hasVat ?? false,
      vatRate: product.vatRate || 0,
      priceType
    });

    return {
      productId: product.id,
      productName: product.name,
      quantity,
      unitPrice: salePricing.finalPriceRounded,
      totalPrice: salePricing.finalPriceRounded * quantity,
      originalPrice: pricing.sellingPriceRounded,
      priceAdjusted: selectedPrice !== pricing.sellingPriceRounded,
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

    if (pricing.discountedPriceRounded) {
      if (price < pricing.discountedPriceRounded) {
        return {
          valid: false,
          message: `Price cannot be less than discounted price: KES ${pricing.discountedPriceRounded.toFixed(2)}`
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
