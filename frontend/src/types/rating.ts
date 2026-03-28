/**
 * TypeScript types for course ratings and reviews.
 */
export interface Rating {
  id: string;
  user_id: string;
  course_id: string;
  rating: number;
  review: string | null;
  user_name: string;
  user_avatar: string | null;
  created_at: string;
  updated_at: string;
}

export interface RatingListResponse {
  items: Rating[];
  total: number;
  average: number;
}

export interface RatingCreate {
  rating: number;
  review?: string | null;
}

export interface RatingUpdate {
  rating?: number;
  review?: string | null;
}
