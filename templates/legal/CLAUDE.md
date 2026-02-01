# C3 Legal Research Template

## Overview

This is a pre-configured legal research workspace with sample contracts, case files, and document templates. Use it to analyze contracts, research case law, draft documents, and manage legal matters.

## Available Data

```
data/
├── contracts/
│   ├── sample_nda.md              # Non-disclosure agreement
│   └── sample_service_agreement.md # Professional services contract
├── case_files/
│   └── case_timeline.csv          # Litigation timeline tracker
├── transcripts/                   # Deposition transcripts
├── templates/
│   └── demand_letter.md           # Demand letter template
└── output/                        # Generated documents
```

## Quick Start Commands

### Contract Analysis
```
Analyze the NDA in contracts/sample_nda.md - identify key terms, obligations, and potential risks
```

### Risk Review
```
Review the service agreement for unfavorable terms or missing protections
```

### Document Drafting
```
Draft a cease and desist letter using the demand_letter.md template
```

### Case Management
```
Summarize the case timeline and identify upcoming deadlines
```

### Legal Research
```
Research California law on breach of NDA - what are the remedies and statute of limitations?
```

## Analysis Workflows

### Contract Review Checklist

When analyzing a contract, identify:

1. **Parties** - Who are the contracting parties?
2. **Term** - Duration and renewal provisions
3. **Consideration** - What each party gives/receives
4. **Obligations** - Key duties of each party
5. **Representations & Warranties** - What parties promise is true
6. **Indemnification** - Who bears risk of third-party claims
7. **Limitation of Liability** - Caps on damages
8. **Termination** - How and when can parties exit
9. **Governing Law** - Which jurisdiction applies
10. **Dispute Resolution** - Litigation vs arbitration

### Risk Flags to Identify

- Unlimited liability exposure
- One-sided indemnification
- Automatic renewal clauses
- Broad assignment rights
- Weak confidentiality protections
- Missing IP ownership provisions
- Unfavorable jurisdiction selection
- Short cure periods for breach
- Broad termination for convenience

### Document Generation

When drafting documents:

1. Start with appropriate template
2. Customize for specific facts
3. Ensure all bracketed fields are filled
4. Review for internal consistency
5. Check jurisdiction requirements
6. Add appropriate disclaimers

## Available Tools

### Browser Automation (agent-browser)
- Research case law on Google Scholar
- Access public court records
- Find statutory text

### PDF Processing
- Extract text from scanned documents
- Analyze uploaded contracts
- OCR for older documents

### Data Studio
- Track case timelines
- Analyze billing data
- Generate matter reports

## Example Prompts

1. **"What are the termination provisions in this contract?"**
   - Reads contract
   - Extracts termination clauses
   - Summarizes conditions and notice periods

2. **"Is this NDA favorable to us as the receiving party?"**
   - Analyzes from recipient perspective
   - Flags concerning provisions
   - Suggests modifications

3. **"Calculate days until discovery cutoff"**
   - Reads case timeline
   - Identifies deadline
   - Calculates remaining time

4. **"Draft a response to this demand letter"**
   - Analyzes incoming letter
   - Identifies claims and demands
   - Generates response outline

5. **"Compare these two contracts side by side"**
   - Reads both documents
   - Creates comparison table
   - Highlights differences

## Output Formats

Documents are saved to `output/` as:
- `{matter}_contract_analysis.md` - Contract reviews
- `{matter}_research_memo.md` - Legal research
- `{document_type}_{date}.md` - Drafted documents
- `case_summary_{date}.md` - Case status reports

## Disclaimer

This template is for educational and informational purposes only. It does not constitute legal advice. Always consult a licensed attorney for legal matters.
