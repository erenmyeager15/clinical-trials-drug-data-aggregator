# Clinical Trials & Drug Data Aggregator

Collect normalized, non-personal clinical trial and drug/regulatory records from official US government open APIs into one Apify dataset. The Actor uses JSON APIs only, with ClinicalTrials.gov study data plus openFDA drug label, NDC, recall, and aggregate adverse-event metrics.

This Actor is for public research, regulatory monitoring, and market intelligence. It is not medical advice.

## What It Extracts

- ClinicalTrials.gov study facts: NCT ID, title, overall status, phase, study type, conditions, interventions, sponsor organization, collaborators, enrollment count, dates, and facility/city/country summaries.
- openFDA drug records: brand name, generic name, manufacturer or labeler organization, product type, route, dosage form, NDC identifiers, and aggregate adverse-event count metrics.
- openFDA recall records: recall number, product description, recall status, classification, recalling organization, recall date, recall reason, product identifiers, and source URL.

The Actor intentionally excludes individual investigators, trial contacts, emails, phone numbers, patient-level adverse-event reports, and patient demographics.

## Supported Sources

| Source | Input value | API key | Best for |
| --- | --- | --- | --- |
| ClinicalTrials.gov API v2 | `clinical_trials` | No | Studies by condition, drug, sponsor-related keyword, phase, and status |
| openFDA drug label / NDC / adverse-event aggregates | `openfda_drugs` | Optional | Drug identity, manufacturer, route, dosage form, NDC, and aggregate event counts |
| openFDA drug enforcement recalls | `openfda_recalls` | Optional | Drug recalls, classifications, recall dates, firms, and reasons |

openFDA works without an API key for light usage. Add `openFdaApiKey` or the `OPENFDA_API_KEY` environment variable if you need higher openFDA rate limits.

## Use Cases

- Pharma and biotech pipeline research
- Trial landscape monitoring by condition, drug, phase, or sponsor keyword
- Competitive intelligence across studies, products, manufacturers, and recalls
- Regulatory monitoring for drug recalls and enforcement actions
- Investor and market intelligence for public drug-development signals
- Research data enrichment for dashboards, CRMs, and internal analytics

## Quick Start

### Search trials and openFDA data for one drug

```json
{
  "sources": ["clinical_trials", "openfda_drugs", "openfda_recalls"],
  "query": "aspirin",
  "drugNames": ["aspirin"],
  "status": "all",
  "phase": "all",
  "maxResults": 10
}
```

### Search recruiting Phase 3 oncology trials

```json
{
  "sources": ["clinical_trials"],
  "query": "oncology",
  "conditions": ["melanoma"],
  "status": "RECRUITING",
  "phase": "PHASE3",
  "maxResults": 10
}
```

### Search openFDA recalls only

```json
{
  "sources": ["openfda_recalls"],
  "query": "metformin",
  "drugNames": ["metformin"],
  "maxResults": 10
}
```

## Input Fields

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `sources` | array | All three sources | Select `clinical_trials`, `openfda_drugs`, and/or `openfda_recalls`. |
| `query` | string | `aspirin` | General keyword used by the selected sources. Examples: `aspirin`, `diabetes`, `oncology`, `melanoma`. |
| `conditions` | array | Empty | Optional clinical trial condition terms such as `diabetes` or `breast cancer`. Used for trial searches. |
| `drugNames` | array | Empty | Optional drug names used for openFDA searches and trial searches. |
| `status` | string | `all` | Optional ClinicalTrials.gov status filter, such as `RECRUITING`, `COMPLETED`, or `TERMINATED`. |
| `phase` | string | `all` | Optional ClinicalTrials.gov phase filter, such as `PHASE2`, `PHASE3`, or `PHASE4`. |
| `maxResults` | integer | `10` | Maximum clean records to save across selected sources, capped at `1000`. |
| `openFdaApiKey` | string | Empty | Optional secret openFDA API key for higher openFDA rate limits. |
| `userAgent` | string | `ClinicalTrialsDrugDataAggregator/1.0 public-data-research` | Descriptive User-Agent sent to official APIs. |
| `proxyConfiguration` | object | No proxy | Not required for these official JSON APIs; included for Apify compatibility. |

If no search term is provided, the Actor uses `aspirin` as a safe default.

## Output Overview

Each dataset item is a normalized public research record. Depending on the source, fields include:

| Field group | Example fields |
| --- | --- |
| Source and identity | `source`, `query`, `recordType`, `recordId`, `sourceUrl`, `attribution`, `scrapedAt` |
| Trial details | `title`, `name`, `status`, `phase`, `studyType`, `conditions`, `interventions`, `sponsorOrManufacturer`, `collaborators` |
| Trial dates and scale | `enrollmentCount`, `startDate`, `completionDate`, `lastUpdateDate`, `locationsSummary` |
| Drug/product details | `genericName`, `brandName`, `productType`, `route`, `dosageForm`, `ndc`, `adverseEventCount` |
| Recall details | `recallDate`, `classification`, `recallReason`, `status`, `sponsorOrManufacturer` |

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
  "studyType": "INTERVENTIONAL",
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
  "locationsSummary": [
    { "facility": "Example Medical Center", "city": "Boston", "country": "United States" }
  ],
  "sourceUrl": "https://clinicaltrials.gov/study/NCT01234567",
  "scrapedAt": "2026-06-14T00:00:00.000Z"
}
```

## Tips For Better Results

- Use specific condition and drug terms. `melanoma pembrolizumab` or `type 2 diabetes metformin` is usually better than a very broad keyword.
- For trial-only research, select only `clinical_trials` and use `status` / `phase` filters to reduce noise.
- For regulatory monitoring, select `openfda_recalls` and search by drug name, ingredient, product family, or recall-reason keyword.
- Keep `maxResults` small for exploratory runs, then increase it once the query is right.
- Use an openFDA API key for larger openFDA workloads or repeated recall/drug-label checks.

## Known Limits

- The Actor depends on official public API availability and rate limits.
- openFDA adverse-event values are aggregate counts, not patient-level reports.
- Clinical trial location summaries are limited to facility, city, and country.
- Trial status and phase are normalized from the source record and may vary by study.
- The Actor does not provide medical, regulatory, investment, or legal advice.

## Pricing

This Actor uses pay-per-event pricing.

| Event | When charged | Price |
| --- | --- | --- |
| `trial-record-scraped` | One clean non-personal clinical trial, drug, or recall record saved | `$0.004` |

Each clean non-personal record is saved and charged atomically. Empty searches, forbidden fields, and failed source requests are not charged, and later source queries stop when the user's spending limit is reached.

## Data Safety

This Actor is designed for non-personal organizational and public research data only. It does not output trial contacts, investigator names, phone numbers, emails, patient-level reports, or patient demographics. openFDA adverse-event data is represented only as aggregate counts.

## Medical Disclaimer

This Actor provides public research data and is not medical advice. Do not use this data to diagnose, treat, prevent, or make medical decisions. Consult qualified medical and regulatory professionals for clinical interpretation.

## Responsible Use

This Actor is intended for lawful collection and processing of publicly available information only. Users are responsible for ensuring their use complies with source terms, applicable privacy laws, and all local regulations.

Do not use this Actor to collect, store, sell, or misuse personal data without a lawful basis. The Actor author is not responsible for misuse by end users.

## License

Apache-2.0
