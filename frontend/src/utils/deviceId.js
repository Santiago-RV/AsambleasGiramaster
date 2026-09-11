const DEVICE_ID_KEY = 'device_id';

/**
 * Identificador estable de este navegador, usado por el backend para atar el
 * link de auto-login al primer dispositivo que lo usa.
 * Devuelve null si el storage no está disponible (incógnito, cookies bloqueadas):
 * en ese caso el backend cae al fallback por User-Agent.
 */
export const getOrCreateDeviceId = () => {
	try {
		const stored = localStorage.getItem(DEVICE_ID_KEY);
		if (stored) return stored;

		const generated =
			typeof crypto !== 'undefined' && crypto.randomUUID
				? crypto.randomUUID()
				: `${Date.now()}-${Math.random().toString(36).slice(2)}`;

		localStorage.setItem(DEVICE_ID_KEY, generated);
		return generated;
	} catch {
		return null;
	}
};
