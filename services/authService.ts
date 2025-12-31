import api, { storage } from './api';

/**
 * =========================
 * Types
 * =========================
 */

export interface User {
  id: string;
  email: string;
  name: string;
  subscription: {
    plan: string;
    status: string;
  };
  limits: {
    max_aircrafts: number;
    ocr_per_month: number;
    logbook_entries_per_month: number;
  };
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupData {
  email: string;
  name: string;
  password: string;
}

/**
 * =========================
 * Auth Service
 * =========================
 */

class AuthService {
  /**
   * Login utilisateur
   * POST /api/auth/login
   */
  async login(credentials: LoginCredentials): Promise<User> {
    // FastAPI OAuth2 attend des form-data
    const formData = new URLSearchParams();
    formData.append('username', credentials.email);
    formData.append('password', credentials.password);

    const response = await api.post('/api/auth/login', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const { access_token, user } = response.data;

    // Stockage sécurisé du token
    await storage.setItem('auth_token', access_token);

    return user;
  }

  /**
   * Inscription utilisateur
   * POST /api/auth/signup
   */
  async signup(data: SignupData): Promise<User> {
    const response = await api.post('/api/auth/signup', data);

    const { access_token, user } = response.data;

    // Stockage du token MAIS
    // ⚠️ aucune validation automatique après signup
    await storage.setItem('auth_token', access_token);

    return user;
  }

  /**
   * Récupération utilisateur courant
   * /api/auth/me
   *
   * ⚠️ IMPORTANT :
   * - NE JAMAIS appeler cette route sans token
   * - Sinon => Unmatched Route / Method Not Allowed
   */
  async getCurrentUser(): Promise<User | null> {
    const token = await storage.getItem('auth_token');

    // 🔒 GARDE CRITIQUE
    if (!token) {
      return null;
    }

    const response = await api.get('/api/auth/me');
    return response.data;
  }

  /**
   * Déconnexion utilisateur
   */
  async logout(): Promise<void> {
    await storage.deleteItem('auth_token');
  }

  /**
   * Récupération du token stocké
   */
  async getToken(): Promise<string | null> {
    return await storage.getItem('auth_token');
  }
}

export default new AuthService();