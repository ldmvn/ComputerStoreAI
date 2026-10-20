import type { ProductHighlightSpec, ProductSpecification } from './product.type';

export type SectionProduct = {
  slug?: string;
  sku?: string;
  id: number;
  name: string;
  price: number;
  originalPrice?: number | null;
  isActive?: boolean;
  stockQuantity?: number;
  brandId?: number | null;
  categoryId?: number | null;
  attributeValueIds?: number[];
  specifications?: ProductSpecification[];
  highlightSpecs?: ProductHighlightSpec[];
  primaryImage?: string | null;
  sortOrder?: number;
};

export type QuickFilterTab = {
  id: string;
  label: string;
  filterType: 'ALL' | 'BRAND' | 'CATEGORY' | 'ATTRIBUTE';
  sortOrder: number;
  brandId?: number;
  brandSlug?: string | null;
  categoryId?: number;
  categorySlug?: string | null;
  attributeValueId?: number;
  attributeId?: number | null;
  attributeSlug?: string | null;
};

export type QuickFilterConfig = {
  enabled: boolean;
  tabs: QuickFilterTab[];
};

export type ProductSection = {
  id: number;
  name: string;
  slug: string;
  subtitle: string | null;
  viewAllUrl: string | null;
  sortOrder: number;
  isActive: boolean;
  showHighlightSpecs: boolean;
  quickFilterConfig: QuickFilterConfig | null;
  createdAt: string;
  updatedAt: string;
  products: SectionProduct[];
};

export type ProductSectionInput = {
  name: string;
  slug: string;
  subtitle: string;
  viewAllUrl: string;
  sortOrder: number;
  isActive: boolean;
  showHighlightSpecs: boolean;
};
