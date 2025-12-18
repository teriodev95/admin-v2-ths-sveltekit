import type { ApiResponse, AuthResponse, Product, Brand, Category } from '$lib/types';

const API_URL = 'https://ths-back-admin.clvrt.workers.dev';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = getToken();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers
  });

  const data = await response.json();

  if (response.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  }

  return data;
}

// Auth
export async function login(email: string, password: string): Promise<AuthResponse> {
  const response = await fetch(`${API_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  return response.json();
}

// Products
export async function getProducts(): Promise<ApiResponse<Product[]>> {
  return fetchApi<Product[]>('/products');
}

export async function getProduct(id: number): Promise<ApiResponse<Product>> {
  return fetchApi<Product>(`/v2/products/${id}`);
}

export async function updateProduct(
  id: number,
  data: Partial<Product>
): Promise<ApiResponse<Product>> {
  return fetchApi<Product>(`/v2/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
}

export async function createProduct(
  data: Omit<Product, 'id'>
): Promise<ApiResponse<Product>> {
  return fetchApi<Product>('/productsTNT', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function searchProducts(params: {
  query?: string;  // Búsqueda general (nombre O barcode)
  name?: string;
  barcode?: string;
  brandId?: number;
  categoryId?: number;
  limit?: number;
  offset?: number;
}): Promise<ApiResponse<Product[]>> {
  return fetchApi<Product[]>('/products/search-advanced', {
    method: 'POST',
    body: JSON.stringify(params)
  });
}

// Brands
export async function getBrands(includeInactive = false): Promise<ApiResponse<Brand[]>> {
  const query = includeInactive ? '?includeInactive=true' : '';
  return fetchApi<Brand[]>(`/v2/brands${query}`);
}

export async function getBrand(id: number): Promise<ApiResponse<Brand>> {
  return fetchApi<Brand>(`/v2/brands/${id}`);
}

export async function createBrand(data: { name: string; slug?: string }): Promise<ApiResponse<Brand>> {
  return fetchApi<Brand>('/v2/brands', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function updateBrand(
  id: number,
  data: Partial<Brand>
): Promise<ApiResponse<Brand>> {
  return fetchApi<Brand>(`/v2/brands/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
}

export async function deleteBrand(id: number): Promise<ApiResponse<void>> {
  return fetchApi<void>(`/v2/brands/${id}`, { method: 'DELETE' });
}

export async function uploadBrandImage(id: number, file: File): Promise<ApiResponse<{ imageUrl: string }>> {
  const token = getToken();
  const formData = new FormData();
  formData.append('image', file);

  const response = await fetch(`${API_URL}/v2/brands/${id}/image`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData
  });

  return response.json();
}

// Categories
export async function getCategories(flat = false, includeInactive = false): Promise<ApiResponse<Category[]>> {
  const params = new URLSearchParams();
  if (flat) params.append('flat', 'true');
  if (includeInactive) params.append('includeInactive', 'true');
  const query = params.toString() ? `?${params.toString()}` : '';
  return fetchApi<Category[]>(`/v2/categories${query}`);
}

export async function getCategory(id: number): Promise<ApiResponse<Category>> {
  return fetchApi<Category>(`/v2/categories/${id}`);
}

export async function createCategory(data: {
  name: string;
  slug?: string;
  parentId?: number | null;
}): Promise<ApiResponse<Category>> {
  return fetchApi<Category>('/v2/categories', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function updateCategory(
  id: number,
  data: Partial<Category>
): Promise<ApiResponse<Category>> {
  return fetchApi<Category>(`/v2/categories/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
}

export async function deleteCategory(id: number): Promise<ApiResponse<void>> {
  return fetchApi<void>(`/v2/categories/${id}`, { method: 'DELETE' });
}

export async function uploadCategoryImage(id: number, file: File): Promise<ApiResponse<{ imageUrl: string }>> {
  const token = getToken();
  const formData = new FormData();
  formData.append('image', file);

  const response = await fetch(`${API_URL}/v2/categories/${id}/image`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData
  });

  return response.json();
}
