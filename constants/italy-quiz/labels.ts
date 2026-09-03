/**
 * UI strings for the Italy Quiz module (App Template: World), kept local to the
 * feature (en/ru/es/fr) — mirrors the Flags Quiz labels pattern. Screen chrome
 * only; quiz content comes from the backend snapshot. Picked by the app's active
 * locale via useItalyLabels().
 */
import { useLocale, type SupportedLocale } from '@/hooks/use-locale';

export interface ItalyLabels {
  appName: string;
  /** Onboarding splash tagline under the QUIZZZES wordmark. */
  tagline: string;
  play: string;
  settings: string;
  /** Title of the category picker screen (Play → categories). */
  categories: string;
  // Settings screen
  selectLanguage: string;
  rateApp: string;
  contactSupport: string;
  privacyPolicy: string;
  termsOfUse: string;
  version: string;
  ok: string;
}

const EN: ItalyLabels = {
  appName: 'Italy Quiz',
  tagline: 'Train your brain!',
  play: 'Play',
  settings: 'Settings',
  categories: 'Categories',
  selectLanguage: 'Language',
  rateApp: 'Rate the App',
  contactSupport: 'Contact Support',
  privacyPolicy: 'Privacy Policy',
  termsOfUse: 'Terms of Use',
  version: 'Version',
  ok: 'OK',
};

const RU: ItalyLabels = {
  appName: 'Викторина Италия',
  tagline: 'Прокачай мозг!',
  play: 'Играть',
  settings: 'Настройки',
  categories: 'Категории',
  selectLanguage: 'Язык',
  rateApp: 'Оценить приложение',
  contactSupport: 'Связаться с поддержкой',
  privacyPolicy: 'Политика конфиденциальности',
  termsOfUse: 'Условия использования',
  version: 'Версия',
  ok: 'ОК',
};

const ES: ItalyLabels = {
  appName: 'Quiz de Italia',
  tagline: '¡Entrena tu mente!',
  play: 'Jugar',
  settings: 'Ajustes',
  categories: 'Categorías',
  selectLanguage: 'Idioma',
  rateApp: 'Valorar la app',
  contactSupport: 'Contactar soporte',
  privacyPolicy: 'Política de privacidad',
  termsOfUse: 'Términos de uso',
  version: 'Versión',
  ok: 'OK',
};

const FR: ItalyLabels = {
  appName: 'Quiz Italie',
  tagline: 'Entraîne ton cerveau !',
  play: 'Jouer',
  settings: 'Réglages',
  categories: 'Catégories',
  selectLanguage: 'Langue',
  rateApp: 'Noter l’application',
  contactSupport: 'Contacter le support',
  privacyPolicy: 'Politique de confidentialité',
  termsOfUse: 'Conditions d’utilisation',
  version: 'Version',
  ok: 'OK',
};

const TABLE: Record<SupportedLocale, ItalyLabels> = { en: EN, ru: RU, es: ES, fr: FR };

export function useItalyLabels(): ItalyLabels {
  const { locale } = useLocale();
  return TABLE[locale] ?? EN;
}
