import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { publicAxios } from '../../services/api/axiosconfig';
import Swal from 'sweetalert2';
import { Lightbulb, CheckCircle, Lock } from 'lucide-react';

const SVG_ICONS = {
    lightbulb: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:middle;"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>`,
};

/**
 * Componente AutoLogin
 * Procesa JWT de auto-login enviados por correo
 * Autentica automáticamente al usuario y lo redirige al dashboard
 */
const AutoLogin = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('processing'); // processing, success, error
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Guard: evitar doble ejecucion (React StrictMode monta 2 veces en dev)
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processAutoLogin = async () => {
      if (!token) {
        setStatus('error');
        await Swal.fire({
          icon: 'error',
          title: 'Token Inválido',
          text: 'No se proporcionó un token de acceso válido.',
          confirmButtonColor: '#e74c3c',
        });
        navigate('/login');
        return;
      }

      try {
        // Mostrar loading
        Swal.fire({
          title: 'Procesando...',
          html: 'Validando tu acceso al sistema',
          allowOutsideClick: false,
          allowEscapeKey: false,
          didOpen: () => {
            Swal.showLoading();
          },
        });

        // Llamar al endpoint de auto-login
        const response = await publicAxios.get(`/auth/auto-login/${token}`);

        if (response.data.success) {
          const { access_token, user, attendance_registered } = response.data.data;

          // Guardar token y datos del usuario en localStorage
          localStorage.setItem('access_token', access_token);
          localStorage.setItem('user', JSON.stringify(user));

          setStatus('success');

          // Construir mensaje de asistencia si se registro automaticamente
          let attendanceHtml = '';
          if (attendance_registered && attendance_registered.registered) {
            if (attendance_registered.already_registered) {
              attendanceHtml = `
                <div style="background-color: #fff3cd; padding: 12px; border-radius: 8px; border-left: 4px solid #ffc107; margin-top: 12px;">
                  <p style="margin: 4px 0; color: #856404; font-size: 14px;">
                    <strong>Ya registrado en reunion presencial:</strong>
                  </p>
                  <p style="margin: 4px 0; color: #856404; font-size: 13px;">
                    ${attendance_registered.meeting_title}
                  </p>
                </div>
              `;
            } else {
              attendanceHtml = `
                <div style="background-color: #d4edda; padding: 12px; border-radius: 8px; border-left: 4px solid #28a745; margin-top: 12px;">
                  <p style="margin: 4px 0; color: #155724; font-size: 14px;">
                    <strong>Asistencia registrada automaticamente</strong>
                  </p>
                  <p style="margin: 4px 0; color: #155724; font-size: 13px;">
                    Reunion: ${attendance_registered.meeting_title}
                  </p>
                </div>
              `;
            }
          }

          // Mostrar mensaje de éxito
          await Swal.fire({
            icon: 'success',
            title: '¡Bienvenido!',
            html: `
              <div style="text-align: left;">
                <p style="margin-bottom: 8px;"><strong>Autenticación exitosa</strong></p>
                <div style="background-color: #f0f8ff; padding: 12px; border-radius: 8px; border-left: 4px solid #3498db;">
                  <p style="margin: 4px 0; color: #2c3e50; font-size: 14px;">
                    <strong>Usuario:</strong> ${user.name || user.username}
                  </p>
                  <p style="margin: 4px 0; color: #2c3e50; font-size: 14px;">
                    <strong>Rol:</strong> ${user.role}
                  </p>
                </div>
                ${attendanceHtml}
                <p style="margin-top: 8px; color: #7f8c8d; font-size: 12px;">
                  Serás redirigido al sistema en un momento...
                </p>
              </div>
            `,
            timer: attendance_registered?.registered ? 3500 : 2000,
            timerProgressBar: true,
            showConfirmButton: false,
          });

          // Redirigir según el rol del usuario
          const roleRoutes = {
            'Super Administrador': '/super-admin',
            'Administrador': '/admin',
            'Usuario': '/copropietario',
            'Invitado': '/copropietario',
          };

          const redirectPath = roleRoutes[user.role] || '/';
          navigate(redirectPath, { replace: true });

        } else {
          throw new Error(response.data.message || 'Error desconocido');
        }

      } catch (error) {
        console.error('Error en auto-login:', error);
        setStatus('error');

        let errorMessage = 'No se pudo procesar el acceso automático.';
        let errorTitle = 'Error de Autenticación';

        // Manejar diferentes tipos de errores
        if (error.response) {
          const status = error.response.status;
          const detail = error.response.data?.detail || error.response.data?.message;

          if (status === 404) {
            if (detail?.includes('expirado') || detail?.includes('expir')) {
              errorTitle = 'Enlace Expirado ⏰';
              errorMessage = 'Este enlace de acceso ha expirado (48 horas). Por favor, solicita uno nuevo.';
            } else {
              errorTitle = 'Enlace Inválido ❌';
              errorMessage = 'El enlace de acceso no es válido o no existe.';
            }
          } else if (status === 401) {
            errorTitle = 'Credenciales Inválidas 🔒';
            errorMessage = 'Las credenciales del enlace son incorrectas. Intenta ingresar manualmente.';
          } else if (status === 403) {
            errorTitle = 'Acceso Denegado 🚫';
            errorMessage = 'Tu cuenta no tiene permisos para acceder al sistema. Contacta al administrador.';
          } else {
            errorMessage = detail || errorMessage;
          }
        } else if (error.request) {
          errorTitle = 'Error de Conexión 📡';
          errorMessage = 'No se pudo conectar con el servidor. Verifica tu conexión a internet.';
        }

        await Swal.fire({
          icon: 'error',
          title: errorTitle,
          html: `
            <div style="text-align: left;">
              <p style="margin-bottom: 12px;">${errorMessage}</p>
              <div style="background-color: #f0f8ff; padding: 12px; border-radius: 8px; border-left: 4px solid #3498db;">
                <p style="margin: 4px 0; color: #2c3e50; font-size: 14px;">
                  <strong>${SVG_ICONS.lightbulb} Puedes intentar:</strong>
                </p>
                <ul style="margin: 8px 0; padding-left: 20px; color: #34495e; font-size: 13px;">
                  <li>Solicitar un nuevo enlace de acceso</li>
                  <li>Ingresar manualmente con tus credenciales</li>
                  <li>Contactar al administrador si persiste el problema</li>
                </ul>
              </div>
            </div>
          `,
          confirmButtonColor: '#3498db',
          confirmButtonText: 'Ir al Login',
          width: '500px',
        });

        navigate('/login');
      }
    };

    processAutoLogin();
  }, [token, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center gradient-to-br from-blue-50 to-blue-100">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <div className="text-center">
          {status === 'processing' && (
            <>
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500 mx-auto mb-4"></div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Procesando acceso...
              </h2>
              <p className="text-gray-600">
                Por favor espera mientras validamos tu acceso al sistema
              </p>
              <div className="mt-4 text-sm text-gray-500 flex items-center justify-center gap-1">
                <Lock size={14} /> Conexión segura
              </div>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                ¡Autenticación Exitosa!
              </h2>
              <p className="text-gray-600">
                Redirigiendo al sistema...
              </p>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="text-red-500 text-6xl mb-4">✕</div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Error de Autenticación
              </h2>
              <p className="text-gray-600 mb-4">
                No se pudo procesar tu acceso automático
              </p>
              <button
                onClick={() => navigate('/login')}
                className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-6 rounded-lg transition duration-300 shadow-md hover:shadow-lg"
              >
                Ir al Login
              </button>
            </>
          )}
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-center text-gray-500 flex items-center justify-center gap-1">
            <Lock size={12} /> Conexión segura - GIRAMASTER
          </p>
        </div>
      </div>
    </div>
  );
};

export default AutoLogin;