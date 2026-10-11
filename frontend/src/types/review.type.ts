export interface ReviewProduct {
  id: number;
  name: string;
  slug: string;
  imageUrl: string | null;
}

export interface MyReview {
  id: number;
  rating: number;
  content: string;
  images: string[];
  isPublished: boolean;
  createdAt: string;
  product: ReviewProduct;
}

export interface MyReviewsResponse {
  reviews: MyReview[];
  total: number;
  page: number;
  limit: number;
  publishedCount: number;
  pendingCount: number;
}
