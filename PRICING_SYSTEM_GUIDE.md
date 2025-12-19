# Pricing & Profit System - Implementation Guide

## Overview

This guide documents the comprehensive pricing and profit logic system implemented across the Wesabi Pharmacy POS application.

## Core Business Rules

### 1. Cost Definitions

- **Original Cost (LC)**: Supplier list cost before any discounts
- **Discounted Cost (DC)**: Actual purchase cost after supplier discount (nullable if no discount)
- **Actual Cost**:
  - If discount exists → Discounted Cost
  - Otherwise → Original Cost

### 2. Markup Rule

- **Base Markup Multiplier**: 1.33 (33% markup)
- All selling prices are calculated ex-VAT first
- VAT is applied after markup

### 3. Selling Price Types

When a discount exists, there are two price points:

#### Minimum Selling Price (Floor Price)
```
MinPriceExVAT = DiscountedCost × 1.33
```
- Used for promotions or price negotiations
- System prevents selling below this price
- Only exists when supplier discount is applied

#### Target Selling Price (Default)
```
TargetPriceExVAT = OriginalCost × 1.33
```
- Supplier discount is **ignored** in this calculation
- This is the recommended retail price
- Used as default for all sales

When no discount exists:
```
SellingPriceExVAT = OriginalCost × 1.33
```

### 4. VAT Logic

- **Default VAT Rate**: 16%
- VAT is calculated **after** markup
- VAT is **not** part of profit calculation

```
VATAmount = SellingPriceExVAT × 0.16
FinalPriceRaw = SellingPriceExVAT + VATAmount
```

If VAT does not apply:
```
FinalPriceRaw = SellingPriceExVAT
```

### 5. Rounding Rule (Critical)

Final selling price must:
- Be rounded **UP ONLY**
- End in **0 or 5**
- Rounding is applied **after VAT**
- Rounding difference **increases profit**
- VAT is **NOT recalculated** after rounding

```
FinalPriceRounded = roundUpToNearest5Or10(FinalPriceRaw)
RoundingExtra = FinalPriceRounded - FinalPriceRaw
```

### 6. Profit Calculation

Profit is **always stored ex-VAT**:

```
Profit = (SellingPriceExVAT - ActualCost) + RoundingExtra
```

Key points:
- VAT is excluded from profit
- Supplier discount increases profit
- Rounding increases profit

## Database Schema

### Products Table

New fields added:
```sql
- discounted_cost: numeric (nullable)
- minimum_selling_price: numeric
- target_selling_price: numeric
- has_vat: boolean (default true)
```

### Invoice Items Table

New fields added:
```sql
- selling_price_ex_vat: numeric
- vat_amount: numeric
- final_price_rounded: numeric
- rounding_extra: numeric
- profit: numeric
- price_type_used: price_type enum ('MINIMUM' | 'TARGET')
- actual_cost_at_sale: numeric
```

### Sale Items Table

Same fields as invoice_items plus:
```sql
- cost_price: numeric
```

## Implementation Details

### 1. Pricing Utility (`src/utils/pricing.ts`)

Core functions:

#### `calculateProductPricing(input)`
Calculates all pricing fields for a product:
- Input: originalCost, discountPercent, hasVAT, vatRate
- Output: All price points (minimum, target, with/without VAT, rounded)

#### `calculateSalePricing(input)`
Calculates pricing for a sale transaction:
- Input: actualCost, sellingPriceExVAT, hasVAT, vatRate, priceType
- Output: VAT amount, final price, rounding extra, profit

#### `roundUpToNearest5Or10(value)`
Rounds a value up to the nearest 5 or 10:
- 43.2 → 45
- 47.8 → 50
- 50.0 → 50
- 52.3 → 55

#### `validateMinimumPrice(sellingPrice, minimumPrice)`
Validates that a selling price meets the minimum threshold

### 2. Pricing Hook (`src/hooks/usePricing.ts`)

