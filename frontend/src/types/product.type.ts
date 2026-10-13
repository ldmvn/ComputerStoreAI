export type ProductImage = { id: number; imageUrl: string; altText: string; sortOrder: number; isPrimary: boolean };
export type ProductSpecification = { id?: number; name: string; value: string; sortOrder?: number; source?: 'ATTRIBUTE' | 'CUSTOM' };
export type ProductHighlightSpec = { id?: number; content: string; sortOrder?: number };
export type ProductAttribute = { id: number; name: string; slug: string; type: 'SELECT' | 'MULTI_SELECT' | 'TEXT' | 'NUMBER' | 'BOOLEAN'; unit?: string | null; sortOrder: number; valueIds: number[]; values: string[] };
export type ProductCustomSpecification = { id?: number; name: string; value: string; sortOrder: number };
export type ProductStockStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
export type ProductStatistics = { ratingAverage: number | null; reviewCount: number; commentCount: number; viewCount: number; distribution?: { 1: number; 2: number; 3: number; 4: number; 5: number } };

export type ProductReviewAuthor = { id: number; fullName: string; avatarUrl: string | null };
export type ProductReview = {
  id: number;
  productId: number;
  rating: number;
  content: string;
  images: string[];
  createdAt: string;
  author: ProductReviewAuthor | null;
};
export type ProductReviewSummary = { ratingAverage: number | null; distribution: { 1: number; 2: number; 3: number; 4: number; 5: number } };
export type ProductReviewListResponse = { items: ProductReview[]; meta: { page: number; limit: number; total: number; totalPages: number }; summary: ProductReviewSummary };

export type Product = {
  id: number;
  name: string;
  slug: string;
  sku: string;
  category: string | null;
  categoryId: number | null;
  categoryInfo?: { id: number; name: string; slug: string } | null;
  brandId: number | null;
  brand: string | null;
  brandInfo: { id: number; name: string; slug: string; logoUrl: string | null } | null;
  shortDescription: string | null;
  description?: string | null;
  price: number;
  originalPrice: number | null;
  costPrice?: number | null;
  stockQuantity: number;
  lowStockThreshold: number;
  isActive: boolean;
  isDeleted: boolean;
  stockStatus: ProductStockStatus;
  primaryImage: string | null;
  images?: ProductImage[];
  specifications?: ProductSpecification[];
  customSpecifications?: ProductCustomSpecification[];
  highlightSpecs?: ProductHighlightSpec[];
  productAttributes?: ProductAttribute[];
  ratingAverage?: number | null;
  reviewCount?: number;
  commentCount?: number;
  viewCount?: number;
  createdAt: string;
  updatedAt: string;
};

export type ProductListResponse = {
  filters?: { brand: { id: number; name: string; slug: string } | null };
  products: Product[];
  meta: { page: number; limit: number; total: number; totalPages: number };
  stats: { total: number; active: number; outOfStock: number; inactive: number };
};
