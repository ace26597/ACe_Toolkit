# C3 Finance Research Template

## Overview

This is a pre-configured finance research workspace with sample portfolio data, watchlists, and model templates. Use it to analyze stocks, track portfolios, research SEC filings, and generate investment reports.

## Available Data

```
data/
├── portfolios/
│   ├── sample_portfolio.csv    # 10-stock portfolio with cost basis
│   └── watchlist.json          # Stocks to watch with target prices
├── market_data/
│   └── sector_allocation.json  # Target vs actual allocation
├── models/
│   └── dcf_assumptions.json    # DCF model template
└── output/                     # Generated reports go here
```

## Quick Start Commands

### Portfolio Analysis
```
Analyze my portfolio performance - compare current prices to cost basis
```

### Company Research
```
Research Tesla (TSLA) - get SEC filings, financials, and analyst ratings
```

### Earnings Analysis
```
Summarize Apple's latest 10-K - focus on revenue growth and risk factors
```

### Insider Tracking
```
Show me insider buying activity in NVDA over the last 30 days
```

### Industry Research
```
Find all 10-K filings that mention "artificial intelligence" in risk factors
```

### Valuation
```
Run a DCF model on Microsoft using the assumptions in models/dcf_assumptions.json
```

## Available MCP Tools

### SEC EDGAR (Free, No API Key)
- `search_companies` - Find tickers and CIKs
- `get_company_filings` - 10-K, 10-Q, 8-K filings
- `get_filing_content` - Full filing text
- `get_company_facts` - XBRL financial data
- `get_insider_transactions` - Form 4 filings
- `search_filings` - Full-text search

### Yahoo Finance
- `get_stock_info` - Current price, metrics
- `get_historical_stock_prices` - OHLCV data
- `get_financial_statement` - Income, balance sheet
- `get_recommendations` - Analyst ratings

### Alpaca (Paper Trading)
- Test strategies without real money

## Skills

Run `/finance-research` to load the finance research skill with detailed workflows.

## Example Prompts

1. **"What's my portfolio worth today?"**
   - Reads portfolio CSV
   - Gets current prices for each ticker
   - Calculates total value and P&L

2. **"Is AAPL overvalued?"**
   - Gets P/E, P/S, P/B ratios
   - Compares to historical averages
   - Pulls analyst price targets

3. **"What did Amazon say about AWS growth?"**
   - Gets latest 10-K filing
   - Searches for AWS mentions
   - Extracts revenue and guidance

4. **"Track insider buying in tech stocks"**
   - Gets Form 4 filings for watchlist
   - Filters for purchases
   - Summarizes activity

## Output Formats

Reports are saved to `output/` as:
- `{ticker}_research_report.md` - Company deep dives
- `portfolio_analysis_{date}.md` - Portfolio reviews
- `sector_comparison.md` - Industry analysis
