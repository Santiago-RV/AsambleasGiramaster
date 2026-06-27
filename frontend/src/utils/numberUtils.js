/**
 * Utilidades de formato numérico para reportes.
 */

/**
 * Trunca un número a 3 decimales SIN redondear y devuelve siempre 3 decimales.
 *
 * Ej: 0.4461 -> "0.446", 2.59049 -> "2.590", 1.2 -> "1.200", 0.123 -> "0.123"
 *
 * Se usa una representación con más decimales (toFixed(8)) antes de recortar para
 * evitar artefactos de punto flotante (p.ej. 0.123 * 1000 = 122.9999...).
 *
 * @param {number|string} value Valor a formatear
 * @returns {string} Cadena con exactamente 3 decimales, truncada
 */
export const truncar3 = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return '0.000';

  const neg = num < 0;
  // toFixed(8) solo podría redondear en el 8º decimal, lo que nunca afecta al 3º
  const fixed = Math.abs(num).toFixed(8);
  const [intPart, decPart = ''] = fixed.split('.');
  const dec3 = decPart.slice(0, 3).padEnd(3, '0');

  return `${neg ? '-' : ''}${intPart}.${dec3}`;
};
