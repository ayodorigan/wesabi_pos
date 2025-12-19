# Pricing System Verification Tests

## Manual Testing Checklist

Use this checklist to verify the pricing system is working correctly.

### 1. Purchase Invoice Creation

#### Test Case 1.1: Product with Discount
- [ ] Create a new purchase invoice
- [ ] Add an item with:
  - Cost Price: KES 100
  - Supplier Discount: 10%
  - VAT: 16%
- [ ] Verify calculations:
  - Discounted Cost: KES 90
  - Minimum Price (rounded): KES 140
  - Target Price (rounded): KES 155
- [ ] Save the invoice
- [ ] Check that product in inventory shows:
  - Original Cost: KES 100
  - Discounted Cost: KES 90
  - Minimum Selling Price: KES 140
  - Target Selling Price: KES 155

#### Test Case 1.2: Product without Discount
- [ ] Create a new purchase invoice
- [ ] Add an item with:
  - Cost Price: KES 50
  - Supplier Discount: 0%
  - VAT: 16%
- [ ] Verify calculations:
  - Discounted Cost: (empty/null)
  - Minimum Price: (empty/null)
  - Target Price (rounded): KES 80
- [ ] Save the invoice
- [ ] Check that product shows target price only

### 2. Inventory Display

#### Test Case 2.1: Pricing Columns Visible
- [ ] Go to Inventory page
- [ ] Verify these columns are visible:
  - Original Cost
  - Discounted Cost
  - Min Price
  - Target Price
  - Current Price
  - Margin indicators

#### Test Case 2.2: Discount Indicators
- [ ] Find a product with supplier discount
- [ ] Verify it shows:
  - Blue "Discounted" badge or
  - Green "High Margin" badge (if margin improvement >30%)
- [ ] Verify discount percentage is shown

#### Test Case 2.3: Warning Indicators
- [ ] Find a product where selling price is close to minimum
- [ ] Verify it shows yellow "Close to Min" badge

### 3. Point of Sale

#### Test Case 3.1: Add Product to Cart
- [ ] Go to POS
- [ ] Add a product with discount to cart
- [ ] Verify default price is Target Price
- [ ] Click the info icon (ℹ️)
- [ ] Verify pricing details panel shows:
  - Minimum Price
  - Target Price
  - Profit per unit
  - Price Type: TARGET

#### Test Case 3.2: Price Validation
- [ ] Edit the price of a product with discount
- [ ] Try to set price below minimum
- [ ] Verify error message appears
- [ ] Verify price is NOT saved

#### Test Case 3.3: Price Type Tracking
- [ ] Add product to cart
- [ ] Keep default price (should be TARGET)
- [ ] Change price to minimum price
- [ ] Complete the sale
- [ ] Check database: sale_items.price_type_used should be 'MINIMUM'

#### Test Case 3.4: Profit Calculation
- [ ] Add product with:
  - Original Cost: KES 100
  - Discount: 10% (Actual Cost: KES 90)
  - Selling at Target Price: KES 155
- [ ] Complete sale
- [ ] Check database: sale_items.profit should be approximately:
  - Selling Ex-VAT: KES 133.62
  - Profit: (133.62 - 90) + rounding = ~KES 44
- [ ] Verify VAT amount is stored separately

### 4. Analytics Dashboard

#### Test Case 4.1: Profit Metrics Visible
- [ ] Go to Analytics
- [ ] Verify these cards are visible:
  - Total Profit
  - Average Margin %
  - Base Profit
  - Rounding-Driven Profit

#### Test Case 4.2: Profit Analysis Section
- [ ] Scroll to "Profit Analysis" section
- [ ] Verify "Pricing Strategy" shows:
  - Target Price Sales count
  - Minimum Price Sales count
- [ ] Verify "Profit Sources" shows:
  - Base Profit amount
  - Rounding-Driven Profit amount

#### Test Case 4.3: Profit Trends
- [ ] In Profit Analysis section
- [ ] Switch between Day/Week/Month views
- [ ] Verify chart updates with:
  - Revenue bars
  - Profit bars
  - Margin % line
- [ ] Verify calculations are accurate

#### Test Case 4.4: Top Profitable Products
- [ ] Scroll to "Top Profitable Products" table
- [ ] Verify it shows:
  - Product names
  - Quantity sold
  - Revenue
  - Profit
  - Margin %
