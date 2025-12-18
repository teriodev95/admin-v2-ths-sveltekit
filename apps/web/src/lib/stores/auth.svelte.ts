import type { User } from '$lib/types';
import { login as apiLogin } from '$lib/services/api';

function createAuthStore() {
  let user = $state<User | null>(null);
  let token = $state<string | null>(null);
  let isLoading = $state(true);

  function init() {
    if (typeof window === 'undefined') return;

    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      token = storedToken;
      user = JSON.parse(storedUser);
    }
    isLoading = false;
  }

  async function login(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    const response = await apiLogin(email, password);

    if (response.success && response.data) {
      token = response.data.token;
      user = response.data.user;
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      return { success: true };
    }

    return { success: false, error: response.error || 'Error al iniciar sesión' };
  }

  function logout() {
    token = null;
    user = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  }

  return {
    get user() { return user; },
    get token() { return token; },
    get isLoading() { return isLoading; },
    get isAuthenticated() { return !!token; },
    init,
    login,
    logout
  };
}

export const auth = createAuthStore();
