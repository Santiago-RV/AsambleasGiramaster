import { useEffect, useRef, useState } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8005/api/v1';

/**
 * Suscribe a eventos SSE de asistencia en tiempo real para una reunión.
 *
 * @param {Object} options
 * @param {number|null} options.meetingId - ID de la reunión
 * @param {boolean} options.enabled - Si false, no conecta
 * @param {Function} options.onEvent - Callback(data) cuando llega un evento
 *   data: { type: "initial_state", attendances: [{user_id, status}] }
 *       | { type: "attendance_update", user_id, status }
 *   status: "connected" | "absent" | "disconnected"
 * @returns {{ isConnected: boolean }}
 */
export function useMeetingAttendanceSSE({ meetingId, enabled = true, onEvent }) {
  const [isConnected, setIsConnected] = useState(false);
  const onEventRef = useRef(onEvent);
  useEffect(() => { onEventRef.current = onEvent; });

  useEffect(() => {
    if (!enabled || !meetingId) return;

    const token = localStorage.getItem('access_token');
    if (!token) return;

    const url = `${API_BASE_URL}/meetings/${meetingId}/attendance/events?token=${encodeURIComponent(token)}`;
    console.debug('[AttendanceSSE] Conectando a', url);
    const es = new EventSource(url);

    es.onopen = () => {
      console.debug('[AttendanceSSE] Conexión abierta');
      setIsConnected(true);
    };

    es.onmessage = (event) => {
      console.debug('[AttendanceSSE] Mensaje recibido:', event.data);
      try {
        const data = JSON.parse(event.data);
        onEventRef.current?.(data);
      } catch (err) {
        console.warn('[AttendanceSSE] Error parseando mensaje:', err);
      }
    };

    es.onerror = (err) => {
      console.warn('[AttendanceSSE] Error SSE:', err, 'readyState:', es.readyState);
      setIsConnected(false);
    };

    return () => {
      console.debug('[AttendanceSSE] Cerrando conexión');
      es.close();
      setIsConnected(false);
    };
  }, [meetingId, enabled]);

  return { isConnected };
}
