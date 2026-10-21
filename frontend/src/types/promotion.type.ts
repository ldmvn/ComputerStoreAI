export type PromotionType = 'GIFT' | 'INFO';
export type PromotionScope = 'ALL' | 'CATEGORY' | 'PRODUCT';
export type PromotionStatus = 'active' | 'upcoming' | 'expired' | 'disabled';

export type PromotionGiftProduct = { id: number; name: string; price: number };

export type Promotion = {
  id: number;
  name: string;
  displayTitle: string;
  description: string | null;
  conditionText: string | null;
  detailUrl: string | null;
  type: PromotionType;
  scope: PromotionScope;
  sortOrder: number;
  isActive: boolean;
  startAt: string | null;
  endAt: string | null;
  giftProductId: number | null;
  giftProductName: string | null;
  giftQuantity: number | null;
  giftProduct: PromotionGiftProduct | null;
  status: PromotionStatus;
  createdAt: string;
  updatedAt: string;
  _count?: { categories: number; products: number };
};

export type PromotionDetail = Promotion & {
  categoryIds: number[];
  productIds: number[];
};

export type PromotionStats = {
  total: number;
  active: number;
  upcoming: number;
  expired: number;
  disabled: number;
};

export type PromotionListResult = {
  promotions: Promotion[];
  total: number;
  page: number;
  limit: number;
};

export type PromotionInput = {
  name: string;
  displayTitle: string;
  description?: string | null;
  conditionText?: string | null;
  detailUrl?: string | null;
  type: PromotionType;
  scope: PromotionScope;
  sortOrder?: number;
  isActive?: boolean;
  startAt?: string | null;
  endAt?: string | null;
  giftProductId?: number | null;
  giftProductName?: string | null;
  giftQuantity?: number | null;
  categoryIds?: number[];
  productIds?: number[];
};

export type PromotionCategoryOption = { id: number; name: string; parentId: number | null };
export type PromotionProductOption = { id: number; name: string; price: number; images: { imageUrl: string }[] };