React hook that provides:
- `getProductPricing(product)`: Get all pricing info for a product
- `calculateSaleItemPricing(product, quantity, price, priceType)`: Calculate complete sale item with pricing
- `validatePrice(product, price)`: Validate if a price is acceptable

### 3. POS Component Updates

#### Price Calculation on Add to Cart
```typescript
const pricing = getProductPricing(product);
const saleItem = calculateSaleItemPricing(
  product,
  1,
  pricing.targetPriceRounded,
  'TARGET'
);
```

#### Price Validation
```typescript
const validation = validatePrice(product, newPrice);
if (!validation.valid) {
  showAlert({ message: validation.message, type: 'error' });
  return;
}
```

#### Pricing Info Display
Each cart item shows:
- Minimum price (if discount exists)
- Target price
- Current price
- Profit per unit
- Price type used (MINIMUM/TARGET)

### 4. Inventory Component Updates

New columns display:
- **Original Cost**: Base cost price
- **Discounted Cost**: With discount percentage badge
- **Min Price**: With "With Discount" badge if applicable
- **Target Price**: Recommended retail price
- **Current Price**: Active selling price
- **Margin Indicators**:
  - 🟢 Green "High Margin": Discount increases margin >30%
  - 🟡 Yellow "Close to Min": Price within 20% of minimum
  - 🔵 Blue "Discounted": Has supplier discount

### 5. Analytics Component Updates

#### New Profit Metrics
- **Total Profit**: Sum of all profits in date range
- **Average Margin %**: (Total Profit / Total Revenue) × 100
- **Base Profit**: Profit excluding rounding
- **Rounding-Driven Profit**: Extra profit from rounding

#### Profit Analysis Section
- Pricing strategy breakdown (Target vs Minimum sales)
- Profit sources breakdown
- Profit trends (daily/weekly/monthly)
- Revenue vs Profit charts

#### Top Profitable Products
Ranked list showing:
- Product name
- Quantity sold
- Total revenue
- Total profit
- Margin percentage (color-coded)

### 6. Invoice Management Updates

#### Purchase Invoice Creation
When adding items:
1. Calculate minimum and target prices based on cost and discount
2. Display calculated prices in real-time
3. Show expected profit margins

#### Summary Analytics
- Total Investment
- Expected Revenue (at target price)
- Expected Profit
- Average Profit Margin %

#### Invoice Items Table
Shows for each item:
- Cost with discount
- Minimum selling price
- Target selling price
- Profit margin percentage

## Usage Examples

### Example 1: Product with Discount

**Input:**
- Original Cost: KES 100
- Supplier Discount: 10%
- VAT: 16%

**Calculations:**
```
Discounted Cost = 100 × (1 - 0.10) = KES 90

Minimum Price Ex-VAT = 90 × 1.33 = KES 119.70
Minimum Price with VAT = 119.70 × 1.16 = KES 138.85
Minimum Price Rounded = KES 140

Target Price Ex-VAT = 100 × 1.33 = KES 133.00
Target Price with VAT = 133 × 1.16 = KES 154.28
Target Price Rounded = KES 155

Actual Cost = KES 90 (discounted)
```

**Profit at Minimum Price:**
```
Selling Price Ex-VAT = KES 119.70
Rounding Extra = 140 - 138.85 = KES 1.15
Profit = (119.70 - 90) + 1.15 = KES 30.85
Margin = 30.85 / 119.70 = 25.8%
```

**Profit at Target Price:**
```
Selling Price Ex-VAT = KES 133.00
Rounding Extra = 155 - 154.28 = KES 0.72
Profit = (133.00 - 90) + 0.72 = KES 43.72
Margin = 43.72 / 133.00 = 32.9%
```

### Example 2: Product without Discount

**Input:**
- Original Cost: KES 50
- No Discount
- VAT: 16%

