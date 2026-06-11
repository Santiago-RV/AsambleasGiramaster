import { useEffect, useRef, useState } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8005/api/v1';

/**
 * Suscribe a eventos SSE de copropietarios de una unidad residencial.
 *
 * @param {Object} options
 * @param {number|null} options.unitId - ID de la unidad residencial
 * @param {boolean} options.enabled - Si false, no conecta
 * @param {Function} options.onEvent - Callback(data) cuando llega un evento
 *   data: { type: "batch_added"|"resident_added"|"resident_deleted"|"residents_cleared", count: number }
 * @returns {{ isConnected: boolean }}
 */
export function useResidentsSSE({ unitId, enabled = true, onEvent }) {
  const [isConnected, setIsConnected] = useState(false);
  const onEventRef = useRef(onEvent);
  useEffect(() => { onEventRef.current = onEvent; });

  useEffect(() => {
    if (!enabled || !unitId) return;

    const token = localStorage.getItem('access_token');
    if (!token) return;

    const url = `${API_BASE_URL}/residential/units/${unitId}/residents/events?token=${encodeURIComponent(token)}`;
    const es = new EventSource(url);

    es.onopen = () => setIsConnected(true);

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onEventRef.current?.(data);
      } catch {
        // ignorar heartbeats y mensajes mal formados
      }
    };

    es.onerror = () => setIsConnected(false);

    return () => {
      es.close();
      setIsConnected(false);
    };
  }, [unitId, enabled]);

  return { isConnected };
}
