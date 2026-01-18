import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Video, FileText, User, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/layout/DashboardLayout';
import ProfilePage from '../components/CoDashboard/ProfilePage';
import VotingPage from '../components/CoDashboard/VotingPage';
import MeetingsPage from '../components/CoDashboard/MeetingsPage';
import { UserService } from '../services/api/UserService';

export default function AppCopropietario() {
  const [section, setSection] = useState('meetings');
  const [residentialUnitId, setResidentialUnitId] = useState(null);
  const [userRole, setUserRole] = useState(3); // Default: copropietario
  const navigate = useNavigate();

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
        console.error(' [CoDashboard] Error al parsear usuario:', error);
        setUserRole(3); // Default a copropietario en caso de error
      }
    } else {
      console.warn('[CoDashboard] No se encontró usuario en localStorage');
      setUserRole(3);
    }
  }, []);

  // DETECTAR SI ES INVITADO (ROL 4)
  const isGuest = userRole === "Invitado";

  // Log del estado actual
  useEffect(() => {
    console.log('[CoDashboard] Estado actual:', {
      userRole,
      isGuest,
      section
    });
  }, [userRole, isGuest, section]);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    navigate('/login');
  };

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
  const menuItems = allMenuItems.filter(item => {
    const isAllowed = item.allowedRoles.includes(userRole);
    console.log(`[CoDashboard] Menu item "${item.label}":`, {
      allowedRoles: item.allowedRoles,
      userRole,
      isAllowed
    });
    return isAllowed;
  });

  console.log('[CoDashboard] Items del menú filtrados:', menuItems.map(i => i.label));

  // Obtener la unidad residencial del usuario actual
  const {
    data: residentialUnitData,
    isLoading: isLoadingUnit,
    isError: isErrorUnit,
  } = useQuery({
    queryKey: ['my-residential-unit'],
    queryFn: UserService.getMyResidentialUnit,
    retry: 1,
    onSuccess: (data) => {
      if (data?.success && data?.data?.residential_unit_id) {
        setResidentialUnitId(data.data.residential_unit_id);
      }
    },
  });

  // Sincronizar el residential unit id cuando llegue
  useEffect(() => {
    if (residentialUnitData?.success && residentialUnitData?.data?.residential_unit_id) {
      setResidentialUnitId(residentialUnitData.data.residential_unit_id);
    }
  }, [residentialUnitData]);

  // Manejo de loading y errores
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

  // Footer personalizado con botón de cerrar sesión
  const sidebarFooter = (
    <button
      onClick={handleLogout}
      className="w-full flex items-center gap-3 px-4 py-3 rounded-lg font-semibold text-white hover:bg-red-500 transition-all"
    >
      <LogOut size={20} />
      <span>Cerrar Sesión</span>
    </button>
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
      sidebarFooter={sidebarFooter}
    >
      {/* Solo mostrar secciones permitidas para cada rol */}
      {section === 'meetings' && (
        <MeetingsPage residentialUnitId={residentialUnitId} />
      )}
      {section === 'voting' && !isGuest && <VotingPage />}
      {section === 'profile' && !isGuest && <ProfilePage />}
    </DashboardLayout>
  );
}