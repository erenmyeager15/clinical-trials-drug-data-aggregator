import type {
  ClinicalDrugRecord,
  OpenFdaCountResponse,
  OpenFdaLabel,
  OpenFdaLabelResponse,
  OpenFdaNdc,
  OpenFdaNdcResponse,
  OpenFdaRecall,
  OpenFdaRecallResponse,
} from './types.js';
import {
  delay,
  fetchJson,
  firstText,
  normalizeDate,
  normalizeText,
  numberOrNull,
  quoteOpenFdaTerm,
  redactPersonalText,
  uniqueStrings,
} from './utils.js';

const API_BASE = 'https://api.fda.gov';
const ATTRIBUTION = 'openFDA public drug and regulatory data from the U.S. Food and Drug Administration.';

function withApiKey(url: URL, apiKey: string | null): string {
  if (apiKey) url.searchParams.set('api_key', apiKey);
  return url.toString();
}

async function getAdverseEventCount(term: string, apiKey: string | null, userAgent: string): Promise<number | null> {
  const url = new URL(`${API_BASE}/drug/event.json`);
  url.searchParams.set('search', `patient.drug.medicinalproduct:${quoteOpenFdaTerm(term)}`);
  url.searchParams.set('limit', '1');
  try {
    await delay(120);
    const data = await fetchJson<OpenFdaCountResponse>(withApiKey(url, apiKey), {
      headers: { 'user-agent': userAgent },
    });
    return numberOrNull(data.meta?.results?.total);
  } catch {
    return null;
  }
}

function labelRecordId(label: OpenFdaLabel): string | null {
  const ndcs = label.openfda?.product_ndc;
  const firstNdc = Array.isArray(ndcs) ? ndcs[0] : null;
  return normalizeText(label.set_id ?? label.id ?? firstNdc);
}

function ndcRecordId(ndc: OpenFdaNdc): string | null {
  return normalizeText(ndc.product_ndc);
}

function uniqueIdentifiers(values: unknown[]): string[] {
  const seen = new Set<string>();
  for (const value of values) {
    const text = normalizeText(value);
    if (text) seen.add(text);
  }
  return [...seen];
}

function baseDrugRecord(query: string, recordId: string, name: string | null): Omit<ClinicalDrugRecord, 'adverseEventCount'> {
  return {
    source: 'openfda_drugs',
    query,
    recordType: 'drug_label',
    recordId,
    title: name,
    name,
    status: null,
    phase: null,
    studyType: null,
    conditions: [],
    interventions: [],
    genericName: null,
    brandName: null,
    sponsorOrManufacturer: null,
    collaborators: [],
    enrollmentCount: null,
    startDate: null,
    completionDate: null,
    lastUpdateDate: null,
    recallDate: null,
    classification: null,
    productType: null,
    route: null,
    dosageForm: null,
    ndc: null,
    recallReason: null,
    locationsSummary: [],
    sourceUrl: null,
    attribution: ATTRIBUTION,
    scrapedAt: new Date().toISOString(),
  };
}

async function normalizeLabel(label: OpenFdaLabel, query: string, apiKey: string | null, userAgent: string): Promise<ClinicalDrugRecord | null> {
  const recordId = labelRecordId(label);
  const brandName = firstText(label.openfda?.brand_name);
  const genericName = firstText(label.openfda?.generic_name);
  const name = brandName ?? genericName;
  if (!recordId || !name) return null;

  const countTerm = brandName ?? genericName ?? query;
  return {
    ...baseDrugRecord(query, recordId, name),
    genericName,
    brandName,
    sponsorOrManufacturer: firstText(label.openfda?.manufacturer_name),
    productType: firstText(label.openfda?.product_type),
    route: uniqueStrings(label.openfda?.route ?? []).join(', ') || null,
    dosageForm: null,
    ndc: uniqueIdentifiers(label.openfda?.product_ndc ?? []).join(', ') || null,
    sourceUrl: `https://api.fda.gov/drug/label.json?search=openfda.brand_name:${encodeURIComponent(quoteOpenFdaTerm(query))}`,
    adverseEventCount: await getAdverseEventCount(countTerm, apiKey, userAgent),
  };
}

async function normalizeNdc(ndc: OpenFdaNdc, query: string, apiKey: string | null, userAgent: string): Promise<ClinicalDrugRecord | null> {
  const recordId = ndcRecordId(ndc);
  const brandName = redactPersonalText(ndc.brand_name);
  const genericName = redactPersonalText(ndc.generic_name);
  const name = brandName ?? genericName;
  if (!recordId || !name) return null;

  const countTerm = brandName ?? genericName ?? query;
  return {
    ...baseDrugRecord(query, recordId, name),
    genericName,
    brandName,
    sponsorOrManufacturer: redactPersonalText(ndc.labeler_name),
    productType: redactPersonalText(ndc.product_type),
    route: uniqueStrings(ndc.route ?? []).join(', ') || null,
    dosageForm: redactPersonalText(ndc.dosage_form),
    ndc: recordId,
    sourceUrl: `https://api.fda.gov/drug/ndc.json?search=brand_name:${encodeURIComponent(quoteOpenFdaTerm(query))}`,
    adverseEventCount: await getAdverseEventCount(countTerm, apiKey, userAgent),
  };
}

