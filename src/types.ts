export type SourceName = 'clinical_trials' | 'openfda_drugs' | 'openfda_recalls';
export type RecordType = 'trial' | 'drug_label' | 'drug_recall';

export interface ActorInput {
  sources?: SourceName[];
  query?: string;
  conditions?: string[];
  drugNames?: string[];
  status?: string;
  phase?: string;
  maxResults?: number;
  openFdaApiKey?: string;
  userAgent?: string;
  proxyConfiguration?: Record<string, unknown>;
}

export interface NormalizedInput {
  sources: SourceName[];
  queries: string[];
  conditions: string[];
  drugNames: string[];
  status: string | null;
  phase: string | null;
  maxResults: number;
  openFdaApiKey: string | null;
  userAgent: string;
}

export interface InterventionSummary {
  name: string | null;
  type: string | null;
}

export interface LocationSummary {
  facility: string | null;
  city: string | null;
  country: string | null;
}

export interface ClinicalDrugRecord {
  source: SourceName;
  query: string | null;
  recordType: RecordType;
  recordId: string;
  title: string | null;
  name: string | null;
  status: string | null;
  phase: string | null;
  studyType: string | null;
  conditions: string[];
  interventions: InterventionSummary[];
  genericName: string | null;
  brandName: string | null;
  sponsorOrManufacturer: string | null;
  collaborators: string[];
  enrollmentCount: number | null;
  startDate: string | null;
  completionDate: string | null;
  lastUpdateDate: string | null;
  recallDate: string | null;
  classification: string | null;
  productType: string | null;
  route: string | null;
  dosageForm: string | null;
  ndc: string | null;
  recallReason: string | null;
  adverseEventCount: number | null;
  locationsSummary: LocationSummary[];
  sourceUrl: string | null;
  attribution: string;
  scrapedAt: string;
}

export interface CtGovSearchResponse {
  studies?: CtGovStudy[];
  nextPageToken?: string;
}

export interface CtGovStudy {
  protocolSection?: {
    identificationModule?: {
      nctId?: string;
      briefTitle?: string;
      officialTitle?: string;
    };
    statusModule?: {
      overallStatus?: string;
      startDateStruct?: { date?: string };
      completionDateStruct?: { date?: string };
      lastUpdateSubmitDate?: string;
    };
    designModule?: {
      studyType?: string;
      phases?: string[];
      enrollmentInfo?: { count?: number };
    };
    conditionsModule?: {
      conditions?: string[];
    };
    armsInterventionsModule?: {
      interventions?: Array<{ type?: string; name?: string }>;
    };
    sponsorCollaboratorsModule?: {
      leadSponsor?: { name?: string };
      collaborators?: Array<{ name?: string }>;
    };
    contactsLocationsModule?: {
      locations?: Array<{ facility?: string; city?: string; country?: string }>;
    };
  };
}

export interface OpenFdaLabelResponse {
  results?: OpenFdaLabel[];
  meta?: { results?: { total?: number } };
}

export interface OpenFdaLabel {
  id?: string;
  set_id?: string;
  openfda?: {
    brand_name?: string[];
    generic_name?: string[];
    manufacturer_name?: string[];
    product_type?: string[];
    route?: string[];
    product_ndc?: string[];
  };
  dosage_and_administration?: string[];
}

export interface OpenFdaNdcResponse {
  results?: OpenFdaNdc[];
}

export interface OpenFdaNdc {
  product_ndc?: string;
  brand_name?: string;
  generic_name?: string;
  labeler_name?: string;
  product_type?: string;
  route?: string[];
  dosage_form?: string;
}

export interface OpenFdaRecallResponse {
  results?: OpenFdaRecall[];
}

export interface OpenFdaRecall {
  recall_number?: string;
  product_description?: string;
  status?: string;
  classification?: string;
  recall_initiation_date?: string;
  reason_for_recall?: string;
  recalling_firm?: string;
  product_type?: string;
  openfda?: {
    brand_name?: string[];
    generic_name?: string[];
    manufacturer_name?: string[];
    product_ndc?: string[];
    route?: string[];
  };
}

export interface OpenFdaCountResponse {
  meta?: {
    results?: {
      total?: number;
    };
  };
}
