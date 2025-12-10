import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import Sidebar from '../components/layout/SidebarCO';
import ProfilePage from '../components/CoDashboard/ProfilePage';
import VotingPage from '../components/CoDashboard/VotingPage';
import MeetingsPage from '../components/CoDashboard/MeetingsPage';
import { UserService } from '../services/api/UserService';

export default function AppCopropietario() {
  const [section, setSection] = useState('meetings');
  const [residentialUnitId, setResidentialUnitId] = useState(null);

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

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar section={section} setSection={setSection} />

      <main className="flex-1 ml-[280px] p-6">
        {section === 'meetings' && (
          <MeetingsPage residentialUnitId={residentialUnitId} />
        )}
        {section === 'voting' && <VotingPage />}
        {section === 'profile' && <ProfilePage />}
      </main>
    </div>
  );
}