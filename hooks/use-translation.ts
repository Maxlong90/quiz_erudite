import { useCallback } from 'react';

import { format, STRINGS, type StringKey } from '@/i18n/strings';
import { useLocale } from '@/hooks/use-locale';

type Vars = Record<string, string | number>;

export function useTranslation() {
  const { locale } = useLocale();

  const t = useCallback(
    (key: StringKey, vars?: Vars): string => {
      const tpl = STRINGS[locale]?.[key] ?? STRINGS.en[key] ?? key;
      return vars ? format(tpl, vars) : tpl;
    },
    [locale],
  );

  return { t, locale };
}
