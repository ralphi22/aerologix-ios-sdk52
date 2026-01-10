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
  | 'full_name'
  // Aircraft
  | 'aircraft'
  | 'aircraft_title'
  | 'no_aircraft'
  | 'add_aircraft'
  | 'save_aircraft'
  | 'delete_aircraft'
  | 'delete_confirm'
  | 'cancel'
  | 'airframe'
  | 'engine'
  | 'propeller'
  | 'hours'
  // Aircraft form
  | 'registration'
  | 'registration_hint'
  | 'common_name'
  | 'model_name'
  | 'serial_number'
  | 'category'
  | 'engine_type'
  | 'max_weight'
  | 'base_operations'
  | 'manufacturer'
  | 'country_manufacture'
  | 'year_manufacture'
  | 'registration_type'
  | 'owner_since'
  | 'owner_address'
  | 'address_line1'
  | 'address_line2'
  | 'city'
  | 'country'
  | 'airframe_hours'
  | 'engine_hours'
  | 'propeller_hours'
  | 'auto_fill_hint'
  | 'tc_safe_disclaimer'
  // Sections
  | 'section_identity'
  | 'section_category'
  | 'section_weight'
  | 'section_construction'
  | 'section_registration'
  | 'section_owner'
  | 'section_hours'
  // Tab bar
  | 'tab_aircraft'
  | 'tab_assistant'
  | 'tab_profile'
  // Profile
  | 'profile'
  // TC AD/SB
  | 'tc_adsb_title'
  | 'tc_adsb_subtitle'
  | 'tc_adsb_new_alert'
  | 'tc_adsb_ad_section'
  | 'tc_adsb_sb_section'
  | 'tc_adsb_missing'
  | 'tc_adsb_due_soon'
  | 'tc_adsb_ok'
  | 'tc_adsb_new_since_logbook'
  | 'tc_adsb_last_recorded'
  | 'tc_adsb_next_due'
  | 'tc_adsb_open_source'
  | 'tc_adsb_no_items'
  | 'tc_adsb_disclaimer'
  | 'tc_adsb_info_only'
  | 'tc_adsb_loading'
  | 'tc_adsb_error';

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
    // Aircraft
    aircraft: 'Aircraft',
    aircraft_title: 'Aircraft',
    no_aircraft: 'No aircraft added yet',
    add_aircraft: 'Add Aircraft',
    save_aircraft: 'Save Aircraft',
    delete_aircraft: 'Delete',
    delete_confirm: 'Delete this aircraft?',
    cancel: 'Cancel',
    airframe: 'Airframe',
    engine: 'Engine',
    propeller: 'Propeller',
    hours: 'h',
    // Aircraft form
    registration: 'Registration',
    registration_hint: 'e.g. C-FABC (Canada), N123AB (USA)',
    common_name: 'Common Name',
    model_name: 'Model',
    serial_number: 'Serial Number',
    category: 'Category',
    engine_type: 'Engine Type',
    max_weight: 'Maximum Weight',
    base_operations: 'Base of Operations',
    manufacturer: 'Manufacturer',
    country_manufacture: 'Country of Manufacture',
    year_manufacture: 'Year of Manufacture',
    registration_type: 'Registration Type',
    owner_since: 'Owner Since',
    owner_address: 'Owner Address',
    address_line1: 'Address Line 1',
    address_line2: 'Address Line 2',
    city: 'City',
    country: 'Country',
    airframe_hours: 'Airframe Hours',
    engine_hours: 'Engine Hours',
    propeller_hours: 'Propeller Hours',
    auto_fill_hint: 'Will be auto-filled from registry when available',
    tc_safe_disclaimer: 'Information only. You remain responsible for aircraft records and maintenance.',
    // Sections
    section_identity: 'Aircraft Identity',
    section_category: 'Category',
    section_weight: 'Weight & Base',
    section_construction: 'Construction',
    section_registration: 'Registration',
    section_owner: 'Owner Address',
    section_hours: 'Hours',
    // Tab bar
    tab_aircraft: 'Aircraft',
    tab_assistant: 'AI Assistant',
    tab_profile: 'Profile',
    // Profile
    profile: 'Profile',
    // TC AD/SB
    tc_adsb_title: 'Transport Canada AD/SB',
    tc_adsb_subtitle: 'Informational only — verify with official records and your AME.',
    tc_adsb_new_alert: 'New AD published since last logbook update',
    tc_adsb_ad_section: 'Airworthiness Directives (AD)',
    tc_adsb_sb_section: 'Service Bulletins (SB)',
    tc_adsb_missing: 'Missing',
    tc_adsb_due_soon: 'Due soon',
    tc_adsb_ok: 'OK',
    tc_adsb_new_since_logbook: 'New since last logbook',
    tc_adsb_last_recorded: 'Last recorded',
    tc_adsb_next_due: 'Next due',
    tc_adsb_open_source: 'Open source',
    tc_adsb_no_items: 'No items found',
    tc_adsb_disclaimer: 'Transport Canada AD and SB information is provided for reference only. AeroLogix does not determine aircraft compliance or airworthiness.',
    tc_adsb_info_only: 'Informational only',
    tc_adsb_loading: 'Loading TC data...',
    tc_adsb_error: 'Failed to load TC data',
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
    // Aircraft
    aircraft: 'Avions',
    aircraft_title: 'Avions',
    no_aircraft: 'Aucun avion enregistré',
    add_aircraft: 'Ajouter un avion',
    save_aircraft: 'Enregistrer l\'avion',
    delete_aircraft: 'Supprimer',
    delete_confirm: 'Supprimer cet avion ?',
    cancel: 'Annuler',
    airframe: 'Cellule',
    engine: 'Moteur',
    propeller: 'Hélice',
    hours: 'h',
    // Aircraft form
    registration: 'Immatriculation',
    registration_hint: 'ex: C-FABC (Canada), N123AB (USA)',
    common_name: 'Nom commun',
    model_name: 'Modèle',
    serial_number: 'Numéro de série',
    category: 'Catégorie',
    engine_type: 'Type de moteur',
    max_weight: 'Masse maximale',
    base_operations: 'Base d\'opérations',
    manufacturer: 'Constructeur',
    country_manufacture: 'Pays de construction',
    year_manufacture: 'Année de construction',
    registration_type: 'Type d\'immatriculation',
    owner_since: 'Propriétaire depuis',
    owner_address: 'Adresse du propriétaire',
    address_line1: 'Adresse ligne 1',
    address_line2: 'Adresse ligne 2',
    city: 'Ville',
    country: 'Pays',
    airframe_hours: 'Heures cellule',
    engine_hours: 'Heures moteur',
    propeller_hours: 'Heures hélice',
    auto_fill_hint: 'Sera rempli automatiquement depuis le registre lorsque disponible',
    tc_safe_disclaimer: 'Informatif seulement. Le propriétaire demeure responsable des registres et de la maintenance.',
    // Sections
    section_identity: 'Identité de l\'avion',
    section_category: 'Catégorie',
    section_weight: 'Masses & Base',
    section_construction: 'Construction',
    section_registration: 'Immatriculation',
    section_owner: 'Adresse du propriétaire',
    section_hours: 'Heures',
    // Tab bar
    tab_aircraft: 'Avions',
    tab_assistant: 'Assistant IA',
    tab_profile: 'Profil',
    // Profile
    profile: 'Profil',
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
