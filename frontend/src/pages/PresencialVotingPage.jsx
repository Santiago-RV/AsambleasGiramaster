import { useState, useEffect } from "react";
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle, Clock, AlertCircle, Timer, MapPin, LogOut, ShieldOff, UserPlus, Hash } from "lucide-react";
import Swal from 'sweetalert2';
import { PollService } from '../services/api/PollService';
import { MeetingService } from '../services/api/MeetingService';
import { DelegationService } from '../services/api/DelegationService';
import { formatDateTime } from '../utils/dateUtils';

export default function PresencialVotingPage() {
  const { meetingId } = useParams();
  const navigate = useNavigate();
  const [meeting, setMeeting] = useState(null);
  const [poll, setPoll] = useState(null);
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [noPoll, setNoPoll] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [delegationStatus, setDelegationStatus] = useState(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const [delegationCountdown, setDelegationCountdown] = useState(0);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    localStorage.removeItem('meeting_id');
    navigate('/');
  };

  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      handleLogout();
      return;
    }
    const timer = setTimeout(() => setCountdown(prev => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const meetingResponse = await MeetingService.getMeetingById(meetingId);
        const meetingData = meetingResponse.data;
        setMeeting(meetingData);

        const pollsResponse = await PollService.getPollsByMeeting(meetingId);
        const polls = pollsResponse.data || [];

        const activePoll = polls.find(p => {
          const isActive = p.str_status === 'active' || p.str_status === 'Activa';
          if (!isActive || p.has_voted) return false;
          if (p.dat_ended_at) {
            const endDate = new Date(p.dat_ended_at);
            if (currentTime > endDate) return false;
          }
          return true;
        });

        if (activePoll) {
          setPoll(activePoll);
          setNoPoll(false);
        } else {
          setPoll(null);
          setNoPoll(true);
        }

        // Verificar si el usuario cedió su poder en esta reunión
        try {
          const delegationResponse = await DelegationService.getUserDelegationStatus(meetingId);
          setDelegationStatus(delegationResponse?.data ?? delegationResponse ?? null);
        } catch {
          // Si falla la consulta de delegación, no bloquear
        }
      } catch (error) {
        console.error('Error cargando datos:', error);
        setNoPoll(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [meetingId]);

  // Countdown para redirigir si cedió el poder
  const hasDelegated = delegationStatus?.has_delegated ?? false;
  const delegatedTo = delegationStatus?.delegated_to;
  const receivedDelegations = delegationStatus?.received_delegations ?? [];

  useEffect(() => {
    if (!hasDelegated) return;
    setDelegationCountdown(10);
    const interval = setInterval(() => {
      setDelegationCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          handleLogout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [hasDelegated]);

  useEffect(() => {
    if (noPoll && !isLoading) {
      setCountdown(5);
    }
  }, [noPoll, isLoading]);

  const getTimeRemaining = (endDateStr) => {
    if (!endDateStr) return null;
    const endDate = new Date(endDateStr);
    const diff = endDate - currentTime;
    if (diff <= 0) return { expired: true, minutes: 0, seconds: 0 };
    return { expired: false, minutes: Math.floor(diff / 60000), seconds: Math.floor((diff % 60000) / 1000) };
  };

  const formatTimeRemaining = (endDateStr) => {
    const time = getTimeRemaining(endDateStr);
    if (!time || time.expired) return null;
    return `${time.minutes}:${time.seconds.toString().padStart(2, '0')}`;
  };

  const handleOptionToggle = (optionId) => {
    if (poll.str_poll_type === 'single') {
      setSelectedOptions([optionId]);
    } else {
      setSelectedOptions(prev => {
        if (prev.includes(optionId)) return prev.filter(id => id !== optionId);
        const maxSelections = poll.int_max_selections || poll.options?.length || 999;
        if (prev.length < maxSelections) return [...prev, optionId];
        return prev;
      });
    }
  };

  const handleVote = async () => {
    if (poll.str_poll_type === 'single' && selectedOptions.length === 0) {
      Swal.fire({ icon: 'warning', title: 'Selecciona una opción', text: 'Debes seleccionar al menos una opción', confirmButtonColor: '#3b82f6' });
      return;
    }
    if (poll.str_poll_type === 'multiple' && selectedOptions.length === 0) {
      Swal.fire({ icon: 'warning', title: 'Selecciona opciones', text: 'Debes seleccionar al menos una opción', confirmButtonColor: '#3b82f6' });
      return;
    }

    setIsVoting(true);
    try {
      if (poll.str_poll_type === 'single') {
        await PollService.vote(poll.id, { int_option_id: selectedOptions[0], bln_is_abstention: false });
      } else {
        for (const optionId of selectedOptions) {
          await PollService.vote(poll.id, { int_option_id: optionId, bln_is_abstention: false });
        }
      }
      setHasVoted(true);
      setCountdown(5);
    } catch (error) {
      console.error('Error al votar:', error);
      Swal.fire({ icon: 'error', title: 'Error al votar', text: error.response?.data?.message || 'Intenta nuevamente', confirmButtonColor: '#ef4444' });
    } finally {
      setIsVoting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto" />
          <p className="mt-4 text-gray-600">Cargando votación...</p>
        </div>
      </div>
    );
  }

  // Bloqueo: el usuario cedió su poder en esta reunión
  if (hasDelegated) {
    const delegatedName = delegatedTo
      ? `${delegatedTo.str_firstname} ${delegatedTo.str_lastname}`.trim()
      : 'otro copropietario';
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-100 px-4">
        <div className="bg-white rounded-2xl shadow-2xl border-2 border-amber-300 p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <ShieldOff className="text-amber-500" size={40} />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-3">Has cedido tu poder de voto</h1>
          <p className="text-gray-600 mb-2">
            Delegaste tu poder de votación a{' '}
            <span className="font-semibold text-gray-800">{delegatedName}</span>.
          </p>
          <p className="text-gray-600 mb-4">
            Tu <strong>asistencia y votación</strong> en esta reunión dependen de la presencia de{' '}
            <span className="font-semibold text-gray-800">{delegatedName}</span>.
          </p>
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-6">
            Si tienes dudas o crees que esto es un error, por favor contáctate con el administrador de tu unidad residencial.
          </p>
          <div className="mb-3">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-amber-400 h-2 rounded-full transition-all duration-1000"
                style={{ width: `${(delegationCountdown / 10) * 100}%` }}
              />
            </div>
          </div>
          <p className="text-sm text-gray-500">
            Saliendo en <span className="font-bold text-amber-600">{delegationCountdown}</span> segundo{delegationCountdown !== 1 ? 's' : ''}...
          </p>
        </div>
      </div>
    );
  }

  if (noPoll) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-100">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md mx-4 text-center">
          <div className="bg-red-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-3">
            Sin Encuesta Activa
          </h1>
          {meeting && (
            <p className="text-gray-600 mb-4">
              La reunión <strong>{meeting.str_title}</strong> no tiene encuestas activas en este momento.
            </p>
          )}
          <p className="text-gray-500 mb-6">
            La sesión se cerrará automáticamente.
          </p>
          {countdown !== null && (
            <div className="bg-gray-100 rounded-xl p-6">
              <p className="text-gray-600 mb-2">Cerrando sesión en:</p>
              <div className="text-5xl font-bold text-red-600">{countdown}</div>
              <div className="text-sm text-gray-500 mt-1">segundos</div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (hasVoted || countdown !== null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md mx-4 text-center">
          <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-3">¡Voto Registrado!</h1>
          <p className="text-gray-600 mb-6">Tu voto para <strong>"{poll.str_title}"</strong> ha sido registrado exitosamente.</p>
          <div className="bg-gray-100 rounded-xl p-6">
            <p className="text-gray-600 mb-2">Saliendo en:</p>
            <div className="text-5xl font-bold text-blue-600">{countdown}</div>
            <div className="text-sm text-gray-500 mt-1">segundos</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {meeting && (
          <div className="bg-white rounded-xl shadow-md p-4 mb-6 flex items-center gap-3">
            <MapPin className="text-emerald-600 flex-shrink-0" size={20} />
            <div>
              <h2 className="font-semibold text-gray-800">{meeting.str_title}</h2>
              <p className="text-sm text-gray-500">Votación presencial</p>
            </div>
          </div>
        )}

        {/* Banner: poderes recibidos */}
        {receivedDelegations.length > 0 && (() => {
          const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
          const currentUserName = storedUser.name || storedUser.username || storedUser.email || 'Usted';
          return (
            <div className="bg-white rounded-xl shadow-md border-2 border-green-300 p-4 mb-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                  <UserPlus className="text-white" size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-green-900">Poderes de Votación Recibidos</h3>
                  <p className="text-xs text-green-700">Tu voto contará con el peso acumulado de todos los poderes cedidos</p>
                </div>
              </div>

              {/* Usuario actual */}
              <div className="flex items-center justify-between bg-blue-50 rounded-lg px-3 py-2 border border-blue-200 mb-3">
                <div>
                  <p className="text-xs text-blue-600 font-semibold uppercase">Tu nombre</p>
                  <span className="text-sm font-bold text-blue-900">{currentUserName}</span>
                </div>
                <div className="text-right">
                  <p className="text-xs text-blue-600 font-semibold uppercase">Tu coeficiente propio</p>
                  <div className="flex items-center gap-1 justify-end text-blue-700">
                    <Hash size={13} />
                    <span className="text-sm font-bold">{parseFloat(delegationStatus?.original_weight ?? 0).toFixed(4)}%</span>
                  </div>
                </div>
              </div>

              {/* Personas que cedieron poder */}
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Poderes recibidos de:</p>
              <div className="space-y-2 mb-3">
                {receivedDelegations.map((d, i) => (
                  <div key={i} className="flex items-center justify-between bg-green-50 rounded-lg px-3 py-2 border border-green-200">
                    <span className="text-sm font-medium text-gray-800">
                      {d.delegator.str_firstname} {d.delegator.str_lastname}
                    </span>
                    <div className="flex items-center gap-1 text-green-700">
                      <Hash size={13} />
                      <span className="text-sm font-bold">+{parseFloat(d.delegated_weight).toFixed(4)}%</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="flex items-center justify-between bg-green-100 rounded-lg px-3 py-2 border-2 border-green-300">
                <span className="text-sm font-semibold text-green-800">Peso total de votación:</span>
                <span className="text-xl font-bold text-green-700">{parseFloat(delegationStatus?.total_weight ?? 0).toFixed(4)}%</span>
              </div>
            </div>
          );
        })()}

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h1 className="text-2xl font-bold mb-2">{poll.str_title}</h1>
                {poll.str_description && <p className="text-blue-100 text-sm">{poll.str_description}</p>}
              </div>
              <span className="px-3 py-1 bg-green-500 rounded-full text-xs font-semibold">ACTIVA</span>
            </div>
            <div className="flex items-center gap-4 mt-4 text-sm text-blue-100">
              <div className="flex items-center gap-1"><Clock size={16} />{formatDateTime(poll.dat_started_at)}</div>
              {poll.dat_ended_at && (
                <div className="flex items-center gap-1">
                  <Timer size={16} />
                  {formatTimeRemaining(poll.dat_ended_at) ? (
                    <span className="font-mono font-bold bg-white/20 px-2 py-0.5 rounded">{formatTimeRemaining(poll.dat_ended_at)}</span>
                  ) : <span className="text-red-300">Expirada</span>}
                </div>
              )}
            </div>
          </div>

          <div className="p-6">
            <p className="font-semibold text-gray-700 mb-4">
              {poll.str_poll_type === 'single' ? 'Selecciona una opción:' : `Selecciona hasta ${poll.int_max_selections || poll.options?.length} opciones:`}
            </p>

            <div className="space-y-3 mb-6">
              {poll.options?.map((option, index) => {
                const isSelected = selectedOptions.includes(option.id);
                return (
                  <button
                    key={option.id}
                    onClick={() => handleOptionToggle(option.id)}
                    disabled={isVoting}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center justify-between ${
                      isSelected ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                    } ${isVoting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${isSelected ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                        {String.fromCharCode(65 + index)}
                      </span>
                      <span className="font-medium text-gray-800">{option.str_option_text}</span>
                    </div>
                    {isSelected && <CheckCircle className="text-blue-600" size={24} />}
                  </button>
                );
              })}
            </div>

            {poll.str_poll_type === 'multiple' && selectedOptions.length > 0 && (
              <p className="text-sm text-gray-600 mb-4 text-center">{selectedOptions.length} de {poll.int_max_selections || poll.options?.length} seleccionada(s)</p>
            )}

            <button
              onClick={handleVote}
              disabled={(poll.str_poll_type === 'single' && selectedOptions.length === 0) || (poll.str_poll_type === 'multiple' && selectedOptions.length === 0) || isVoting}
              className={`w-full py-4 rounded-xl font-bold text-white transition-all flex items-center justify-center gap-2 ${
                ((poll.str_poll_type === 'single' && selectedOptions.length === 0) || (poll.str_poll_type === 'multiple' && selectedOptions.length === 0) || isVoting)
                  ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl'
              }`}
            >
              {isVoting ? <><Loader2 className="animate-spin" size={20} />Enviando voto...</> : <><CheckCircle size={20} />Votar</>}
            </button>
          </div>
        </div>

        <button onClick={handleLogout} className="mt-6 w-full py-3 bg-white text-gray-600 rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
          <LogOut size={18} />Salir sin votar
        </button>
      </div>
    </div>
  );
}
