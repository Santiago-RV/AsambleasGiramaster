// CoDashboard.jsx - VERSIÓN CORREGIDA CON LOGOUT EN HEADER

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Video, FileText, User, LogOut, Building2, Hash, UserCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import DashboardLayout from '../components/layout/DashboardLayout';
import ProfilePage from '../components/CoDashboard/ProfilePage';
import VotingPage from '../components/CoDashboard/VotingPage';
import MeetingsPage from '../components/CoDashboard/MeetingsPage';
import { UserService } from '../services/api/UserService';

export default function AppCopropietario() {
  const [section, setSection] = useState('meetings');
  const [residentialUnitId, setResidentialUnitId] = useState(null);
  const [userRole, setUserRole] = useState('Usuario');
  const [userName, setUserName] = useState('');
  const [userCoefficient, setUserCoefficient] = useState(null);
  const [unitName, setUnitName] = useState('');
  const navigate = useNavigate();

  // OBTENER DATOS DEL USUARIO DESDE LOCALSTORAGE
  useEffect(() => {
    const userString = localStorage.getItem('user');
    if (userString) {
      try {
        const userData = JSON.parse(userString);
        const role = userData.role || "Usuario";
        setUserRole(role);
        
        // Establecer nombre del usuario
        const fullName = `${userData.firstname || ''} ${userData.lastname || ''}`.trim();
        setUserName(fullName || userData.email || 'Usuario');
      } catch (error) {
        console.error('[CoDashboard] Error al parsear usuario:', error);
        setUserRole('Usuario');
      }
    }
  }, []);

  // QUERY PARA OBTENER DATOS COMPLETOS DEL USUARIO Y UNIDAD
  const { 
    data: userData,
    isLoading: isLoadingUser,
    isError: isErrorUser 
  } = useQuery({
    queryKey: ['copropietario-data'],
    queryFn: async () => {
      const response = await UserService.getCurrentUserData();
      return response.data;
    },
    retry: 1,
    refetchOnWindowFocus: false
  });

  // EFECTO PARA ACTUALIZAR ESTADO CUANDO LLEGAN LOS DATOS
  useEffect(() => {
    if (userData) {
      if (userData.residential_unit) {
        setResidentialUnitId(userData.residential_unit.id);
        setUnitName(userData.residential_unit.str_name);
      }
      if (userData.coefficient) {
        setUserCoefficient(userData.coefficient);
      }
      // Actualizar nombre si viene del backend
      if (userData.firstname && userData.lastname) {
        const fullName = `${userData.firstname} ${userData.lastname}`.trim();
        setUserName(fullName);
      }
    }
  }, [userData]);

  const isGuest = userRole === "Invitado";

  const handleLogout = () => {
    Swal.fire({
      title: '¿Cerrar Sesión?',
      text: '¿Estás seguro de que deseas cerrar sesión?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, cerrar sesión',
      cancelButtonText: 'Cancelar',
      reverseButtons: true
    }).then((result) => {
      if (result.isConfirmed) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
        navigate('/login');
      }
    });
  };

  // CONFIGURACIÓN DEL MENÚ
  const allMenuItems = [
    {
      id: 'meetings',
      label: 'Reuniones',
      icon: Video,
      allowedRoles: ["Usuario", "Invitado"],
    },
    {
      id: 'voting',
      label: 'Encuestas',
      icon: FileText,
      allowedRoles: ["Usuario"],
    },
    {
      id: 'profile',
      label: 'Mi Perfil',
      icon: User,
      allowedRoles: ["Usuario"],
    },
  ];

  const menuItems = allMenuItems.filter((item) =>
    item.allowedRoles.includes(userRole)
  );

  // VALIDAR SECCIÓN DENTRO DE useEffect
  useEffect(() => {
    if (!menuItems.some((item) => item.id === section)) {
      setSection('meetings');
    }
  }, [section, menuItems]);

  // TÍTULOS DE SECCIONES
  const titles = {
    meetings: 'Mis Reuniones',
    voting: 'Votaciones y Encuestas',
    profile: 'Mi Perfil'
  };

  // HEADER PERSONALIZADO CON BOTÓN DE LOGOUT A LA IZQUIERDA
  const headerContent = (
    <div className="bg-white border-b border-gray-200 shadow-sm">
      <div className="px-6 py-4">
        {/* Título de la sección */}
        <div className="mb-4">
          <h1 className="text-2xl font-semibold text-gray-800">
            {titles[section]}
          </h1>
        </div>

        {/* Información del copropietario y unidad CON BOTÓN DE LOGOUT */}
        {!isGuest && !isLoadingUser && (
          <div className="flex items-center justify-between gap-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
            {/* Contenedor izquierdo: Info del usuario y unidad */}
            <div className="flex items-center gap-6">
              {/* Información del Usuario */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold shadow-md">
                  {userName.charAt(0).toUpperCase() || 'U'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <UserCircle size={16} className="text-blue-600" />
                    <span className="font-semibold text-gray-800">{userName}</span>
                  </div>
                  {userCoefficient && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Hash size={14} className="text-blue-500" />
                      <span>Coeficiente: {userCoefficient}%</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Separador vertical */}
              <div className="h-12 w-px bg-blue-300"></div>

              {/* Información de la Unidad Residencial */}
              <div className="flex items-center gap-2">
                <Building2 size={20} className="text-blue-600" />
                <div>
                  <p className="text-xs text-gray-500">Unidad Residencial</p>
                  <p className="font-semibold text-gray-800">{unitName || 'Cargando...'}</p>
                </div>
              </div>
            </div>

            {/* BOTÓN DE LOGOUT SOLO ICONO A LA DERECHA */}
            <button
              onClick={handleLogout}
              className="p-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all shadow-sm"
              title="Cerrar Sesión"
            >
              <LogOut size={20} />
            </button>
          </div>
        )}

        {/* Loading state para header */}
        {!isGuest && isLoadingUser && (
          <div className="flex items-center justify-between gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gray-300 animate-pulse"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-300 rounded w-48 mb-2 animate-pulse"></div>
                <div className="h-3 bg-gray-300 rounded w-32 animate-pulse"></div>
              </div>
            </div>
            
            {/* Botón de logout durante loading */}
            <button
              onClick={handleLogout}
              className="p-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all shadow-sm"
              title="Cerrar Sesión"
            >
              <LogOut size={20} />
            </button>
          </div>
        )}

        {/* Información para invitados */}
        {isGuest && (
          <div className="flex items-center justify-between gap-3 p-4 bg-orange-50 rounded-lg border border-orange-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold shadow-md">
                {userName.charAt(0).toUpperCase() || 'I'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <UserCircle size={16} className="text-orange-600" />
                  <span className="font-semibold text-gray-800">{userName}</span>
                  <span className="px-2 py-1 bg-orange-200 text-orange-800 rounded-full text-xs font-semibold">
                    Invitado
                  </span>
                </div>
                <p className="text-sm text-gray-600">Acceso de solo observación</p>
              </div>
            </div>
            
            {/* Botón de logout para invitados */}
            <button
              onClick={handleLogout}
              className="p-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all shadow-sm"
              title="Cerrar Sesión"
            >
              <LogOut size={20} />
            </button>
          </div>
        )}
      </div>
    </div>
  );

  // Footer del sidebar SIN botón de logout (ya está en el header)
  const sidebarFooter = null;

  // Estado de error
  if (isErrorUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-2">Error al cargar datos</h2>
          <p className="text-gray-600 mb-4">No se pudo obtener tu información</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout
      title="GIRAMASTER"
      subtitle={isGuest ? "Dashboard Invitado" : "Dashboard Copropietario"}
      menuItems={menuItems}
      activeTab={section}
      onTabChange={setSection}
      gradientFrom="#2563eb"
      gradientTo="#1e40af"
      accentColor="#ffffff"
      sidebarFooter={sidebarFooter}
    >
      {/* Header personalizado */}
      {headerContent}

      {/* Contenido de las secciones */}
      <div className="p-6">
        {section === 'meetings' && (
          <MeetingsPage residentialUnitId={residentialUnitId} />
        )}
        {section === 'voting' && !isGuest && <VotingPage />}
        {section === 'profile' && !isGuest && <ProfilePage />}
      </div>
    </DashboardLayout>
  );
}