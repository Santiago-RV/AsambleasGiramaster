import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

export const formatDateLong = (dateString) => {
  if (!dateString) return "-";
  try {
    const date = new Date(dateString);
    return format(date, "d MMM yyyy", { locale: es });
  } catch {
    return dateString;
  }
};

export const formatDateTime = (dateString) => {
  if (!dateString) return "-";
  try {
    const date = new Date(dateString);
    return format(date, "d MMM yyyy h:mm a", { locale: es });
  } catch {
    return dateString;
  }
};

export const formatTime = (dateString) => {
  if (!dateString) return "-";
  try {
    const date = new Date(dateString);
    return format(date, "h:mm a", { locale: es });
  } catch {
    return dateString;
  }
};

export const formatDateTimeWithSeconds = (dateString) => {
  if (!dateString) return "-";
  try {
    const date = new Date(dateString);
    return format(date, "d MMM yyyy h:mm:ss a", { locale: es });
  } catch {
    return dateString;
  }
};

export const formatRelativeTime = (dateString) => {
  if (!dateString) return "-";
  try {
    const date = new Date(dateString);
    return formatDistanceToNow(date, { addSuffix: true, locale: es });
  } catch {
    return dateString;
  }
};