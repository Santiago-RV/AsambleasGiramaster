import { useEffect, useRef, useState } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8005/api/v1';

/**
 * Suscribe a eventos SSE de encuestas de una reunión.
 * Reemplaza el polling periódico: solo notifica cuando el admin inicia o finaliza una encuesta.
 *
 * @param {Object} options
 * @param {number|null} options.meetingId - ID de la reunión a escuchar
 * @param {boolean} options.enabled - Si false, no conecta (ej: usuarios invitados)
 * @param {Function} options.onEvent - Callback(data) cuando llega un evento
 *   data tiene forma: { type: "poll_started" | "poll_ended", poll_id: number }
 * @returns {{ isConnected: boolean }}
 */
export function useMeetingPollsSSE({ meetingId, enabled = true, onEvent }) {
  const [isConnected, setIsConnected] = useState(false);
  const onEventRef = useRef(onEvent);
  useEffect(() => { onEventRef.current = onEvent; });

  useEffect(() => {
    if (!enabled || !meetingId) return;

    const token = localStorage.getItem('access_token');
    if (!token) return;

    const url = `${API_BASE_URL}/polls/meeting/${meetingId}/events?token=${encodeURIComponent(token)}`;
    const es = new EventSource(url);

    es.onopen = () => setIsConnected(true);

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onEventRef.current?.(data);
      } catch {
        // ignorar mensajes mal formados (ej: heartbeats con formato inesperado)
      }
    };

    es.onerror = () => setIsConnected(false); // EventSource reconecta automáticamente

    return () => {
      es.close();
      setIsConnected(false);
    };
  }, [meetingId, enabled]);

  return { isConnected };
}