export async function searchOpenFdaDrugs(
  query: string,
  maxRecords: number,
  apiKey: string | null,
  userAgent: string,
): Promise<ClinicalDrugRecord[]> {
  const records: ClinicalDrugRecord[] = [];
  const labelSearches = [`openfda.brand_name:${quoteOpenFdaTerm(query)}`, `openfda.generic_name:${quoteOpenFdaTerm(query)}`];
  for (const search of labelSearches) {
    if (records.length >= maxRecords) break;
    const labelUrl = new URL(`${API_BASE}/drug/label.json`);
    labelUrl.searchParams.set('search', search);
    labelUrl.searchParams.set('limit', String(Math.min(Math.max(maxRecords - records.length, 1), 100)));
    try {
      const labels = await fetchJson<OpenFdaLabelResponse>(withApiKey(labelUrl, apiKey), { headers: { 'user-agent': userAgent } });
      for (const label of labels.results ?? []) {
        if (records.length >= maxRecords) break;
        const record = await normalizeLabel(label, query, apiKey, userAgent);
        if (record && !records.some((existing) => existing.recordId === record.recordId)) records.push(record);
      }
    } catch {
      // Some terms are not present in label data; NDC is used as a fallback below.
    }
  }

  if (records.length < maxRecords) {
    const ndcSearches = [`brand_name:${quoteOpenFdaTerm(query)}`, `generic_name:${quoteOpenFdaTerm(query)}`];
    for (const search of ndcSearches) {
      if (records.length >= maxRecords) break;
      const ndcUrl = new URL(`${API_BASE}/drug/ndc.json`);
      ndcUrl.searchParams.set('search', search);
      ndcUrl.searchParams.set('limit', String(Math.min(Math.max(maxRecords - records.length, 1), 100)));
      try {
        const ndcs = await fetchJson<OpenFdaNdcResponse>(withApiKey(ndcUrl, apiKey), { headers: { 'user-agent': userAgent } });
        for (const ndc of ndcs.results ?? []) {
          if (records.length >= maxRecords) break;
          const record = await normalizeNdc(ndc, query, apiKey, userAgent);
          if (record && !records.some((existing) => existing.recordId === record.recordId)) records.push(record);
        }
      } catch {
        // Continue with the next openFDA field search.
      }
    }
  }

  return records;
}

function normalizeRecall(recall: OpenFdaRecall, query: string): ClinicalDrugRecord | null {
  const recordId = normalizeText(recall.recall_number);
  const name = redactPersonalText(recall.product_description);
  if (!recordId || !name) return null;

  return {
    source: 'openfda_recalls',
    query,
    recordType: 'drug_recall',
    recordId,
    title: name,
    name,
    status: redactPersonalText(recall.status),
    phase: null,
    studyType: null,
    conditions: [],
    interventions: [],
    genericName: firstText(recall.openfda?.generic_name),
    brandName: firstText(recall.openfda?.brand_name),
    sponsorOrManufacturer: redactPersonalText(recall.recalling_firm) ?? firstText(recall.openfda?.manufacturer_name),
    collaborators: [],
    enrollmentCount: null,
    startDate: null,
    completionDate: null,
    lastUpdateDate: null,
    recallDate: normalizeDate(recall.recall_initiation_date),
    classification: redactPersonalText(recall.classification),
    productType: redactPersonalText(recall.product_type),
    route: uniqueStrings(recall.openfda?.route ?? []).join(', ') || null,
    dosageForm: null,
    ndc: uniqueIdentifiers(recall.openfda?.product_ndc ?? []).join(', ') || null,
    recallReason: redactPersonalText(recall.reason_for_recall),
    adverseEventCount: null,
    locationsSummary: [],
    sourceUrl: `https://api.fda.gov/drug/enforcement.json?search=product_description:${encodeURIComponent(quoteOpenFdaTerm(query))}`,
    attribution: ATTRIBUTION,
    scrapedAt: new Date().toISOString(),
  };
}

export async function searchOpenFdaRecalls(
  query: string,
  maxRecords: number,
  apiKey: string | null,
  userAgent: string,
): Promise<ClinicalDrugRecord[]> {
  const records: ClinicalDrugRecord[] = [];
  const searches = [`product_description:${quoteOpenFdaTerm(query)}`, `reason_for_recall:${quoteOpenFdaTerm(query)}`];
  for (const search of searches) {
    if (records.length >= maxRecords) break;
    const url = new URL(`${API_BASE}/drug/enforcement.json`);
    url.searchParams.set('search', search);
    url.searchParams.set('limit', String(Math.min(Math.max(maxRecords - records.length, 1), 100)));
    try {
      const data = await fetchJson<OpenFdaRecallResponse>(withApiKey(url, apiKey), { headers: { 'user-agent': userAgent } });
      for (const recall of data.results ?? []) {
        if (records.length >= maxRecords) break;
        const record = normalizeRecall(recall, query);
        if (record && !records.some((existing) => existing.recordId === record.recordId)) records.push(record);
      }
    } catch {
      // Continue with the next recall search field.
    }
  }

  return records;
}
