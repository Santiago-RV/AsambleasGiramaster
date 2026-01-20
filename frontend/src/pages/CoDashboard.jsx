import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Video, FileText, User, LogOut, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useAuthContext } from '../providers/AuthProvider';
import DashboardLayout from '../components/layout/DashboardLayout';
import ProfilePage from '../components/CoDashboard/ProfilePage';
import VotingPage from '../components/CoDashboard/VotingPage';
import MeetingsPage from '../components/CoDashboard/MeetingsPage';
import { UserService } from '../services/api/UserService';

export default function AppCopropietario() {
  const [section, setSection] = useState('meetings');
  const [residentialUnitId, setResidentialUnitId] = useState(null);
  const [residentialUnitName, setResidentialUnitName] = useState('');
  const [userRole, setUserRole] = useState(3); // Default: copropietario
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { user } = useAuthContext();

  // OBTENER ROL DEL USUARIO DESDE LOCALSTORAGE
  useEffect(() => {
    const userString = localStorage.getItem('user');
    if (userString) {
      try {
        const userData = JSON.parse(userString);
        console.log('[CoDashboard] Usuario detectado:', userData);
        console.log('[CoDashboard] Rol del usuario:', userData.role);
        
        // Establecer el rol del usuario
        const role = userData.role || "Usuario";
        setUserRole(role);
        
        console.log('[CoDashboard] Rol establecido:', role);
        console.log('[CoDashboard] Es invitado?:', role === "Invitado");
      } catch (error) {
        console.error('[CoDashboard] Error al parsear usuario:', error);
        setUserRole(3); // Default a copropietario en caso de error
      }
    } else {
      console.warn('[CoDashboard] No se encontró usuario en localStorage');
      setUserRole(3);
    }
  }, []);

  // DETECTAR SI ES INVITADO (ROL 4)
  const isGuest = userRole === "Invitado";

  // Obtener información de la unidad residencial
  const {
    data: residentialUnitData,
    isLoading: isLoadingUnit,
    isError: isErrorUnit,
  } = useQuery({
    queryKey: ['user-residential-unit'],
    queryFn: UserService.getMyResidentialUnit,
    retry: 1,
  });

  // Sincronizar datos de la unidad residencial
  useEffect(() => {
    if (residentialUnitData?.success && residentialUnitData?.data) {
      setResidentialUnitId(residentialUnitData.data.residential_unit_id);
      setResidentialUnitName(residentialUnitData.data.residential_unit_name || 'Mi Unidad');
    }
  }, [residentialUnitData]);

  // CONFIGURACIÓN DEL MENÚ CON ROLES PERMITIDOS
  const allMenuItems = [
    {
      id: 'meetings',
      label: 'Reuniones',
      icon: Video,
      allowedRoles: ["Usuario", "Invitado"], // Copropietarios E Invitados
    },
    {
      id: 'voting',
      label: 'Encuestas',
      icon: FileText,
      allowedRoles: ["Usuario"], //  Solo Copropietarios
    },
    {
      id: 'profile',
      label: 'Mi Perfil',
      icon: User,
      allowedRoles: ["Usuario"], //  Solo Copropietarios
    },
  ];

  // FILTRAR MENÚ SEGÚN ROL DEL USUARIO
  const menuItems = allMenuItems.filter(item =>
    item.allowedRoles.includes(userRole)
  );

  // Títulos para cada sección
  const sectionTitles = {
    meetings: "Reuniones Virtuales",
    voting: "Encuestas Activas",
    profile: "Mi Perfil",
  };

  // Mostrar loading mientras carga
  if (isLoadingUnit) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <svg
            className="animate-spin h-12 w-12 text-blue-500 mx-auto mb-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <p className="text-gray-600 font-semibold">Cargando información...</p>
        </div>
      </div>
    );
  }

  // Mostrar error si no se pudo cargar la unidad residencial
  if (isErrorUnit || !residentialUnitId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center border border-red-200">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            Error al Cargar Información
          </h2>
          <p className="text-gray-600 mb-4">
            {isErrorUnit
              ? 'No se pudo obtener tu información de unidad residencial'
              : 'No estás asociado a ninguna unidad residencial'}
          </p>
          <p className="text-sm text-gray-500">
            Por favor, contacta al administrador del sistema
          </p>
        </div>
      </div>
    );
  }

  // Header personalizado similar al de Admin
  const headerContent = (
    <div className="px-8 py-4 flex justify-between items-center">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-800">
          {sectionTitles[section]}
        </h1>
        {isGuest && (
          <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold">
            Invitado
          </span>
        )}
      </div>

      <div className="flex items-center gap-4">
        {/* Botón de inicio */}
        <button
          onClick={() => setSection('meetings')}
          className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          title="Inicio"
        >
          <Home size={20} />
        </button>

        {/* Separador */}
        <div className="w-px h-8 bg-gray-300"></div>

        {/* Perfil de usuario */}
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full ${
            isGuest 
              ? 'bg-gradient-to-br from-purple-500 to-purple-600' 
              : 'bg-gradient-to-br from-[#2563eb] to-[#1e40af]'
          } flex items-center justify-center text-white font-bold shadow-md`}>
            {user?.name
              ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
              : isGuest ? 'IN' : 'CO'
            }
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-gray-800">
              {user?.name || (isGuest ? 'Invitado' : 'Copropietario')}
            </span>
            <span className="text-xs text-gray-500">
              {residentialUnitName}
            </span>
          </div>
        </div>

        {/* Cerrar sesión */}
        <div className="relative group">
          <button
            className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Cerrar sesión"
          >
            <LogOut size={20} />
          </button>

          {/* Menú desplegable */}
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
            <button
              onClick={() => setSection('meetings')}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-t-lg transition-colors"
            >
              Volver al Inicio
            </button>
            <button
              onClick={logout}
              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-b-lg transition-colors"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <DashboardLayout
      title="GIRAMASTER"
      subtitle={isGuest ? "Dashboard Invitado" : "Dashboard Copropietario"}
      menuItems={menuItems} // Menú filtrado según rol
      activeTab={section}
      onTabChange={setSection}
      gradientFrom="#2563eb"
      gradientTo="#1e40af"
      accentColor="#ffffff"
      header={headerContent}
    >
      {/* Contenido de las secciones */}
      {section === 'meetings' && (
        <MeetingsPage residentialUnitId={residentialUnitId} />
      )}
      {section === 'voting' && !isGuest && <VotingPage />}
      {section === 'profile' && !isGuest && <ProfilePage />}
    </DashboardLayout>
  );
}