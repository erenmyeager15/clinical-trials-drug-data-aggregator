import type { ClinicalDrugRecord, CtGovSearchResponse, CtGovStudy } from './types.js';
import {
  fetchJson,
  firstText,
  normalizeDate,
  normalizeText,
  numberOrNull,
  organizationText,
  redactPersonalText,
  uniqueStrings,
} from './utils.js';

const API_BASE = 'https://clinicaltrials.gov/api/v2';
const ATTRIBUTION = 'ClinicalTrials.gov public study data from the U.S. National Library of Medicine.';

function phaseMatches(studyPhase: string | null, inputPhase: string | null): boolean {
  if (!inputPhase || inputPhase === 'all') return true;
  if (!studyPhase) return false;
  return studyPhase.toLowerCase().includes(inputPhase.toLowerCase());
}

function statusMatches(studyStatus: string | null, inputStatus: string | null): boolean {
  if (!inputStatus || inputStatus === 'all') return true;
  if (!studyStatus) return false;
  return studyStatus.toLowerCase() === inputStatus.toLowerCase();
}

function normalizeTrial(study: CtGovStudy, query: string | null): ClinicalDrugRecord | null {
  const section = study.protocolSection;
  const id = normalizeText(section?.identificationModule?.nctId);
  if (!id) return null;
  const briefTitle = redactPersonalText(section?.identificationModule?.briefTitle);
  const officialTitle = redactPersonalText(section?.identificationModule?.officialTitle);
  const title = officialTitle ?? briefTitle;
  if (!title) return null;

  const interventions = (section?.armsInterventionsModule?.interventions ?? []).slice(0, 20).map((intervention) => ({
    name: redactPersonalText(intervention.name),
    type: redactPersonalText(intervention.type),
  }));
  const locations = (section?.contactsLocationsModule?.locations ?? []).slice(0, 25).map((location) => ({
    facility: organizationText(location.facility),
    city: redactPersonalText(location.city),
    country: redactPersonalText(location.country),
  }));

  return {
    source: 'clinical_trials',
    query,
    recordType: 'trial',
    recordId: id,
    title,
    name: briefTitle,
    status: redactPersonalText(section?.statusModule?.overallStatus),
    phase: uniqueStrings(section?.designModule?.phases ?? []).join(', ') || null,
    studyType: redactPersonalText(section?.designModule?.studyType),
    conditions: uniqueStrings(section?.conditionsModule?.conditions ?? []),
    interventions,
    genericName: null,
    brandName: null,
    sponsorOrManufacturer: organizationText(section?.sponsorCollaboratorsModule?.leadSponsor?.name),
    collaborators: (section?.sponsorCollaboratorsModule?.collaborators ?? [])
      .map((collaborator) => organizationText(collaborator.name))
      .filter((collaborator): collaborator is string => collaborator !== null),
    enrollmentCount: numberOrNull(section?.designModule?.enrollmentInfo?.count),
    startDate: normalizeDate(section?.statusModule?.startDateStruct?.date),
    completionDate: normalizeDate(section?.statusModule?.completionDateStruct?.date),
    lastUpdateDate: normalizeDate(section?.statusModule?.lastUpdateSubmitDate),
    recallDate: null,
    classification: null,
    productType: null,
    route: null,
    dosageForm: null,
    ndc: null,
    recallReason: null,
    adverseEventCount: null,
    locationsSummary: locations,
    sourceUrl: `https://clinicaltrials.gov/study/${encodeURIComponent(id)}`,
    attribution: ATTRIBUTION,
    scrapedAt: new Date().toISOString(),
  };
}

export async function searchClinicalTrials(
  query: string,
  status: string | null,
  phase: string | null,
  maxRecords: number,
  userAgent: string,
): Promise<ClinicalDrugRecord[]> {
  const records: ClinicalDrugRecord[] = [];
  let nextPageToken: string | null = null;
  const pageSize = Math.min(Math.max(maxRecords * 3, 25), 100);

  for (let page = 1; page <= 20 && records.length < maxRecords; page += 1) {
    const url = new URL(`${API_BASE}/studies`);
    url.searchParams.set('query.term', query);
    url.searchParams.set('pageSize', String(pageSize));
    if (nextPageToken) url.searchParams.set('pageToken', nextPageToken);

    const data = await fetchJson<CtGovSearchResponse>(url.toString(), {
      headers: { 'user-agent': userAgent },
    });

    for (const study of data.studies ?? []) {
      if (records.length >= maxRecords) break;
      const record = normalizeTrial(study, query);
      if (!record) continue;
      if (!statusMatches(record.status, status)) continue;
      if (!phaseMatches(record.phase, phase)) continue;
      records.push(record);
    }

    nextPageToken = firstText(data.nextPageToken);
    if (!nextPageToken) break;
  }

  return records;
}