- [ ] Verify top 3 have special styling (gold/silver/bronze)
- [ ] Verify margins are color-coded

### 5. Rounding Verification

#### Test Case 5.1: Rounding Logic
Test various prices to verify rounding:

| Input Price | Expected Rounded |
|------------|------------------|
| KES 43.20  | KES 45          |
| KES 47.80  | KES 50          |
| KES 50.00  | KES 50          |
| KES 52.30  | KES 55          |
| KES 58.00  | KES 60          |
| KES 63.50  | KES 65          |
| KES 68.90  | KES 70          |

#### Test Case 5.2: Rounding Profit Tracking
- [ ] Complete a sale where price rounds up
- [ ] Check database: sale_items.rounding_extra > 0
- [ ] Verify profit includes rounding extra
- [ ] Check Analytics: Rounding-Driven Profit includes this amount

### 6. Price Editing

#### Test Case 6.1: Edit Price in Cart (POS)
- [ ] Add product to cart
- [ ] Click edit price (pencil icon)
- [ ] Change to a valid price
- [ ] Save
- [ ] Verify:
  - New price is used
  - All pricing fields recalculated
  - Profit updated
  - Price type updated if applicable

#### Test Case 6.2: Use Last Sold Price
- [ ] Add product that was previously sold
- [ ] Check "Use last price" checkbox
- [ ] Verify:
  - Price changes to last sold price
  - Pricing fields recalculated
  - Profit updated

### 7. Data Persistence

#### Test Case 7.1: Invoice Items Stored Correctly
- [ ] Create and save a purchase invoice
- [ ] Query database: `SELECT * FROM invoice_items WHERE invoice_id = <id>`
- [ ] Verify these fields are populated:
  - selling_price_ex_vat
  - vat_amount
  - final_price_rounded
  - rounding_extra
  - profit
  - price_type_used
  - actual_cost_at_sale

#### Test Case 7.2: Sale Items Stored Correctly
- [ ] Complete a sale in POS
- [ ] Query database: `SELECT * FROM sale_items WHERE sale_id = <id>`
- [ ] Verify all pricing fields are populated
- [ ] Verify profit calculation is correct

#### Test Case 7.3: Product Pricing Updated
- [ ] Create a purchase invoice
- [ ] Query database: `SELECT * FROM products WHERE id = <id>`
- [ ] Verify these fields are updated:
  - discounted_cost
  - minimum_selling_price
  - target_selling_price
  - has_vat

### 8. Edge Cases

#### Test Case 8.1: Zero Discount
- [ ] Add product with 0% discount
- [ ] Verify minimum price is null/empty
- [ ] Verify only target price is shown
- [ ] Verify sale can complete successfully

#### Test Case 8.2: 100% Discount (Free Item)
- [ ] Add product with 100% discount
- [ ] Verify minimum price is near zero
- [ ] Verify profit is maximized
- [ ] Verify system allows this

#### Test Case 8.3: Non-VAT Item
- [ ] Create product with has_vat = false
- [ ] Verify VAT is not added
- [ ] Verify profit calculation excludes VAT
- [ ] Verify prices are still rounded

#### Test Case 8.4: Very Small Amounts
- [ ] Test with cost price: KES 1
- [ ] Verify calculations work
- [ ] Verify rounding to 5 or 10 works
- [ ] Minimum price should be KES 5

#### Test Case 8.5: Very Large Amounts
- [ ] Test with cost price: KES 10,000
- [ ] Verify calculations work
- [ ] Verify no overflow errors
- [ ] All fields store correctly

### 9. Backward Compatibility

#### Test Case 9.1: Existing Products
- [ ] View products created before migration
- [ ] Verify they have calculated pricing fields
- [ ] Verify they can be sold in POS
- [ ] Verify analytics includes them

#### Test Case 9.2: Existing Sales
- [ ] View sales history from before migration
- [ ] Verify estimated profit is shown
- [ ] Verify they appear in analytics
- [ ] Verify no errors occur

### 10. Reports & Export

#### Test Case 10.1: Analytics Export
- [ ] Go to Analytics
- [ ] Click "Generate Report"
- [ ] Verify PDF includes:
  - Profit metrics
  - Profit breakdown
  - Top profitable products
  - All calculations correct

