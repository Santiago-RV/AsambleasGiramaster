/**
 * Copia texto al portapapeles.
 *
 * navigator.clipboard solo existe en contextos seguros (HTTPS o localhost),
 * así que sobre HTTP en un host de red (ej. http://devstar:5173) viene
 * undefined. En ese caso se usa el método clásico con un textarea temporal.
 *
 * Debe invocarse desde un gesto del usuario (click), no de forma diferida.
 *
 * @param {string} text
 * @returns {Promise<boolean>} true si se copió
 */
export const copyToClipboard = async (text) => {
	if (!text) return false;

	if (navigator.clipboard && window.isSecureContext) {
		try {
			await navigator.clipboard.writeText(text);
			return true;
		} catch {
			// sigue al fallback
		}
	}

	try {
		const textarea = document.createElement('textarea');
		textarea.value = text;
		textarea.setAttribute('readonly', '');
		textarea.style.position = 'fixed';
		textarea.style.top = '-9999px';
		textarea.style.opacity = '0';
		document.body.appendChild(textarea);

		textarea.select();
		textarea.setSelectionRange(0, text.length); // iOS Safari

		const copied = document.execCommand('copy');
		document.body.removeChild(textarea);
		return copied;
	} catch {
		return false;
	}
};
