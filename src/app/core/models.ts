// Shapes returned by genz-admin-apis (the menu source of truth).

export type CategoryType = 'single' | 'sized';

export interface Category {
  id: number;
  slug: string;
  name: string;
  type: CategoryType;
  sizes: string[] | null;
  is_coming_soon: boolean;
  is_active: boolean;
  sort_order: number;
  image_updated_at: string | null;
  menu_items_count?: number;
}

export interface MenuItem {
  id: number;
  category_id: number;
  slug: string;
  name: string;
  description: string | null;
  price_type: CategoryType;
  price: number | null;
  prices: Record<string, number | null> | null;
  pizza_selection: PizzaSelection | null;
  deal_extras: string[] | null;
  default_size: string | null;
  tag: string | null;
  is_special: boolean;
  is_signature: boolean;
  is_active: boolean;
  sort_order: number;
  image_updated_at: string | null;
}

export interface PizzaSelection {
  size: string;
  count: number;
  from: string[];
}

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: string;
}

/** A deal category is one whose slug ends in "deals" (shared feed convention). */
export const isDealGroup = (slug: string): boolean => slug.endsWith('deals');
