import ReactDOM from 'react-dom';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
	X, Plus, Loader2, AlertCircle, CheckCircle, Clock,
	Users, TrendingUp, Play, Square, BarChart3, ChevronLeft,
	ClipboardList, BarChart2
} from 'lucide-react';
import Swal from 'sweetalert2';
import { PollService } from '../../services/api/PollService';
import CreatePollView from './CreatePollView';
import VotersList from './VotersList';

const getStatusBadge = (status) => {
	const s = status?.toLowerCase();
	if (s === 'active' || s === 'activa') {
		return (
			<span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">
				<span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5 animate-pulse" />
				Activa
			</span>
		);
	}
	if (s === 'draft' || s === 'borrador') {
		return (
			<span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
				<Clock size={11} className="mr-1" />
				Borrador
			</span>
		);
	}
	if (s === 'closed' || s === 'finalizada' || s === 'cerrada') {
		return (
			<span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
				<CheckCircle size={11} className="mr-1" />
				Finalizada
			</span>
		);
	}
	return (
		<span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
			{status}
		</span>
	);
};

export default function ZoomPollsPanel({ meetingData, isOpen, onClose }) {
	const [activeTab, setActiveTab] = useState('gestion');
	const [showCreateForm, setShowCreateForm] = useState(false);
	const [selectedPoll, setSelectedPoll] = useState(null);
	const queryClient = useQueryClient();

	const { data: pollsData, isLoading: isLoadingPolls } = useQuery({
		queryKey: ['meeting-polls', meetingData?.id],
		queryFn: () => PollService.getPollsByMeeting(meetingData.id),
		enabled: !!meetingData?.id && isOpen,
		refetchInterval: isOpen ? 15000 : false,
	});

	const { data: statsData, isLoading: isLoadingStats } = useQuery({
		queryKey: ['poll-statistics', selectedPoll?.id],
		queryFn: () => PollService.getStatistics(selectedPoll.id),
		enabled: !!selectedPoll?.id && activeTab === 'resultados',
		refetchInterval: activeTab === 'resultados' ? 15000 : false,
	});

	const createPollMutation = useMutation({
		mutationFn: (pollData) => PollService.createPoll(pollData),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['meeting-polls'] });
			setShowCreateForm(false);
			Swal.fire({
				icon: 'success', title: 'Encuesta Creada',
				toast: true, position: 'top-end',
				showConfirmButton: false, timer: 3000, backdrop: false,
			});
		},
		onError: (error) => {
			Swal.fire({ icon: 'error', title: 'Error', text: error.response?.data?.message || 'Error al crear la encuesta' });
		},
	});

	const startPollMutation = useMutation({
		mutationFn: ({ pollId, durationMinutes }) => PollService.startPoll(pollId, durationMinutes),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['meeting-polls'] });
			if (selectedPoll) setSelectedPoll(p => ({ ...p, str_status: 'active' }));
			Swal.fire({
				icon: 'success', title: 'Encuesta Iniciada',
				text: 'La encuesta está activa para votación',
				toast: true, position: 'top-end',
				showConfirmButton: false, timer: 3000, backdrop: false,
			});
		},
		onError: (error) => {
			Swal.fire({ icon: 'error', title: 'Error', text: error.response?.data?.message || 'Error al iniciar la encuesta' });
		},
	});

	const endPollMutation = useMutation({
		mutationFn: (pollId) => PollService.endPoll(pollId),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['meeting-polls'] });
			if (selectedPoll) setSelectedPoll(p => ({ ...p, str_status: 'closed' }));
			Swal.fire({
				icon: 'success', title: 'Encuesta Finalizada',
				toast: true, position: 'top-end',
				showConfirmButton: false, timer: 3000, backdrop: false,
			});
		},
		onError: (error) => {
			const msg = error?.response?.data?.message
				|| error?.response?.data?.detail
				|| error?.message
				|| 'Error al finalizar la encuesta';
			Swal.fire({ icon: 'error', title: 'Error al finalizar', text: msg });
		},
	});

	const handleStartPoll = async (poll) => {
		const result = await Swal.fire({
			title: '¿Iniciar encuesta?',
			text: 'La encuesta estará disponible para votación',
			icon: 'question',
			showCancelButton: true,
			confirmButtonColor: '#7c3aed',
			cancelButtonColor: '#6b7280',
			confirmButtonText: 'Sí, iniciar',
			cancelButtonText: 'Cancelar',
		});
		if (result.isConfirmed) {
			startPollMutation.mutate({ pollId: poll.id, durationMinutes: poll.int_duration_minutes });
		}
	};

	const handleEndPoll = async (poll) => {
		const result = await Swal.fire({
			title: '¿Finalizar encuesta?',
			text: 'No se podrán registrar más votos después de finalizar',
			icon: 'warning',
			showCancelButton: true,
			confirmButtonColor: '#dc2626',
			cancelButtonColor: '#6b7280',
			confirmButtonText: 'Sí, finalizar',
			cancelButtonText: 'Cancelar',
		});
		if (result.isConfirmed) {
			endPollMutation.mutate(poll.id);
		}
	};

	const handlePollCreated = async (pollData, startImmediately) => {
		try {
			const response = await createPollMutation.mutateAsync(pollData);
			if (startImmediately && response?.success && response?.data?.id) {
				await startPollMutation.mutateAsync({
					pollId: response.data.id,
					durationMinutes: pollData.int_duration_minutes,
				});
			}
		} catch (_) {
			// errors handled in mutation onError
		}
	};

	const handleViewResults = (poll) => {
		setSelectedPoll(poll);
		setActiveTab('resultados');
	};

	if (!isOpen) return null;

	const polls = pollsData?.data || [];
	const stats = statsData?.data?.statistics;
	const statsOptions = statsData?.data?.options || [];

	const panel = (
		<>
			{/* Panel lateral */}
			<div
				style={{
					position: 'fixed',
					top: 0,
					right: 0,
					width: '480px',
					height: '100vh',
					backgroundColor: '#ffffff',
					boxShadow: '-4px 0 24px rgba(0,0,0,0.25)',
					zIndex: 10003,
					display: 'flex',
					flexDirection: 'column',
					overflow: 'hidden',
				}}
			>
				{/* Header */}
				<div style={{
					background: 'linear-gradient(to right, #7c3aed, #6d28d9)',
					padding: '16px 20px',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'space-between',
					flexShrink: 0,
				}}>
					<div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'white' }}>
						<BarChart3 size={22} />
						<div>
							<p style={{ fontWeight: 'bold', fontSize: '16px', margin: 0 }}>Gestión de Encuestas</p>
							<p style={{ fontSize: '12px', opacity: 0.8, margin: 0 }}>{meetingData?.str_title}</p>
						</div>
					</div>
					<button
						onClick={onClose}
						style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '8px', padding: '6px', cursor: 'pointer', color: 'white', display: 'flex' }}
					>
						<X size={18} />
					</button>
				</div>

				{/* Tabs */}
				<div style={{ display: 'flex', borderBottom: '2px solid #e5e7eb', flexShrink: 0, backgroundColor: '#f9fafb' }}>
					<button
						onClick={() => setActiveTab('gestion')}
						style={{
							flex: 1, padding: '12px', border: 'none', cursor: 'pointer',
							fontWeight: '600', fontSize: '14px',
							background: activeTab === 'gestion' ? '#ffffff' : 'transparent',
							color: activeTab === 'gestion' ? '#7c3aed' : '#6b7280',
							borderBottom: activeTab === 'gestion' ? '2px solid #7c3aed' : '2px solid transparent',
							display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
							marginBottom: '-2px',
						}}
					>
						<ClipboardList size={16} />
						Gestión
					</button>
					<button
						onClick={() => setActiveTab('resultados')}
						style={{
							flex: 1, padding: '12px', border: 'none', cursor: 'pointer',
							fontWeight: '600', fontSize: '14px',
							background: activeTab === 'resultados' ? '#ffffff' : 'transparent',
							color: activeTab === 'resultados' ? '#7c3aed' : '#6b7280',
							borderBottom: activeTab === 'resultados' ? '2px solid #7c3aed' : '2px solid transparent',
							display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
							marginBottom: '-2px',
						}}
					>
						<BarChart2 size={16} />
						Resultados
					</button>
				</div>

				{/* Contenido scrollable */}
				<div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>

					{/* ===== TAB GESTIÓN ===== */}
					{activeTab === 'gestion' && (
						<div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
							{/* Botón Nueva Encuesta */}
							<button
								onClick={() => setShowCreateForm(true)}
								style={{
									width: '100%', padding: '12px', border: 'none', borderRadius: '10px',
									background: 'linear-gradient(to right, #7c3aed, #6d28d9)',
									color: 'white', fontWeight: '600', fontSize: '14px',
									cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
									boxShadow: '0 4px 12px rgba(124,58,237,0.35)',
								}}
							>
								<Plus size={18} />
								Nueva Encuesta
							</button>

							{/* Lista de encuestas */}
							{isLoadingPolls ? (
								<div style={{ textAlign: 'center', padding: '32px 0' }}>
									<Loader2 size={32} style={{ color: '#7c3aed', margin: '0 auto 8px', animation: 'spin 1s linear infinite', display: 'block' }} />
									<p style={{ color: '#6b7280', margin: 0, fontSize: '14px' }}>Cargando encuestas...</p>
								</div>
							) : polls.length === 0 ? (
								<div style={{ textAlign: 'center', padding: '40px 16px', background: '#f9fafb', borderRadius: '12px', border: '2px dashed #e5e7eb' }}>
									<AlertCircle size={36} style={{ color: '#9ca3af', margin: '0 auto 12px', display: 'block' }} />
									<p style={{ fontWeight: '600', color: '#374151', marginBottom: '4px', fontSize: '15px' }}>Sin encuestas creadas</p>
									<p style={{ color: '#6b7280', margin: 0, fontSize: '13px' }}>Crea la primera encuesta para esta reunión</p>
								</div>
							) : (
								polls.map((poll) => {
									const s = poll.str_status?.toLowerCase();
									const isDraft = s === 'draft' || s === 'borrador';
									const isActive = s === 'active' || s === 'activa';
									return (
										<div
											key={poll.id}
											style={{
												background: isActive ? '#f0fdf4' : '#ffffff',
												border: isActive ? '1.5px solid #86efac' : '1.5px solid #e5e7eb',
												borderRadius: '12px',
												padding: '14px',
											}}
										>
											<div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '10px' }}>
												<div style={{ flex: 1, minWidth: 0 }}>
													<p style={{ fontWeight: '600', color: '#111827', margin: '0 0 4px', fontSize: '14px', wordBreak: 'break-word' }}>
														{poll.str_title}
													</p>
													{poll.str_description && (
														<p style={{ color: '#6b7280', margin: '0 0 6px', fontSize: '12px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
															{poll.str_description}
														</p>
													)}
													{getStatusBadge(poll.str_status)}
												</div>
											</div>
											<div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
												{isDraft && (
													<button
														onClick={() => handleStartPoll(poll)}
														disabled={startPollMutation.isPending}
														style={{
															padding: '6px 12px', border: 'none', borderRadius: '8px',
															background: '#7c3aed', color: 'white',
															fontWeight: '600', fontSize: '12px', cursor: 'pointer',
															display: 'flex', alignItems: 'center', gap: '4px',
															opacity: startPollMutation.isPending ? 0.6 : 1,
														}}
													>
														{startPollMutation.isPending ? <Loader2 size={12} /> : <Play size={12} />}
														Iniciar
													</button>
												)}
												{isActive && (
													<button
														onClick={() => handleEndPoll(poll)}
														disabled={endPollMutation.isPending}
														style={{
															padding: '6px 12px', border: 'none', borderRadius: '8px',
															background: '#dc2626', color: 'white',
															fontWeight: '600', fontSize: '12px', cursor: 'pointer',
															display: 'flex', alignItems: 'center', gap: '4px',
															opacity: endPollMutation.isPending ? 0.6 : 1,
														}}
													>
														{endPollMutation.isPending ? <Loader2 size={12} /> : <Square size={12} />}
														Finalizar
													</button>
												)}
												<button
													onClick={() => handleViewResults(poll)}
													style={{
														padding: '6px 12px', border: '1.5px solid #7c3aed', borderRadius: '8px',
														background: 'white', color: '#7c3aed',
														fontWeight: '600', fontSize: '12px', cursor: 'pointer',
														display: 'flex', alignItems: 'center', gap: '4px',
													}}
												>
													<BarChart2 size={12} />
													Ver resultados
												</button>
											</div>
										</div>
									);
								})
							)}
						</div>
					)}

					{/* ===== TAB RESULTADOS ===== */}
					{activeTab === 'resultados' && (
						<div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
							{/* Selector de poll si no hay uno seleccionado */}
							{!selectedPoll ? (
								<>
									<p style={{ fontWeight: '600', color: '#374151', margin: '0 0 4px', fontSize: '14px' }}>
										Selecciona una encuesta para ver sus resultados:
									</p>
									{isLoadingPolls ? (
										<div style={{ textAlign: 'center', padding: '24px' }}>
											<Loader2 size={28} style={{ color: '#7c3aed', animation: 'spin 1s linear infinite', display: 'block', margin: '0 auto' }} />
										</div>
									) : polls.length === 0 ? (
										<div style={{ textAlign: 'center', padding: '40px 16px', background: '#f9fafb', borderRadius: '12px', border: '2px dashed #e5e7eb' }}>
											<AlertCircle size={36} style={{ color: '#9ca3af', margin: '0 auto 12px', display: 'block' }} />
											<p style={{ color: '#6b7280', margin: 0, fontSize: '13px' }}>No hay encuestas para esta reunión</p>
										</div>
									) : (
										polls.map((poll) => (
											<button
												key={poll.id}
												onClick={() => setSelectedPoll(poll)}
												style={{
													width: '100%', textAlign: 'left', padding: '12px 14px',
													background: '#f9fafb', border: '1.5px solid #e5e7eb', borderRadius: '10px',
													cursor: 'pointer',
													display: 'flex', alignItems: 'center', justifyContent: 'space-between',
												}}
											>
												<div>
													<p style={{ fontWeight: '600', color: '#111827', margin: '0 0 4px', fontSize: '13px' }}>{poll.str_title}</p>
													{getStatusBadge(poll.str_status)}
												</div>
												<BarChart2 size={18} style={{ color: '#7c3aed', flexShrink: 0 }} />
											</button>
										))
									)}
								</>
							) : (
								<>
									{/* Volver */}
									<button
										onClick={() => setSelectedPoll(null)}
										style={{
											background: 'none', border: 'none', cursor: 'pointer',
											color: '#7c3aed', fontWeight: '600', fontSize: '13px',
											display: 'flex', alignItems: 'center', gap: '4px', padding: '0 0 4px',
										}}
									>
										<ChevronLeft size={16} />
										Volver a encuestas
									</button>

									{/* Info del poll seleccionado */}
									<div style={{ background: '#f5f3ff', border: '1.5px solid #ddd6fe', borderRadius: '10px', padding: '12px' }}>
										<p style={{ fontWeight: '700', color: '#4c1d95', margin: '0 0 6px', fontSize: '14px' }}>{selectedPoll.str_title}</p>
										<div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
											{getStatusBadge(selectedPoll.str_status)}
											{/* Botones iniciar/finalizar inline en resultados */}
											{(selectedPoll.str_status?.toLowerCase() === 'draft' || selectedPoll.str_status?.toLowerCase() === 'borrador') && (
												<button
													onClick={() => handleStartPoll(selectedPoll)}
													disabled={startPollMutation.isPending}
													style={{ padding: '3px 10px', border: 'none', borderRadius: '6px', background: '#7c3aed', color: 'white', fontWeight: '600', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}
												>
													<Play size={10} /> Iniciar
												</button>
											)}
											{(selectedPoll.str_status?.toLowerCase() === 'active' || selectedPoll.str_status?.toLowerCase() === 'activa') && (
												<button
													onClick={() => handleEndPoll(selectedPoll)}
													disabled={endPollMutation.isPending}
													style={{ padding: '3px 10px', border: 'none', borderRadius: '6px', background: '#dc2626', color: 'white', fontWeight: '600', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}
												>
													<Square size={10} /> Finalizar
												</button>
											)}
										</div>
									</div>

									{/* Stats */}
									{isLoadingStats ? (
										<div style={{ textAlign: 'center', padding: '32px 0' }}>
											<Loader2 size={28} style={{ color: '#7c3aed', animation: 'spin 1s linear infinite', display: 'block', margin: '0 auto 8px' }} />
											<p style={{ color: '#6b7280', margin: 0, fontSize: '13px' }}>Cargando estadísticas...</p>
										</div>
									) : stats ? (
										<>
											{/* Grid de stats */}
											<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
												<div style={{ background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: '10px', padding: '12px' }}>
													<div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
														<Users size={16} style={{ color: '#2563eb' }} />
														<span style={{ fontSize: '12px', fontWeight: '600', color: '#1e40af' }}>Total Votos</span>
													</div>
													<p style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e3a8a', margin: 0 }}>{stats.total_votes || 0}</p>
												</div>
												{typeof stats.total_abstentions === 'number' && (
													<div style={{ background: '#fffbeb', border: '1.5px solid #fcd34d', borderRadius: '10px', padding: '12px' }}>
														<div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
															<AlertCircle size={16} style={{ color: '#d97706' }} />
															<span style={{ fontSize: '12px', fontWeight: '600', color: '#92400e' }}>Abstenciones</span>
														</div>
														<p style={{ fontSize: '24px', fontWeight: 'bold', color: '#78350f', margin: 0 }}>{stats.total_abstentions}</p>
													</div>
												)}
												<div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: '10px', padding: '12px' }}>
													<div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
														<TrendingUp size={16} style={{ color: '#16a34a' }} />
														<span style={{ fontSize: '12px', fontWeight: '600', color: '#14532d' }}>Participación</span>
													</div>
													<p style={{ fontSize: '24px', fontWeight: 'bold', color: '#14532d', margin: 0 }}>
														{stats.participation_percentage ? `${stats.participation_percentage.toFixed(1)}%` : '0%'}
													</p>
												</div>
												<div style={{ background: stats.quorum_reached ? '#f0fdf4' : '#fef2f2', border: `1.5px solid ${stats.quorum_reached ? '#86efac' : '#fca5a5'}`, borderRadius: '10px', padding: '12px' }}>
													<div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
														<CheckCircle size={16} style={{ color: stats.quorum_reached ? '#16a34a' : '#dc2626' }} />
														<span style={{ fontSize: '12px', fontWeight: '600', color: stats.quorum_reached ? '#14532d' : '#7f1d1d' }}>Quórum</span>
													</div>
													<p style={{ fontSize: '15px', fontWeight: 'bold', color: stats.quorum_reached ? '#15803d' : '#dc2626', margin: '0 0 2px' }}>
														{stats.quorum_reached ? 'Alcanzado' : 'No alcanzado'}
													</p>
													<p style={{ fontSize: '11px', color: '#6b7280', margin: 0 }}>Req.: {stats.required_quorum || 0}%</p>
												</div>
											</div>

											{/* Barras de resultados */}
											{statsOptions.length > 0 && (
												<div style={{ background: '#ffffff', border: '1.5px solid #e5e7eb', borderRadius: '10px', padding: '14px' }}>
													<p style={{ fontWeight: '700', color: '#111827', margin: '0 0 12px', fontSize: '14px' }}>Resultados por opción</p>
													<div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
														{statsOptions.map((option, index) => {
															const colors = [
																{ bar: 'linear-gradient(to right, #eab308, #ca8a04)', badge: '#fef9c3', text: '#854d0e', letter: '#ffffff', bg: '#eab308' },
																{ bar: 'linear-gradient(to right, #6b7280, #4b5563)', badge: '#f3f4f6', text: '#374151', letter: '#ffffff', bg: '#6b7280' },
																{ bar: 'linear-gradient(to right, #d97706, #b45309)', badge: '#fef3c7', text: '#78350f', letter: '#ffffff', bg: '#d97706' },
															];
															const c = colors[index] || colors[2];
															return (
																<div key={option.id || index}>
																	<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
																		<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
																			<span style={{ width: '24px', height: '24px', borderRadius: '50%', background: c.bg, color: c.letter, fontWeight: 'bold', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
																				{String.fromCharCode(65 + index)}
																			</span>
																			<span style={{ fontWeight: '500', color: '#1f2937', fontSize: '13px' }}>{option.str_option_text}</span>
																		</div>
																		<div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
																			<span style={{ fontWeight: 'bold', color: '#111827', fontSize: '14px' }}>{option.int_votes_count}</span>
																			<span style={{ fontSize: '11px', color: '#6b7280' }}>votos</span>
																			<span style={{ padding: '2px 8px', background: c.badge, color: c.text, borderRadius: '9999px', fontSize: '12px', fontWeight: '600' }}>
																				{option.dec_percentage?.toFixed(1)}%
																			</span>
																		</div>
																	</div>
																	<div style={{ width: '100%', background: '#e5e7eb', borderRadius: '9999px', height: '10px', overflow: 'hidden' }}>
																		<div style={{ height: '10px', borderRadius: '9999px', background: c.bar, width: `${option.dec_percentage || 0}%`, transition: 'width 0.5s ease' }} />
																	</div>
																</div>
															);
														})}
													</div>
												</div>
											)}

											{/* VotersList */}
											<VotersList pollId={selectedPoll.id} />
										</>
									) : (
										<div style={{ textAlign: 'center', padding: '32px', background: '#f9fafb', borderRadius: '10px' }}>
											<AlertCircle size={32} style={{ color: '#9ca3af', margin: '0 auto 8px', display: 'block' }} />
											<p style={{ color: '#6b7280', margin: 0, fontSize: '13px' }}>No hay estadísticas disponibles aún</p>
										</div>
									)}
								</>
							)}
						</div>
					)}
				</div>
			</div>

			{/* Modal fullscreen de creación */}
			{showCreateForm && ReactDOM.createPortal(
				<div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 10004, overflow: 'hidden' }}>
					<CreatePollView
						meeting={meetingData}
						onBack={() => setShowCreateForm(false)}
						onPollCreated={handlePollCreated}
					/>
				</div>,
				document.body
			)}
		</>
	);

	return ReactDOM.createPortal(panel, document.body);
}
