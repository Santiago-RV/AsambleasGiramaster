import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, Video, FileText, Settings, LogOut } from 'lucide-react';
import Swal from 'sweetalert2';
import DashboardLayout from "../components/layout/DashboardLayout";
import UsersPage from "../components/AdDashboard/UsersPage";
import AssembliesPage from "../components/AdDashboard/AssembliesPage";
import LivePage from "../components/AdDashboard/LivePage";
import ReportsPage from "../components/AdDashboard/ReportsPage";
import SettingsPage from "../components/AdDashboard/SettingsPage";
import PowerModal from "../components/AdDashboard/PowerModal";
import ResidentModal from "../components/saDashboard/components/modals/ResidentModal";
import ExcelUploadModal from "../components/saDashboard/components/modals/ExcelUploadModal";
import MeetingModal from "../components/saDashboard/components/modals/MeetingModal";
import ZoomMeetingContainer from "../components/AdDashboard/ZoomMeetingContainer";
import { useAuth } from "../hooks/useAuth";
import { useAuthContext } from "../providers/AuthProvider";
import { UserService } from "../services/api/UserService";
import { ResidentialUnitService } from "../services/api/ResidentialUnitService";
import { ResidentService } from "../services/api/ResidentService";
import { MeetingService } from "../services/api/MeetingService";

