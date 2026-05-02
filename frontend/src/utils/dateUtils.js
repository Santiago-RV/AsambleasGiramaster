import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

/**
 * Parsea un string de fecha del backend (naive, hora Colombia) como Colombia UTC-5.
 * Sin esto, el navegador puede interpretar la hora como UTC y mostrar +5 horas de más.
 */
export const parseColombiaDate = (dateString) => {
  if (!dateString) return null;
  // Si ya tiene info de zona horaria, usarlo tal cual
  if (typeof dateString !== "string" || dateString.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(dateString)) {
    return new Date(dateString);
  }
  // El backend retorna hora Colombia sin zona horaria. Forzar UTC-5.
  return new Date(dateString + "-05:00");
};

export const formatDateLong = (dateString) => {
  if (!dateString) return "-";
  try {
    const date = parseColombiaDate(dateString);
    return format(date, "d MMM yyyy", { locale: es });
  } catch {
    return dateString;
  }
};

export const formatDateTime = (dateString) => {
  if (!dateString) return "-";
  try {
    const date = parseColombiaDate(dateString);
    return format(date, "d MMM yyyy h:mm a", { locale: es });
  } catch {
    return dateString;
  }
};

export const formatTime = (dateString) => {
  if (!dateString) return "-";
  try {
    const date = parseColombiaDate(dateString);
    return format(date, "h:mm a", { locale: es });
  } catch {
    return dateString;
  }
};

export const formatDateTimeWithSeconds = (dateString) => {
  if (!dateString) return "-";
  try {
    const date = parseColombiaDate(dateString);
    return format(date, "d MMM yyyy h:mm:ss a", { locale: es });
  } catch {
    return dateString;
  }
};

export const formatRelativeTime = (dateString) => {
  if (!dateString) return "-";
  try {
    const date = parseColombiaDate(dateString);
    return formatDistanceToNow(date, { addSuffix: true, locale: es });
  } catch {
    return dateString;
  }
};
