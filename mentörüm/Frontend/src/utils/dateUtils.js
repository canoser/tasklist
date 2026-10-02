// date-fns importları şimdilik kullanılmıyor, gerekirse eklenecek.
import { toZonedTime, formatInTimeZone } from 'date-fns-tz';
import { tr } from 'date-fns/locale';

// Türkiye saat dilimi varsayılan olarak kabul edilir
const DEFAULT_TIMEZONE = 'Europe/Istanbul';

/**
 * UTC olarak gelen ISO formatındaki tarihi, kullanıcının timezone'una çevirip formatlar.
 */
export const formatDate = (isoString, formatStr = 'dd MMM yyyy HH:mm') => {
  if (!isoString) return '';
  return formatInTimeZone(isoString, DEFAULT_TIMEZONE, formatStr, { locale: tr });
};

/**
 * Şu anki zamanı belirtilen timezone'a göre döndürür.
 */
export const getNowZoned = () => {
  return toZonedTime(new Date(), DEFAULT_TIMEZONE);
};