#### Test Case 10.2: Invoice Print
- [ ] Open a purchase invoice
- [ ] Click print/export
- [ ] Verify pricing information is included
- [ ] Verify summary shows expected profit

## Automated Test Scenarios

### Unit Test: Rounding Function
```typescript
import { roundUpToNearest5Or10 } from './utils/pricing';

describe('roundUpToNearest5Or10', () => {
  test('rounds 43.2 to 45', () => {
    expect(roundUpToNearest5Or10(43.2)).toBe(45);
  });

  test('rounds 47.8 to 50', () => {
    expect(roundUpToNearest5Or10(47.8)).toBe(50);
  });

  test('keeps 50 as 50', () => {
    expect(roundUpToNearest5Or10(50)).toBe(50);
  });

  test('rounds 52.3 to 55', () => {
    expect(roundUpToNearest5Or10(52.3)).toBe(55);
  });
});
```

### Unit Test: Product Pricing
```typescript
import { calculateProductPricing } from './utils/pricing';

describe('calculateProductPricing', () => {
  test('calculates pricing with discount', () => {
    const result = calculateProductPricing({
      originalCost: 100,
      discountPercent: 10,
      hasVAT: true,
      vatRate: 16
    });

    expect(result.discountedCost).toBe(90);
    expect(result.actualCost).toBe(90);
    expect(result.minimumPriceExVAT).toBeCloseTo(119.7, 1);
    expect(result.targetPriceExVAT).toBeCloseTo(133, 1);
    expect(result.minimumPriceRounded).toBe(140);
    expect(result.targetPriceRounded).toBe(155);
  });

  test('calculates pricing without discount', () => {
    const result = calculateProductPricing({
      originalCost: 50,
      discountPercent: 0,
      hasVAT: true,
      vatRate: 16
    });

    expect(result.discountedCost).toBeNull();
    expect(result.actualCost).toBe(50);
    expect(result.minimumPriceExVAT).toBeNull();
    expect(result.targetPriceExVAT).toBeCloseTo(66.5, 1);
    expect(result.targetPriceRounded).toBe(80);
  });
});
```

### Unit Test: Sale Pricing
```typescript
import { calculateSalePricing } from './utils/pricing';

describe('calculateSalePricing', () => {
  test('calculates profit correctly', () => {
    const result = calculateSalePricing({
      actualCost: 90,
      sellingPriceExVAT: 133,
      hasVAT: true,
      vatRate: 16,
      priceType: 'TARGET'
    });

    expect(result.vatAmount).toBeCloseTo(21.28, 1);
    expect(result.finalPriceRaw).toBeCloseTo(154.28, 1);
    expect(result.finalPriceRounded).toBe(155);
    expect(result.roundingExtra).toBeCloseTo(0.72, 1);
    expect(result.profit).toBeCloseTo(43.72, 1);
  });
});
```

## Performance Tests

### Test Case P1: Large Dataset
- [ ] Create 1000+ products with pricing
- [ ] Verify Inventory page loads in <3 seconds
- [ ] Verify Analytics calculates in <5 seconds
- [ ] Verify POS search responds in <1 second

### Test Case P2: Concurrent Sales
- [ ] Simulate 10 concurrent sales
- [ ] Verify all pricing calculated correctly
- [ ] Verify no race conditions
- [ ] Verify database integrity maintained

## Security Tests

### Test Case S1: Price Manipulation
- [ ] Attempt to manually set price below minimum via API
- [ ] Verify request is rejected
- [ ] Verify error message is returned

### Test Case S2: Data Validation
- [ ] Attempt to save negative prices
- [ ] Attempt to save invalid profit values
- [ ] Verify validation prevents invalid data

## Sign-Off

- [ ] All manual tests passed
- [ ] All automated tests passed
- [ ] Performance acceptable
- [ ] Security verified
- [ ] Documentation complete
- [ ] Ready for production

**Tested By**: _________________
**Date**: _________________
**Signature**: _________________

---

**Notes:**
- Report any failures with screenshots and error messages
- Include browser/environment details for any issues
- Document any unexpected behavior
- Suggest improvements for future versions
