/**
 * UI strings for the Flags Quiz module (App Template: Geography), kept local to
 * the feature (en/ru/es) — mirrors the Logo Quiz labels pattern. Screen chrome
 * only; quiz content comes from the backend snapshot. Picked by the app's
 * active locale via useFQLabels().
 */
import { useLocale, type SupportedLocale } from '@/hooks/use-locale';

export interface FQLabels {
  appName: string;
  play: string;
  shop: string;
  settings: string;
  // Settings screen
  cancelSubscription: string;
  restorePurchases: string;
  selectLanguage: string;
  rateApp: string;
  contactSupport: string;
  privacyPolicy: string;
  termsOfUse: string;
  // Restore-purchases result alerts
  restoreDoneTitle: string;
  restoreDoneMessage: string;
  restoreNoneTitle: string;
  restoreNoneMessage: string;
  restoreErrorTitle: string;
  restoreErrorMessage: string;
  ok: string;
}

const EN: FQLabels = {
  appName: 'Flags Quiz',
  play: 'Play',
  shop: 'Shop',
  settings: 'Settings',
  cancelSubscription: 'Cancel Subscription',
  restorePurchases: 'Restore Purchases',
  selectLanguage: 'Language',
  rateApp: 'Rate the App',
  contactSupport: 'Contact Support',
  privacyPolicy: 'Privacy Policy',
  termsOfUse: 'Terms of Use',
  restoreDoneTitle: 'Purchases Restored',
  restoreDoneMessage: 'Your premium access has been restored.',
  restoreNoneTitle: 'Nothing to Restore',
  restoreNoneMessage: 'We couldn’t find any previous purchases.',
  restoreErrorTitle: 'Restore Failed',
  restoreErrorMessage: 'Something went wrong. Please try again later.',
  ok: 'OK',
};

const RU: FQLabels = {
  appName: 'Флаги',
  play: 'Играть',
  shop: 'Магазин',
  settings: 'Настройки',
  cancelSubscription: 'Отменить подписку',
  restorePurchases: 'Восстановить покупки',
  selectLanguage: 'Язык',
  rateApp: 'Оценить приложение',
  contactSupport: 'Связаться с поддержкой',
  privacyPolicy: 'Политика конфиденциальности',
  termsOfUse: 'Условия использования',
  restoreDoneTitle: 'Покупки восстановлены',
  restoreDoneMessage: 'Ваш премиум-доступ восстановлен.',
  restoreNoneTitle: 'Нечего восстанавливать',
  restoreNoneMessage: 'Мы не нашли предыдущих покупок.',
  restoreErrorTitle: 'Ошибка восстановления',
  restoreErrorMessage: 'Что-то пошло не так. Попробуйте позже.',
  ok: 'ОК',
};

const ES: FQLabels = {
  appName: 'Quiz de Banderas',
  play: 'Jugar',
  shop: 'Tienda',
  settings: 'Ajustes',
  cancelSubscription: 'Cancelar suscripción',
  restorePurchases: 'Restaurar compras',
  selectLanguage: 'Idioma',
  rateApp: 'Valorar la app',
  contactSupport: 'Contactar soporte',
  privacyPolicy: 'Política de privacidad',
  termsOfUse: 'Términos de uso',
  restoreDoneTitle: 'Compras restauradas',
  restoreDoneMessage: 'Tu acceso premium ha sido restaurado.',
  restoreNoneTitle: 'Nada que restaurar',
  restoreNoneMessage: 'No encontramos compras anteriores.',
  restoreErrorTitle: 'Error al restaurar',
  restoreErrorMessage: 'Algo salió mal. Inténtalo más tarde.',
  ok: 'OK',
};

const TABLE: Record<SupportedLocale, FQLabels> = { en: EN, ru: RU, es: ES };

/** Each language shown in its own name, regardless of the active locale. */
export const FQ_LANGUAGE_NAMES: Record<SupportedLocale, string> = {
  en: 'English',
  ru: 'Русский',
  es: 'Español',
};

export function useFQLabels(): FQLabels {
  const { locale } = useLocale();
  return TABLE[locale] ?? EN;
}
