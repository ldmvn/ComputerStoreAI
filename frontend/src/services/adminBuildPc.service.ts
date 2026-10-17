import { apiRequest } from './http.client';

const root = '/admin/build-pc';

// ── Types ────────────────────────────────────────────────────────────────────

export type BuildPcSummary = {
  totalBuilds: number;
  avgValue: number;
  totalValue: number;
  topComponents: { productId: number; name: string; slug: string | null; pickCount: number }[];
};

export type BuildPcGroupRef = { id: number; slug: string; name: string };

export type CompatibilityRule = {
  id: number;
  name: string;
  description: string | null;
  ruleType: 'ATTR_MATCH' | 'ATTR_SUBSET' | 'ATTR_LTE';
  groupAId: number;
  attributeASlug: string;
  groupBId: number;
  attributeBSlug: string;
  config: { severity?: 'error' | 'warning' } | null;
  errorMessage: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  groupA: BuildPcGroupRef | null;
  groupB: BuildPcGroupRef | null;
};

export type CodeRule = { code: string; name: string; slots: string[] };

export type RulesData = { rules: CompatibilityRule[]; groups: BuildPcGroupRef[]; codeRules: CodeRule[] };

export type PresetItem = {
  id: number;
  groupId: number;
  productId: number | null;
  group: BuildPcGroupRef;
  product: { id: number; name: string; slug: string; price: number; isActive: boolean; isDeleted: boolean } | null;
};

export type Preset = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  useCase: string | null;
  budgetMin: number | null;
  budgetMax: number | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  items: PresetItem[];
};

export type AttributeCoverageRow = {
  label: string;
  attributeSlug: string;
  categorySlug: string;
  total: number;
  withData: number;
  missing: number;
};

export type MissingAttributeProduct = { id: number; name: string; slug: string; sku: string };

export type BuildSession = {
  id: number;
  shareCode: string;
  user: { id: number; fullName: string; email: string } | null;
  total: number;
  itemCount: number;
  createdAt: string;
  hasUnavailableItems: boolean;
};

export type BuildSessionDetail = {
  id: number;
  shareCode: string;
  user: { id: number; fullName: string; email: string } | null;
  createdAt: string;
  total: number;
  items: {
    groupSlug: string;
    groupName: string;
    product: { id: number; name: string; slug: string; price: number; isActive: boolean; isDeleted: boolean; stockQuantity: number };
    quantity: number;
  }[];
  compatibility: {
    issues: { code: string; level: string; slots: string[]; message: string }[];
    missing: { slots: string[]; message: string }[];
  };
};

export type DataIssues = {
  missingAttributesTotal: number;
  attributeCoverage: AttributeCoverageRow[];
  rulesWithMissingAttribute: { id: number; name: string; attributeASlug: string; attributeBSlug: string }[];
  presetsWithHiddenProducts: { id: number; name: string; hiddenCount: number }[];
  buildsWithUnavailableItems: { id: number; shareCode: string }[];
};

function buildQuery(params: Record<string, string | number | undefined>) {
  const q = Object.entries(params).filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join('&');
  return q ? `?${q}` : '';
}

// ── Summary ──────────────────────────────────────────────────────────────────

export async function getBuildPcSummary(token: string | null): Promise<BuildPcSummary> {
  const { summary } = await apiRequest<{ summary: BuildPcSummary }>(`${root}/summary`, {}, token);
  return summary;
}

export async function getDataIssues(token: string | null): Promise<DataIssues> {
  const { issues } = await apiRequest<{ issues: DataIssues }>(`${root}/data-issues`, {}, token);
  return issues;
}

// ── Rules ────────────────────────────────────────────────────────────────────

export async function getRules(token: string | null): Promise<RulesData> {
  return apiRequest<RulesData>(`${root}/rules`, {}, token);
}

export type RuleInput = {
  name: string; description?: string; ruleType: string;
  groupAId: number; attributeASlug: string; groupBId: number; attributeBSlug: string;
  severity?: 'error' | 'warning'; errorMessage?: string; isActive?: boolean; sortOrder?: number;
};

export async function createRule(token: string | null, data: RuleInput): Promise<CompatibilityRule> {
  const { rule } = await apiRequest<{ rule: CompatibilityRule }>(`${root}/rules`, { method: 'POST', body: JSON.stringify(data) }, token);
  return rule;
}

export async function updateRule(token: string | null, id: number, data: RuleInput): Promise<CompatibilityRule> {
  const { rule } = await apiRequest<{ rule: CompatibilityRule }>(`${root}/rules/${id}`, { method: 'PUT', body: JSON.stringify(data) }, token);
  return rule;
}

export async function deleteRule(token: string | null, id: number): Promise<void> {
  await apiRequest(`${root}/rules/${id}`, { method: 'DELETE' }, token);
}

// ── Presets ──────────────────────────────────────────────────────────────────

export async function getPresets(token: string | null): Promise<Preset[]> {
  const { presets } = await apiRequest<{ presets: Preset[] }>(`${root}/presets`, {}, token);
  return presets;
}

export type PresetInput = {
  name: string; slug?: string; description?: string; useCase?: string;
  budgetMin?: number | null; budgetMax?: number | null; isActive?: boolean; sortOrder?: number;
  items?: { groupId: number; productId: number | null }[];
};

export async function createPreset(token: string | null, data: PresetInput): Promise<Preset> {
  const { preset } = await apiRequest<{ preset: Preset }>(`${root}/presets`, { method: 'POST', body: JSON.stringify(data) }, token);
  return preset;
}

export async function updatePreset(token: string | null, id: number, data: PresetInput): Promise<Preset> {
  const { preset } = await apiRequest<{ preset: Preset }>(`${root}/presets/${id}`, { method: 'PUT', body: JSON.stringify(data) }, token);
  return preset;
}

export async function deletePreset(token: string | null, id: number): Promise<void> {
  await apiRequest(`${root}/presets/${id}`, { method: 'DELETE' }, token);
}

// ── Attribute coverage ───────────────────────────────────────────────────────

export async function getAttributeCoverage(token: string | null): Promise<AttributeCoverageRow[]> {
  const { coverage } = await apiRequest<{ coverage: AttributeCoverageRow[] }>(`${root}/attributes/coverage`, {}, token);
  return coverage;
}

export async function getMissingAttributeProducts(
  token: string | null, category: string, attribute: string, params: { page?: number; limit?: number } = {}
): Promise<{ products: MissingAttributeProduct[]; total: number; page: number; limit: number }> {
  return apiRequest(`${root}/attributes/missing-products${buildQuery({ category, attribute, ...params })}`, {}, token);
}

// ── Build sessions ────────────────────────────────────────────────────────────

export type SessionFilters = { page?: number; limit?: number; from?: string; to?: string; userId?: number; minPrice?: number; maxPrice?: number };

export async function getBuildSessions(token: string | null, filters: SessionFilters = {}): Promise<{ sessions: BuildSession[]; total: number; page: number; limit: number }> {
  return apiRequest(`${root}/sessions${buildQuery(filters as Record<string, string | number>)}`, {}, token);
}

export async function getBuildSessionDetail(token: string | null, id: number): Promise<BuildSessionDetail> {
  const { session } = await apiRequest<{ session: BuildSessionDetail }>(`${root}/sessions/${id}`, {}, token);
  return session;
}