export default function AppAdmin() {
  const [section, setSection] = useState("users");
  const [showUserForm, setShowUserForm] = useState(false);
  const [showAssemblyForm, setShowAssemblyForm] = useState(false);
  const [powerModalData, setPowerModalData] = useState(null);
  const [residentialUnitId, setResidentialUnitId] = useState(null);
  const [residentialUnitName, setResidentialUnitName] = useState("");
  const [selectedResident, setSelectedResident] = useState(null);
  const [residentModalMode, setResidentModalMode] = useState('create');
  const [showExcelModal, setShowExcelModal] = useState(false);
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [showZoomMeeting, setShowZoomMeeting] = useState(null);
  const { logout } = useAuth();
  const { user } = useAuthContext();
  const queryClient = useQueryClient();

  // Obtener la unidad residencial del administrador
  const {
    data: residentialUnitData,
    isLoading: isLoadingUnit,
    isError: isErrorUnit,
  } = useQuery({
    queryKey: ['admin-residential-unit'],
    queryFn: UserService.getMyResidentialUnit,
    retry: 1,
  });

  // Obtener detalles de la unidad residencial
  const {
    data: unitDetails,
    isLoading: isLoadingDetails,
  } = useQuery({
    queryKey: ['residential-unit-details', residentialUnitId],
    queryFn: () => ResidentialUnitService.getResidentialUnitById(residentialUnitId),
    enabled: !!residentialUnitId,
    retry: 1,
  });

  // Sincronizar datos de la unidad residencial
  useEffect(() => {
    if (residentialUnitData?.success && residentialUnitData?.data?.residential_unit_id) {
      setResidentialUnitId(residentialUnitData.data.residential_unit_id);
    }
  }, [residentialUnitData]);

  useEffect(() => {
    if (unitDetails?.success && unitDetails?.data?.str_name) {
      setResidentialUnitName(unitDetails.data.str_name);
    }
  }, [unitDetails]);

  // Configuración del menú del sidebar
  const menuItems = [
    { id: 'users', label: 'Gestión de Copropietarios', icon: Users },
    // { id: 'assemblies', label: 'Gestión de Asambleas', icon: Calendar },
    { id: 'live', label: 'Encuestas', icon: Video },
    { id: 'reports', label: 'Reportes', icon: FileText },
    { id: 'settings', label: 'Configuración', icon: Settings },
  ];

  // Títulos para cada sección
  const sectionTitles = {
    users: "Gestión de Copropietarios",
    // assemblies: "Gestión de Asambleas",
    live: "Encuestas",
    reports: "Reportes",
    settings: "Configuración",
  };

  const openPowerModal = (fromLabel, onConfirm) => {
    setPowerModalData({ fromLabel, onConfirm });
  };

  const closePowerModal = () => setPowerModalData(null);

  // Mutaciones para operaciones de residentes
  const createResidentMutation = useMutation({
    mutationFn: async (data) => {
      return await ResidentService.createResident(residentialUnitId, data);
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['residential-unit-residents', residentialUnitId] });
      Swal.fire({
        icon: 'success',
        title: '¡Éxito!',
        text: response.message || 'Copropietario creado exitosamente',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        backdrop: false,
      });
    },
    onError: (error) => {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.response?.data?.message || error.message || 'Error al crear el copropietario',
      });
    },
  });

  const updateResidentMutation = useMutation({
    mutationFn: async ({ residentId, data }) => {
      return await ResidentService.updateResident(residentialUnitId, residentId, data);
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['residential-unit-residents', residentialUnitId] });
      Swal.fire({
        icon: 'success',
        title: '¡Éxito!',
        text: response.message || 'Copropietario actualizado exitosamente',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        backdrop: false,
      });
    },
    onError: (error) => {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.response?.data?.message || error.message || 'Error al actualizar el copropietario',
      });
    },
  });

  // Handlers para el modal de residentes
  const handleOpenResidentModal = () => {
    setResidentModalMode('create');
    setSelectedResident(null);
    setShowUserForm(true);
  };

  const handleEditResident = (resident) => {
    setSelectedResident(resident);
    setResidentModalMode('edit');
    setShowUserForm(true);
  };

  const handleSubmitResident = (data, residentId, resetForm) => {
    if (residentModalMode === 'create') {
      createResidentMutation.mutate(data, {
        onSuccess: () => {
          resetForm();
          setShowUserForm(false);
        },
      });
    } else {
      // Validar que haya cambios
      if (Object.keys(data).length === 0) {
        Swal.fire({
          icon: 'info',
          title: 'Sin cambios',
          text: 'No se detectaron cambios para guardar',
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000,
          backdrop: false,
        });
        return;
      }

      updateResidentMutation.mutate(
        { residentId, data },
        {
          onSuccess: () => {
            resetForm();
            setShowUserForm(false);
            setSelectedResident(null);
          },
        }
      );
    }
  };

  // Mutación para crear reunión
  const createMeetingMutation = useMutation({
    mutationFn: async (data) => {
      return await MeetingService.createMeeting(data);
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['meetings', residentialUnitId] });
      Swal.fire({
        icon: 'success',
        title: '¡Reunión Creada!',
        text: response.message || 'La reunión de Zoom ha sido creada exitosamente',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        backdrop: false,
      });
    },
    onError: (error) => {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.response?.data?.message || error.message || 'Error al crear la reunión',
      });
    },
  });

  // Handler para crear reunión
  const handleCreateMeeting = () => {
    setShowMeetingModal(true);
  };

  // Handler para enviar el formulario de reunión
  const handleSubmitMeeting = (data, resetForm) => {
    const meetingData = {
      int_id_residential_unit: parseInt(residentialUnitId),
      str_title: data.str_title,
      str_description: data.str_description || '',
      str_meeting_type: data.str_meeting_type,
      bln_allow_delegates: data.bln_allow_delegates,
      int_estimated_duration: 0,
      dat_schedule_date: data.dat_schedule_start,
      // El int_meeting_leader_id se asigna automáticamente en el backend
    };

    createMeetingMutation.mutate(meetingData, {
      onSuccess: () => {
        resetForm();
        setShowMeetingModal(false);
      },
    });
  };

  // Handler para unirse a una reunión usando Zoom Embebido
  const handleJoinMeeting = async (meeting) => {
    // Validar que la reunión tenga datos de Zoom
    if (!meeting.zoom_meeting_id && !meeting.meeting_url) {
      Swal.fire({
        icon: 'error',
        title: 'URL no disponible',
        text: 'La URL de la reunión no está disponible aún. Por favor, verifica que la reunión haya sido creada correctamente en Zoom.',
        confirmButtonColor: '#3498db',
      });
      return;
    }

    try {
      // Registrar la hora de inicio en la base de datos
      await MeetingService.startMeeting(meeting.id);

      // Mostrar el contenedor de Zoom embebido
      setShowZoomMeeting({
        id: meeting.id,
        str_title: meeting.titulo,
        int_zoom_meeting_id: meeting.zoom_meeting_id,
        str_zoom_join_url: meeting.meeting_url,
        str_zoom_password: meeting.zoom_password,
      });
    } catch (error) {
      // Si falla el registro, mostrar Zoom de todas formas
      setShowZoomMeeting({
        id: meeting.id,
        str_title: meeting.titulo,
        int_zoom_meeting_id: meeting.zoom_meeting_id,
        str_zoom_join_url: meeting.meeting_url,
        str_zoom_password: meeting.zoom_password,
      });
    }
  };

  // Handler para cerrar el Zoom
  const handleCloseZoom = () => {
    setShowZoomMeeting(null);
  };

  // Mostrar loading mientras carga la unidad residencial
  if (isLoadingUnit || isLoadingDetails) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <svg
            className="animate-spin h-12 w-12 text-green-500 mx-auto mb-4"
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
            Por favor, contacta al superadministrador del sistema
          </p>
        </div>
      </div>
    );
  }

  // Header personalizado con usuario y cerrar sesión
  const headerContent = (
    <div className="px-8 py-4 flex justify-between items-center">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-800">
          {sectionTitles[section]}
        </h1>
      </div>

      <div className="flex items-center gap-4">
        {/* Configuración */}
        <button
          onClick={() => setSection('settings')}
          className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          title="Configuración"
        >
          <Settings size={20} />
        </button>

        {/* Separador */}
        <div className="w-px h-8 bg-gray-300"></div>

        {/* Perfil de usuario */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#059669] to-[#10b981] flex items-center justify-center text-white font-bold shadow-md">
            {user?.name
              ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
              : user?.role?.charAt(0).toUpperCase() || 'A'
            }
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-gray-800">
              {user?.name || user?.role || 'Administrador'}
            </span>
            <span className="text-xs text-gray-500">
              {user?.email || ''}
            </span>
          </div>
        </div>

        {/* Cerrar sesión con menú desplegable */}
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
              onClick={() => setSection('users')}
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

  // Si está mostrando Zoom, renderizar en pantalla completa
  if (showZoomMeeting) {
    return (
      <div className="w-screen h-screen overflow-hidden bg-gray-900">
        {/* Zoom embebido usando SDK Embedded - Pantalla completa */}
        <ZoomMeetingContainer
          meetingData={showZoomMeeting}
          onClose={handleCloseZoom}
          startFullscreen={true}
        />
      </div>
    );
  }

  return (
    <DashboardLayout
      title={residentialUnitName || "Asambleas Digital"}
      subtitle={"Administrador"}
      menuItems={menuItems}
      activeTab={section}
      onTabChange={setSection}
      gradientFrom="#047857"
      gradientTo="#065f46"
      accentColor="#10b981"
      header={headerContent}
    >

      {section === "users" && (
        <UsersPage
          residentialUnitId={residentialUnitId}
          onCreateUser={handleOpenResidentModal}
          onEditUser={handleEditResident}
          onUploadExcel={() => setShowExcelModal(true)}
          onCreateMeeting={handleCreateMeeting}
          onJoinMeeting={handleJoinMeeting}
          onTransferPower={(fromLabel, onConfirm) =>
            openPowerModal(fromLabel, onConfirm)
          }
        />
      )}
      {section === "assemblies" && (
        <AssembliesPage
          onCreateAssembly={() => setShowAssemblyForm(true)}
        />
      )}
      {section === "live" && <LivePage />}
      {section === "reports" && <ReportsPage />}
      {section === "settings" && <SettingsPage />}

      <ResidentModal
        isOpen={showUserForm}
        onClose={() => {
          setShowUserForm(false);
          setSelectedResident(null);
        }}
        onSubmit={handleSubmitResident}
        mode={residentModalMode}
        resident={selectedResident}
        isSubmitting={createResidentMutation.isPending || updateResidentMutation.isPending}
      />

      <ExcelUploadModal
        isOpen={showExcelModal}
        onClose={() => setShowExcelModal(false)}
        unitId={residentialUnitId}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['residential-unit-residents', residentialUnitId] });
        }}
      />

      <MeetingModal
        isOpen={showMeetingModal}
        onClose={() => setShowMeetingModal(false)}
        onSubmit={handleSubmitMeeting}
        isSubmitting={createMeetingMutation.isPending}
      />

      {showAssemblyForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24">
          <div className="bg-white rounded-lg shadow-lg w-[min(900px,95%)] p-6">
            <button
              className="float-right text-sm text-gray-500"
              onClick={() => setShowAssemblyForm(false)}
            >
              ✖
            </button>
            <h3 className="text-lg font-semibold mb-4">Crear/Editar Asamblea</h3>
            <p className="text-sm text-gray-600">Formulario de asamblea</p>
            <div className="mt-4 flex gap-2">
              <button
                className="px-4 py-2 bg-green-600 text-white rounded"
                onClick={() => { alert("Asamblea guardada"); setShowAssemblyForm(false); }}
              >
                Guardar Asamblea
              </button>
              <button className="px-4 py-2 bg-gray-300 rounded" onClick={() => setShowAssemblyForm(false)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {powerModalData && (
        <PowerModal
          fromLabel={powerModalData.fromLabel}
          onClose={closePowerModal}
          onConfirm={(to, type) => {
            alert(`Poder cedido a ${to} (${type}) — simulación`);
            if (powerModalData.onConfirm) powerModalData.onConfirm(to, type);
            closePowerModal();
          }}
        />
      )}
    </DashboardLayout>
  );
}
