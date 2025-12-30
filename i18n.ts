/**
 * i18n.ts - Minimal internationalization for AeroLogix AI
 * Supports EN (default) and FR
 * No external dependencies
 */

type TranslationKey =
  | 'app_name'
  | 'app_tagline'
  | 'email'
  | 'password'
  | 'password_confirm'
  | 'login'
  | 'signup'
  | 'no_account'
  | 'have_account'
  | 'create_account'
  | 'accept'
  | 'decline'
  | 'tc_title'
  | 'tc_body'
  | 'tc_ack'
  | 'error_generic'
  | 'coming_soon'
  | 'name'
  | 'full_name';

type Translations = Record<TranslationKey, string>;

const translations: Record<'en' | 'fr', Translations> = {
  en: {
    app_name: 'AeroLogix AI',
    app_tagline: 'Aviation Maintenance Manager',
    email: 'Email',
    password: 'Password',
    password_confirm: 'Confirm Password',
    login: 'Login',
    signup: 'Sign Up',
    no_account: "Don't have an account?",
    have_account: 'Already have an account?',
    create_account: 'Create Account',
    accept: 'Accept',
    decline: 'Decline',
    tc_title: 'Important Notice',
    tc_body: `AeroLogix AI is an informational tool for organizing maintenance records.

• It does not certify airworthiness and does not replace an AME/TEA.

• You must verify all data and follow official records and Transport Canada requirements.

• By continuing, you acknowledge you are responsible for all aircraft maintenance decisions.`,
    tc_ack: 'I understand and accept',
    error_generic: 'An error occurred. Please try again.',
    coming_soon: 'Coming soon',
    name: 'Name',
    full_name: 'Full Name',
  },
  fr: {
    app_name: 'AeroLogix AI',
    app_tagline: 'Gestionnaire de maintenance aéronautique',
    email: 'Courriel',
    password: 'Mot de passe',
    password_confirm: 'Confirmer le mot de passe',
    login: 'Connexion',
    signup: 'Créer un compte',
    no_account: "Pas de compte ?",
    have_account: 'Déjà un compte ?',
    create_account: 'Créer un compte',
    accept: 'Accepter',
    decline: 'Refuser',
    tc_title: 'Avis important',
    tc_body: `AeroLogix AI est un outil informatif pour organiser les dossiers de maintenance.

• Il ne certifie pas la navigabilité et ne remplace pas un TEA (AME).

• Vous devez vérifier toutes les données et suivre les registres officiels et les exigences de Transports Canada.

• En continuant, vous reconnaissez être responsable de toutes les décisions de maintenance aéronautique.`,
    tc_ack: "Je comprends et j'accepte",
    error_generic: 'Une erreur est survenue. Veuillez réessayer.',
    coming_soon: 'Bientôt disponible',
    name: 'Nom',
    full_name: 'Nom complet',
  },
};

/**
 * Detect user language from device locale
 * Falls back to 'en' if not French
 */
function getDeviceLanguage(): 'en' | 'fr' {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale || '';
    const lang = locale.toLowerCase().split('-')[0];
    return lang === 'fr' ? 'fr' : 'en';
  } catch {
    return 'en';
  }
}

let currentLanguage: 'en' | 'fr' = getDeviceLanguage();

/**
 * Get translation for a key
 */
export function t(key: TranslationKey): string {
  return translations[currentLanguage][key] || translations['en'][key] || key;
}

/**
 * Get current language
 */
export function getLanguage(): 'en' | 'fr' {
  return currentLanguage;
}

/**
 * Set language manually (if needed)
 */
export function setLanguage(lang: 'en' | 'fr'): void {
  currentLanguage = lang;
}

export default { t, getLanguage, setLanguage };
