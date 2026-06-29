# Clinical Trials Promotion Notes

## YouTube Tutorial Title Options

- How to Export ClinicalTrials.gov and openFDA Data with Apify
- Clinical Trials & Drug Data Aggregator: Track Trials, Drugs and Recalls
- Build a Pharma Research Dataset from Official US Government APIs

## 60-Second Tutorial Script

1. Show the actor page: "This actor collects non-personal clinical trial and drug/regulatory records from official US government APIs."
2. Open the input form and keep all three sources selected.
3. Search for a drug such as `aspirin` or use a condition plus drug combination.
4. Set `status` and `phase` only if you want trial-specific filtering.
5. Keep `maxResults` small, such as `10`, for the first run.
6. Run the actor.
7. Show dataset fields: `recordType`, `recordId`, `status`, `phase`, `conditions`, `brandName`, `genericName`, `classification`, `adverseEventCount`, and `sourceUrl`.
8. Open one `sourceUrl` to show the official source.
9. Closing line: "Use this for research dashboards and monitoring workflows, not for medical decisions or patient-level data."

## Short Post Copy

I polished a Clinical Trials & Drug Data Aggregator on Apify.

It uses official public APIs from ClinicalTrials.gov and openFDA to collect non-personal study, drug, NDC, recall, and aggregate adverse-event data.

The output includes NCT IDs, study status, phase, conditions, interventions, sponsors, enrollment, dates, drug names, manufacturers, NDCs, recall classifications, recall reasons, source URLs, and attribution.

It intentionally avoids investigator/contact details, emails, phone numbers, patient-level reports, and patient demographics.

Example input:

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

## SEO Keywords

- clinical trials scraper
- ClinicalTrials.gov API scraper
- openFDA scraper
- drug recall data scraper
- pharma research data
- clinical trial dataset
- drug label data API
- Apify clinical trials actor

## Promotion Guard

Keep all public examples non-personal and research-oriented. Do not position this as a patient, investigator, doctor, contact, lead-generation, medical-advice, or diagnosis tool.
