# Clinical Trials & Drug Data Aggregator

Aggregate non-personal clinical trial and drug/regulatory records from official US government open APIs into one normalized Apify dataset. The Actor uses JSON APIs only and does not browser-scrape websites.

This Actor provides public research data and is not medical advice.

## What It Extracts

- ClinicalTrials.gov study facts: NCT ID, brief/official title, status, phase, study type, conditions, interventions, sponsor organization, collaborator organizations, enrollment count, dates, and facility/city/country location summaries.
- openFDA drug records: brand name, generic name, manufacturer organization, product type, route, dosage form, NDC identifiers, and aggregate adverse-event count metrics.
- openFDA recall records: recall ID, product description, recall status, classification, recalling organization, recall date, reason, and source URL.

The Actor intentionally excludes individual investigators, trial contacts, emails, phone numbers, patient-level adverse-event reports, and patient demographics.

## Sources

- ClinicalTrials.gov API v2 from the U.S. National Library of Medicine.
- openFDA drug label, NDC, enforcement, and aggregate adverse-event endpoints from the U.S. Food and Drug Administration.

Both sources are official US government public data APIs. openFDA works without a key, and an optional API key can be provided for higher limits.

## Input

| Field | Type | Description |
| --- | --- | --- |
| `sources` | array | Select `clinical_trials`, `openfda_drugs`, and/or `openfda_recalls`. |
| `query` | string | General keyword, condition, or drug name. |
| `conditions` | array | Optional clinical condition terms. |
| `drugNames` | array | Optional drug names for openFDA and trial search. |
| `status` | string | Optional ClinicalTrials.gov status filter. |
| `phase` | string | Optional ClinicalTrials.gov phase filter. |
| `maxResults` | integer | Maximum records to save across all sources, capped at 1000. |
| `openFdaApiKey` | string | Optional secret openFDA API key. |
| `userAgent` | string | Descriptive User-Agent for public APIs. |

## Sample Output

```json
{
  "source": "clinical_trials",
  "query": "aspirin",
  "recordType": "trial",
  "recordId": "NCT01234567",
  "title": "A Study of Aspirin in Cardiovascular Prevention",
  "name": "Aspirin Prevention Study",
  "status": "COMPLETED",
  "phase": "PHASE3",
  "conditions": ["Cardiovascular Disease"],
  "interventions": [{ "name": "Aspirin", "type": "DRUG" }],
  "genericName": null,
  "brandName": null,
  "sponsorOrManufacturer": "Example University",
  "enrollmentCount": 500,
  "completionDate": "2024-06",
  "recallDate": null,
  "classification": null,
  "adverseEventCount": null,
  "locationsSummary": [{ "facility": "Example Medical Center", "city": "Boston", "country": "United States" }],
  "sourceUrl": "https://clinicaltrials.gov/study/NCT01234567",
  "scrapedAt": "2026-06-14T00:00:00.000Z"
}
```

## Use Cases

- Pharma and biotech pipeline research.
- Competitive intelligence across trials, sponsors, products, and recalls.
- Investor and market intelligence for public drug development signals.
- Regulatory monitoring for recalls and enforcement actions.
- Research data enrichment for internal dashboards and analytics.

## Pricing

This Actor uses pay-per-event pricing.

| Event | When charged | Price |
| --- | --- | --- |
| `trial-record-scraped` | One clean non-personal trial, drug, or recall record saved | $0.004 |

Charges are made only after a record is pushed to the dataset. Empty searches and failed source requests are not charged.

## How to Scrape Clinical Trials and Drug Data

1. Choose one or more sources.
2. Enter a condition, drug name, or keyword.
3. Optionally filter ClinicalTrials.gov results by status or phase.
4. Set the maximum number of records.
5. Run the Actor and export the dataset as JSON, CSV, Excel, or via API.

## Data Safety

This Actor is designed for non-personal organizational and public research data only. It does not output trial contacts, investigator names, phone numbers, emails, patient-level reports, or patient demographics. openFDA adverse-event data is represented only as aggregate counts.

## Medical Disclaimer

This Actor provides public research data and is not medical advice. Do not use this data to diagnose, treat, prevent, or make medical decisions. Consult qualified medical and regulatory professionals for clinical interpretation.

## Responsible Use

This Actor is intended for lawful collection of publicly available information only. Users are responsible for ensuring their use complies with the source website's terms, robots.txt, applicable privacy laws, including India's DPDP Act, and all local regulations.

Do not use this Actor to collect, store, sell, or misuse personal data without a lawful basis. The Actor author is not responsible for misuse by end users.

## License

Apache-2.0