**Calculations:**
```
Discounted Cost = NULL
Actual Cost = KES 50

Target Price Ex-VAT = 50 × 1.33 = KES 66.50
Target Price with VAT = 66.50 × 1.16 = KES 77.14
Target Price Rounded = KES 80

Minimum Price = NULL (no discount)
```

**Profit:**
```
Selling Price Ex-VAT = KES 66.50
Rounding Extra = 80 - 77.14 = KES 2.86
Profit = (66.50 - 50) + 2.86 = KES 19.36
Margin = 19.36 / 66.50 = 29.1%
```

## Business Benefits

### 1. Discount Leverage
- Supplier discounts increase profit margins
- Customers see target price (based on original cost)
- Pharmacy captures full discount value as profit

### 2. Price Flexibility
- Can offer promotions at minimum price
- Never sell below cost
- Target price maintains healthy margins

### 3. Rounding Profit
- Small amounts add up across many sales
- Transparent calculation
- Tracked separately for analysis

### 4. Analytics & Reporting
- Track discount impact on profitability
- Identify high-margin products
- Monitor pricing strategy effectiveness
- Analyze profit sources (base, discount, rounding)

## Best Practices

### 1. Purchase Invoices
- Always enter accurate supplier discounts
- Review calculated minimum and target prices
- Verify profit margins before saving

### 2. Point of Sale
- Use target price by default
- Only use minimum price for:
  - Customer negotiations
  - Promotions
  - Competitor matching
- Monitor items frequently sold at minimum price

### 3. Inventory Management
- Pay attention to "Close to Min" warnings
- Prioritize selling "High Margin" items
- Review pricing for items near minimum regularly

### 4. Analytics
- Track profit trends regularly
- Analyze discount impact monthly
- Monitor rounding contributions
- Review top profitable products weekly

## Validation Rules

### Price Validation
1. Selling price ≥ Minimum price (if discount exists)
2. Selling price ≥ Cost price × 1.33 (minimum markup)
3. All prices must be positive numbers
4. Rounding always rounds up

### Data Integrity
1. Actual cost never exceeds original cost
2. Discounted cost only exists if discount > 0
3. VAT amount always ≥ 0
4. Rounding extra always ≥ 0
5. Profit can be negative only in special cases (price overrides)

## Troubleshooting

### Issue: "Price cannot be less than minimum selling price"
**Solution**:
- Check if product has supplier discount
- Verify minimum price calculation
- Consider if promotion justifies minimum price
- Ensure pricing data is up-to-date

### Issue: Profit seems incorrect
**Solution**:
- Verify actual cost calculation
- Check if discount was applied correctly
- Ensure VAT is excluded from profit
- Verify rounding extra calculation

### Issue: Prices not updating after invoice
**Solution**:
- Check if invoice was saved successfully
- Verify product update in database
- Refresh inventory page
- Check for database permissions

## Migration Notes

### Existing Data
- Existing products: Prices calculated with best-effort logic
- Existing sales: Profit estimated from available data
- New transactions: Full pricing data captured

### Backward Compatibility
- Old invoices work with calculated fields
- Missing pricing fields default to 0
- System gracefully handles null values

## API Reference

### Database Functions

#### `calculate_product_pricing()`
```sql
calculate_product_pricing(
  original_cost numeric,
  discount_percent numeric DEFAULT 0,
  has_vat_flag boolean DEFAULT true,
  vat_rate_percent numeric DEFAULT 16
)
```

Returns: Table with all calculated pricing fields

## Support & Maintenance

### Regular Tasks
- [ ] Review pricing strategy monthly
- [ ] Analyze profit margins quarterly
- [ ] Update VAT rate if regulations change
- [ ] Audit high-margin products
- [ ] Review discount policies

### Monitoring
- Track average margin trends
- Monitor items at minimum price
- Watch for pricing errors
- Review profit breakdown regularly

---

**Document Version**: 1.0
**Last Updated**: 2025-12-19
**Author**: Wesabi Pharmacy System
