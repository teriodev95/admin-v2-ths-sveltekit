export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

export interface AuthResponse {
  success: boolean;
  data?: {
    token: string;
    user: User;
  };
  error?: string;
}

export interface Product {
  id: number;
  name: string;
  barcode: string;
  brand: string | null;
  brandId: number | null;
  categories: number[] | Category[];
  salePrice: number;
  stockQuantity: number;
  image: string | null;
  internalReference: string | null;
  storehouseId: number;
  enMercadolibre: number;
}

export interface Brand {
  id: number;
  name: string;
  slug: string;
  imageUrl: string | null;
  isActive: number;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  imageUrl: string | null;
  parentId: number | null;
  isActive: number;
  children?: Category[];
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  total?: number;
}
