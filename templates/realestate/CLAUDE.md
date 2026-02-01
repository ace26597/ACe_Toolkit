# C3 Real Estate Investment Template

## Overview

This is a pre-configured real estate investment analysis workspace with sample property data, financial models, market research, and due diligence checklists. Use it to analyze deals, run projections, and make investment decisions.

## Available Data

```
data/
├── properties/
│   ├── sample_property.json       # Duplex deal analysis
│   └── comps_analysis.csv         # Comparable sales
├── financials/
│   ├── proforma_analysis.json     # Full financial model
│   └── rent_roll.csv              # Current tenants
├── documents/                     # Leases, inspections
├── market_data/
│   └── austin_78701_stats.json    # Market statistics
├── checklists/
│   └── due_diligence.md           # DD checklist
└── output/                        # Generated reports
```

## Quick Start Commands

### Deal Analysis
```
Analyze the duplex in properties/sample_property.json - calculate cap rate, cash flow, and ROI
```

### Comps Review
```
Review the comparable sales and estimate fair market value for the subject property
```

### Cash Flow Projection
```
Create a 5-year cash flow projection for this property with 3% rent growth
```

### Market Research
```
Summarize the Austin 78701 market and assess investment viability
```

### Due Diligence
```
Review the due diligence checklist and identify critical items for this deal
```

## Investment Metrics Explained

### Key Formulas

**Cap Rate** = NOI / Purchase Price
```
$24,648 NOI / $425,000 = 5.8%
```

**Cash-on-Cash Return** = Annual Cash Flow / Total Cash Invested
```
$5,000 cash flow / $120,000 invested = 4.2%
```

**Gross Rent Multiplier (GRM)** = Purchase Price / Annual Gross Rent
```
$425,000 / $39,000 = 10.9
```

**Debt Coverage Ratio (DCR)** = NOI / Annual Debt Service
```
$24,648 / $30,084 = 0.82 (should be >1.25)
```

### Target Metrics by Property Type

| Type | Target Cap | Target CoC | Max GRM |
|------|-----------|-----------|---------|
| Multifamily A | 4-5% | 6-8% | 15 |
| Multifamily B | 5-7% | 8-12% | 12 |
| Multifamily C | 7-10% | 12-15% | 10 |
| SFH Rental | 5-8% | 8-12% | 12 |

## Analysis Workflows

### Full Deal Analysis

1. **Load property data**
   - Read property JSON
   - Review unit mix and rents

2. **Verify income**
   - Current vs market rents
   - Vacancy assumptions
   - Other income sources

3. **Calculate expenses**
   - Taxes, insurance, management
   - Maintenance reserves
   - Utilities

4. **Run financial model**
   - NOI calculation
   - Debt service
   - Cash flow

5. **Compare to market**
   - Cap rate vs area average
   - GRM comparison
   - Rent per sqft

6. **Make recommendation**
   - Go/No-Go decision
   - Suggested offer price

### Comparative Market Analysis

1. **Gather comps**
   - Same property type
   - Similar size (±20%)
   - Recent sales (6 months)
   - Nearby location (1 mile)

2. **Make adjustments**
   - Size differences
   - Age/condition
   - Features/amenities
   - Location quality

3. **Calculate value range**
   - Low, mid, high estimates
   - Price per sqft comparison
   - GRM comparison

### Due Diligence Review

1. **Financial verification**
   - Rent roll accuracy
   - Expense verification
   - Lease review

2. **Physical inspection**
   - Major systems
   - Deferred maintenance
   - Code compliance

3. **Legal/title**
   - Clear title
   - Zoning verification
   - Permit history

## Available Tools

### Data Studio
- Create dashboards from property data
- Visualize cash flows
- Compare multiple properties

### Web Research (agent-browser)
- Pull Zillow/Redfin data
- Research neighborhoods
- Find comparable sales

### Spreadsheet Processing
- Analyze rent rolls
- Process comps data
- Financial modeling

## Example Prompts

1. **"Is this a good deal?"**
   - Analyzes all metrics
   - Compares to market
   - Gives recommendation

2. **"What should I offer?"**
   - Reverse engineers target returns
   - Calculates max price
   - Suggests negotiation strategy

3. **"Create a presentation for investors"**
   - Executive summary
   - Financial projections
   - Risk analysis

4. **"What are the red flags?"**
   - Reviews due diligence items
   - Identifies concerns
   - Suggests further investigation

5. **"Compare this to my other properties"**
   - Loads portfolio data
   - Creates comparison table
   - Ranks by performance

## Output Formats

Reports are saved to `output/` as:
- `{address}_analysis.md` - Deal analysis
- `{address}_proforma.json` - Financial model
- `market_report_{zip}.md` - Market research
- `portfolio_summary.md` - Portfolio overview

## Disclaimer

This template is for educational purposes. Always conduct proper due diligence and consult with real estate professionals, attorneys, and accountants before making investment decisions.
