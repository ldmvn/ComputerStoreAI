export type BuildSlot = {
  id: number;
  slug: string;
  name: string;
  isRequired: boolean;
  minCount: number;
  maxCount: number;
  badgeText: string | null;
  exclusiveGroup: string | null;
  categories: { id: number; slug: string; name: string }[];
};

export type BuildMeta = {
  manualBuildEnabled: boolean;
  inStockOnly: boolean;
};

export type BuildSlotsResponse = {
  data: BuildSlot[];
  meta: BuildMeta;
  message: string;
};

export type BuildPcProduct = {
  id: number;
  slug: string;
  sku: string;
  name: string;
  price: number;
  stockQuantity: number;
  inStock: boolean;
  primaryImage: string | null;
  brand: { id: number; name: string } | null;
  warranty: string | null;
  compat?: 'ok' | 'unknown';
};

export type BuildPcProductMeta = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  compatApplicable?: boolean;
  hiddenByCompat?: number;
};

export type BuildPcProductsResponse = {
  data: BuildPcProduct[];
  meta: BuildPcProductMeta;
  message: string;
};

export type BuildPcFacetBrand = { id: number; name: string; count: number };
export type BuildPcFacetAttrValue = { id: number; value: string; count: number };
export type BuildPcFacetAttr = {
  id: number;
  slug: string;
  name: string;
  type: string;
  values: BuildPcFacetAttrValue[];
};
export type BuildPcFacets = {
  brands: BuildPcFacetBrand[];
  attributes: BuildPcFacetAttr[];
  priceRange: { min: number | null; max: number | null };
};

export type BuildPcFacetsResponse = {
  data: BuildPcFacets;
  meta: Record<string, never>;
  message: string;
};

export type BuildPcFilters = {
  q: string;
  brandId: number | undefined;
  minPrice: number | undefined;
  maxPrice: number | undefined;
  attrFilters: Record<string, string>;
  sort: 'default' | 'price_asc' | 'price_desc' | 'name_asc';
  page: number;
  compatOnly?: boolean;
  selected?: string;
};

export type PickedItem = {
  product: BuildPcProduct;
  quantity: number;
};

// ── Validate ──────────────────────────────────────────────────────────────

export type ValidateRequestItem = {
  slot: string;
  productId: number;
  quantity: number;
};

export type ValidateRequest = {
  items: ValidateRequestItem[];
};

export type ValidateItem = {
  slot: string;
  productId: number;
  slug: string;
  sku: string;
  name: string;
  price: number;
  quantity: number;
  lineTotal: number;
  stockQuantity: number;
  primaryImage: string | null;
};

export type CompatibilityIssue = {
  code: string;
  level: 'error' | 'warning' | 'info';
  slots: string[];
  message: string;
};

export type MissingItem = {
  slots: string[];
  message: string;
};

export type ValidateData = {
  items: ValidateItem[];
  total: number;
  issues: CompatibilityIssue[];
  missing: MissingItem[];
  canAddToCart: boolean;
  isComplete: boolean;
};

export type ValidateResponse = {
  data: ValidateData;
  meta: Record<string, never>;
  message: string;
};

// ── Save & share ──────────────────────────────────────────────────────────────

export type SaveBuildRequest = {
  items: ValidateRequestItem[];
};

export type SaveBuildData = {
  shareCode: string;
  path: string;
};

export type SaveBuildResponse = {
  data: SaveBuildData;
  message: string;
};

export type LoadBuildUnavailable = {
  slot: string;
  productName: string;
  reason: 'ngừng bán' | 'đã xóa';
};

export type LoadBuildData = {
  shareCode: string;
  createdAt: string;
  items: ValidateItem[];
  unavailable: LoadBuildUnavailable[];
  total: number;
  issues: CompatibilityIssue[];
  missing: MissingItem[];
  canAddToCart: boolean;
  isComplete: boolean;
};

export type LoadBuildResponse = {
  data: LoadBuildData;
  meta: Record<string, never>;
  message: string;
};
