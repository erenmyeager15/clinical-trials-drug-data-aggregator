import { Actor, log } from 'apify';
import { searchClinicalTrials } from './clinicalTrials.js';
import { searchOpenFdaDrugs, searchOpenFdaRecalls } from './openFda.js';
import type { ActorInput, ClinicalDrugRecord, NormalizedInput, SourceName } from './types.js';
import { normalizeText, uniqueStrings } from './utils.js';

const CHARGE_EVENT = 'trial-record-scraped';
const DEFAULT_USER_AGENT = 'ClinicalTrialsDrugDataAggregator/1.0 public-data-research';
const DEFAULT_SOURCES: SourceName[] = ['clinical_trials', 'openfda_drugs', 'openfda_recalls'];
const SOURCE_NAMES = new Set<SourceName>(DEFAULT_SOURCES);

function normalizeSource(value: unknown): SourceName | null {
  const text = normalizeText(value);
  if (!text) return null;
  if (text === 'both' || text === 'all') return null;
  return SOURCE_NAMES.has(text as SourceName) ? (text as SourceName) : null;
}

function normalizeList(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  return uniqueStrings(values).filter((value) => value.length > 0);
}

function normalizeInput(rawInput: ActorInput & { source?: SourceName | 'all' | 'both' }): NormalizedInput {
  const sourcesFromArray = Array.isArray(rawInput.sources)
    ? rawInput.sources.map(normalizeSource).filter((source): source is SourceName => source !== null)
    : [];
  const legacySource = normalizeSource(rawInput.source);
  const sources = uniqueStrings([...sourcesFromArray, legacySource]).filter((source): source is SourceName =>
    SOURCE_NAMES.has(source as SourceName),
  );

  const query = normalizeText(rawInput.query);
  const conditions = normalizeList(rawInput.conditions);
  const drugNames = normalizeList(rawInput.drugNames);
  const queries = query ? [query] : [];
  const hasAnySearchTerm = queries.length > 0 || conditions.length > 0 || drugNames.length > 0;
  const maxResults = Math.min(Math.max(Number(rawInput.maxResults ?? 10), 1), 1000);
  const openFdaApiKey = normalizeText(rawInput.openFdaApiKey ?? process.env.OPENFDA_API_KEY);
  const userAgent = normalizeText(rawInput.userAgent) ?? DEFAULT_USER_AGENT;

  return {
    sources: sources.length > 0 ? sources : DEFAULT_SOURCES,
    queries: hasAnySearchTerm ? queries : ['aspirin'],
    conditions,
    drugNames,
    status: normalizeText(rawInput.status) ?? 'all',
    phase: normalizeText(rawInput.phase) ?? 'all',
    maxResults,
    openFdaApiKey,
    userAgent,
  };
}

function termsForSource(input: NormalizedInput, source: SourceName): string[] {
  if (source === 'clinical_trials') {
    return uniqueStrings([...input.queries, ...input.conditions, ...input.drugNames]);
  }

  const drugTerms = uniqueStrings([...input.drugNames, ...input.queries]);
  return drugTerms.length > 0 ? drugTerms : input.queries;
}

function hasForbiddenField(record: ClinicalDrugRecord): boolean {
  const forbidden = /(contact|investigator|official|patient|email|phone)/i;
  return Object.keys(record).some((key) => forbidden.test(key));
}

async function pushAndCharge(record: ClinicalDrugRecord): Promise<boolean> {
  if (hasForbiddenField(record)) {
    log.warning(`Skipped record with forbidden field name: ${record.recordId}`);
    return true;
  }

  await Actor.pushData(record);
  const chargeResult = await Actor.charge({ eventName: CHARGE_EVENT });
  if (chargeResult.eventChargeLimitReached) {
    log.warning('User spending limit reached after saving the last clean record. Stopping further collection.');
    return false;
  }

  return true;
}

await Actor.init();

try {
  const input = normalizeInput(((await Actor.getInput<ActorInput>()) ?? {}) as ActorInput);
  log.info('Starting Clinical Trials & Drug Data Aggregator', {
    sources: input.sources,
    maxResults: input.maxResults,
    status: input.status,
    phase: input.phase,
  });

  const seenIds = new Set<string>();
  let savedCount = 0;
  let shouldContinue = true;
  const perSourceBudget = Math.max(1, Math.ceil(input.maxResults / input.sources.length));

  for (const source of input.sources) {
    if (!shouldContinue || savedCount >= input.maxResults) break;

    let sourceSaved = 0;
    const terms = termsForSource(input, source);
    for (const term of terms) {
      if (!shouldContinue || sourceSaved >= perSourceBudget || savedCount >= input.maxResults) break;

      const remaining = Math.min(perSourceBudget - sourceSaved, input.maxResults - savedCount);
      let records: ClinicalDrugRecord[] = [];

      try {
        if (source === 'clinical_trials') {
          records = await searchClinicalTrials(term, input.status, input.phase, remaining, input.userAgent);
        } else if (source === 'openfda_drugs') {
          records = await searchOpenFdaDrugs(term, remaining, input.openFdaApiKey, input.userAgent);
        } else {
          records = await searchOpenFdaRecalls(term, remaining, input.openFdaApiKey, input.userAgent);
        }
      } catch (error) {
        log.warning(`Source query failed for ${source}:${term}`, { error: (error as Error).message });
        continue;
      }

      for (const record of records) {
        if (savedCount >= input.maxResults || sourceSaved >= perSourceBudget) break;
        const dedupeKey = `${record.source}:${record.recordId}`;
        if (seenIds.has(dedupeKey)) continue;
        seenIds.add(dedupeKey);

        shouldContinue = await pushAndCharge(record);
        savedCount += 1;
        sourceSaved += 1;
        if (!shouldContinue) break;
      }
    }
  }

  log.info(`Finished. Saved ${savedCount} clean non-personal records.`);
} finally {
  await Actor.exit();
}
