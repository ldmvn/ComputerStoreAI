import { apiRequest } from './http.client';

export type AttributeType = 'SELECT' | 'MULTI_SELECT' | 'TEXT' | 'NUMBER' | 'BOOLEAN';

export type AttributeValue = {
  id: number; attributeId: number; value: string; sortOrder: number; isActive: boolean;
};

export type CategoryLink = {
  id: number; name: string; slug: string;
  sortOrder: number;
  isRequired: boolean;
  showInForm: boolean;
  showInDetail: boolean;
  usedInFilter: boolean;
  requiredForBuildPC: boolean;
};

export type GroupRef = { id: number; name: string; slug: string; sortOrder: number };

export type Attribute = {
  id: number; name: string; slug: string; type: AttributeType; sortOrder: number; isActive: boolean;
  unit?: string | null;
  description?: string | null;
  showInDetail: boolean;
  usedInFilter: boolean;
  usedInBuildPC: boolean;
  values: AttributeValue[];
  categories: CategoryLink[];
  groups: GroupRef[];
  _count?: { productValues: number; menuItems: number };
};

export type AttributeInput = {
  name: string; slug: string; type: AttributeType; sortOrder: number; isActive: boolean;
  unit?: string; description?: string;
  showInDetail?: boolean; usedInFilter?: boolean; usedInBuildPC?: boolean;
};

export type CategoryLinkInput = {
  categoryId: number; sortOrder?: number;
  isRequired?: boolean; showInForm?: boolean; showInDetail?: boolean;
  usedInFilter?: boolean; requiredForBuildPC?: boolean;
};

export type AttributeGroup = {
  id: number; name: string; slug: string;
  description?: string | null; icon?: string | null;
  sortOrder: number; isActive: boolean;
  createdAt: string; updatedAt: string;
  members: { id: number; name: string; slug: string; type: AttributeType; isActive: boolean; sortOrder: number }[];
  _count?: { members: number };
};

export type AttributeGroupInput = {
  name: string; slug: string;
  description?: string; icon?: string;
  sortOrder?: number; isActive?: boolean;
};

const root = '/admin/attributes';

// ── Attribute ─────────────────────────────────────────────────────────────────
export const getAttributes = (token: string | null, signal?: AbortSignal) =>
  apiRequest<{ attributes: Attribute[] }>(root, { signal }, token);

// Returned by /admin/attributes/category/:id and /attributes/category/:slug —
// flat shape with per-category flags merged at root level.
export type CategoryBoundAttribute = {
  id: number; name: string; slug: string; type: AttributeType; sortOrder: number; isActive: boolean;
  unit?: string | null;
  description?: string | null;
  showInDetail: boolean;
  usedInFilter: boolean;
  usedInBuildPC: boolean;
  values: AttributeValue[];
  categorySortOrder: number;
  isRequired: boolean;
  showInForm: boolean;
  requiredForBuildPC: boolean;
};

export const getCategoryAttributes = (token: string | null, categoryId: number, signal?: AbortSignal) =>
  apiRequest<{ attributes: CategoryBoundAttribute[] }>(`${root}/category/${categoryId}`, { signal }, token);

export const getPublicCategoryAttributes = (categorySlug: string, signal?: AbortSignal) =>
  apiRequest<{ attributes: CategoryBoundAttribute[] }>(`/attributes/category/${encodeURIComponent(categorySlug)}`, { signal });

export const createAttribute = (token: string | null, body: AttributeInput) =>
  apiRequest<{ attribute: Attribute }>(`${root}`, { method: 'POST', body: JSON.stringify(body) }, token);

export const updateAttribute = (token: string | null, id: number, body: AttributeInput) =>
  apiRequest<{ attribute: Attribute }>(`${root}/${id}`, { method: 'PUT', body: JSON.stringify(body) }, token);

export const deleteAttribute = (token: string | null, id: number) =>
  apiRequest(`${root}/${id}`, { method: 'DELETE' }, token);

export const setAttributeStatus = (token: string | null, id: number, isActive: boolean) =>
  apiRequest<{ attribute: Attribute }>(`${root}/${id}/status`, { method: 'PATCH', body: JSON.stringify({ isActive }) }, token);

export const setAttributeOrder = (token: string | null, id: number, sortOrder: number) =>
  apiRequest<{ attribute: Attribute }>(`${root}/${id}/order`, { method: 'PATCH', body: JSON.stringify({ sortOrder }) }, token);

// Backward-compat: plain id list
export const setAttributeCategories = (token: string | null, id: number, categoryIds: number[]) =>
  apiRequest<{ attribute: Attribute }>(`${root}/${id}/categories`, { method: 'PUT', body: JSON.stringify({ categoryIds }) }, token);

// Rich: full per-category flag objects
export const setAttributeCategoryLinks = (token: string | null, id: number, links: CategoryLinkInput[]) =>
  apiRequest<{ attribute: Attribute }>(`${root}/${id}/category-links`, { method: 'PUT', body: JSON.stringify({ links }) }, token);

// ── AttributeValue ────────────────────────────────────────────────────────────
export const createAttributeValue = (token: string | null, id: number, body: Omit<AttributeValue, 'id' | 'attributeId'>) =>
  apiRequest(`${root}/${id}/values`, { method: 'POST', body: JSON.stringify(body) }, token);

export const updateAttributeValue = (token: string | null, id: number, body: Omit<AttributeValue, 'id' | 'attributeId'>) =>
  apiRequest(`${root}/values/${id}`, { method: 'PUT', body: JSON.stringify(body) }, token);

export const deleteAttributeValue = (token: string | null, id: number) =>
  apiRequest(`${root}/values/${id}`, { method: 'DELETE' }, token);

export const setAttributeValueStatus = (token: string | null, id: number, isActive: boolean) =>
  apiRequest(`${root}/values/${id}/status`, { method: 'PATCH', body: JSON.stringify({ isActive }) }, token);

// ── AttributeGroup ────────────────────────────────────────────────────────────
export const getGroups = (token: string | null, signal?: AbortSignal) =>
  apiRequest<{ groups: AttributeGroup[] }>(`${root}/groups`, { signal }, token);

export const createGroup = (token: string | null, body: AttributeGroupInput) =>
  apiRequest<{ group: AttributeGroup }>(`${root}/groups`, { method: 'POST', body: JSON.stringify(body) }, token);

export const updateGroup = (token: string | null, id: number, body: AttributeGroupInput) =>
  apiRequest<{ group: AttributeGroup }>(`${root}/groups/${id}`, { method: 'PUT', body: JSON.stringify(body) }, token);

export const deleteGroup = (token: string | null, id: number) =>
  apiRequest(`${root}/groups/${id}`, { method: 'DELETE' }, token);

export const setGroupStatus = (token: string | null, id: number, isActive: boolean) =>
  apiRequest<{ group: AttributeGroup }>(`${root}/groups/${id}/status`, { method: 'PATCH', body: JSON.stringify({ isActive }) }, token);

export const setGroupOrder = (token: string | null, id: number, sortOrder: number) =>
  apiRequest<{ group: AttributeGroup }>(`${root}/groups/${id}/order`, { method: 'PATCH', body: JSON.stringify({ sortOrder }) }, token);

export const setGroupMembers = (token: string | null, id: number, members: { attributeId: number; sortOrder?: number }[]) =>
  apiRequest<{ group: AttributeGroup }>(`${root}/groups/${id}/members`, { method: 'PUT', body: JSON.stringify({ members }) }, token);
