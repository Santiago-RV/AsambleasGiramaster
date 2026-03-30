import React, { useState, useEffect } from 'react';
import {
	X,
	Calendar,
	Building2,
	Users,
	CheckCircle,
	CheckCircle2,
	Clock,
	Vote,
	User,
	Mail,
	Phone,
	Video,
	Home,
	FileText,
	TrendingUp,
	Bell,
	Download,
	Loader2,
	Wifi,
	WifiOff,
	BarChart3,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
	formatMeetingStartTime,
	calculateMeetingDuration,
	getPollStatusColor,
	formatAttendanceType,
	getInitials,
	getAllLlamadosSA,
	getLlamadoReportSA,
} from '../../../services/api/ActiveMeetingService';

const NOMBRES_LLAMADO = ['Primer', 'Segundo', 'Tercer'];

const ActiveMeetingDetailsModal = ({ isOpen, onClose, meetingDetails }) => {
	const [llamados, setLlamados] = useState({ '1': null, '2': null, '3': null });
	const [loadingLlamados, setLoadingLlamados] = useState(false);
	const [downloadingPdf, setDownloadingPdf] = useState(null);
	const [llamadoExpandido, setLlamadoExpandido] = useState(null);

	useEffect(() => {
		if (isOpen && meetingDetails?.meeting_id) {
			cargarLlamados(meetingDetails.meeting_id);
		}
	}, [isOpen, meetingDetails?.meeting_id]);

	const cargarLlamados = async (meetingId) => {
		try {
			setLoadingLlamados(true);
			const response = await getAllLlamadosSA(meetingId);
			if (response.success) {
				setLlamados(response.data.llamados || { '1': null, '2': null, '3': null });
			}
		} catch {
			// silencioso: si falla, se muestran sin datos
		} finally {
			setLoadingLlamados(false);
		}
	};

	const handleDescargarPdf = async (numero) => {
		try {
			setDownloadingPdf(numero);
			const response = await getLlamadoReportSA(meetingDetails.meeting_id, numero);
			if (!response.success) return;

			const { meeting, residential_unit, snapshot } = response.data;
			generarPdfLlamado(numero, meeting, residential_unit, snapshot);
		} catch (err) {
			console.error('Error al generar PDF:', err);
			alert('No se pudo generar el PDF del llamado.');
		} finally {
			setDownloadingPdf(null);
		}
	};

	const generarPdfLlamado = (numero, meeting, residentialUnit, snapshot) => {
		const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
		const nombreLlamado = NOMBRES_LLAMADO[numero - 1];
		const timestamp = snapshot.timestamp
			? new Date(snapshot.timestamp).toLocaleString('es-CO', {
					day: '2-digit', month: 'long', year: 'numeric',
					hour: '2-digit', minute: '2-digit', hour12: true,
				})
			: '—';

		// Encabezado
		doc.setFillColor(79, 70, 229); // indigo-600
		doc.rect(0, 0, 210, 30, 'F');
		doc.setTextColor(255, 255, 255);
		doc.setFontSize(16);
		doc.setFont('helvetica', 'bold');
		doc.text(`${nombreLlamado} Llamado de Asistencia`, 14, 13);
		doc.setFontSize(10);
		doc.setFont('helvetica', 'normal');
		doc.text(`${residentialUnit.name}  ·  NIT: ${residentialUnit.nit || '—'}`, 14, 22);

		// Datos de la reunión
		doc.setTextColor(50, 50, 50);
		doc.setFontSize(9);
		doc.text(`Reunión: ${meeting.title}`, 14, 38);
		doc.text(`Fecha programada: ${meeting.scheduled_date ? new Date(meeting.scheduled_date).toLocaleDateString('es-CO') : '—'}`, 14, 44);
		doc.text(`Llamado registrado: ${timestamp}`, 14, 50);

		// Resumen de quórum
		doc.setFillColor(238, 242, 255); // indigo-50
		doc.roundedRect(14, 56, 182, 22, 3, 3, 'F');
		doc.setFontSize(10);
		doc.setFont('helvetica', 'bold');
		doc.setTextColor(79, 70, 229);
		doc.text('Resumen de Quórum', 18, 63);
		doc.setFont('helvetica', 'normal');
		doc.setFontSize(9);
		doc.setTextColor(50, 50, 50);
		doc.text(
			`Presentes: ${snapshot.present?.length || 0}   ·   Ausentes: ${snapshot.absent?.length || 0}   ·   Quórum activo: ${snapshot.connected_quorum?.toFixed(4) || '0'}   ·   Quórum total: ${snapshot.total_quorum?.toFixed(4) || '0'}   ·   %: ${snapshot.quorum_percentage || 0}%`,
			18, 72
		);

		// Tabla Presentes
		const presentRows = (snapshot.present || []).map((u, i) => [
			i + 1,
			u.full_name,
			u.apartment_number,
			Number(u.quorum_base).toFixed(4),
			u.attendance_type === 'Delegado' ? 'Delegado' : 'Titular',
		]);

		doc.setFontSize(11);
		doc.setFont('helvetica', 'bold');
		doc.setTextColor(22, 101, 52); // green-800
		doc.text(`Presentes (${snapshot.present?.length || 0})`, 14, 86);

		autoTable(doc, {
			startY: 89,
			head: [['#', 'Nombre', 'Apartamento', 'Quórum Base', 'Tipo']],
			body: presentRows.length > 0 ? presentRows : [['', 'Sin presentes', '', '', '']],
			headStyles: { fillColor: [22, 163, 74], textColor: 255, fontStyle: 'bold', fontSize: 8 },
			bodyStyles: { fontSize: 8 },
			alternateRowStyles: { fillColor: [240, 253, 244] },
			margin: { left: 14, right: 14 },
		});

		// Tabla Ausentes
		const ausentesStartY = doc.lastAutoTable.finalY + 10;
		const absentRows = (snapshot.absent || []).map((u, i) => [
			i + 1,
			u.full_name,
			u.apartment_number,
			Number(u.quorum_base).toFixed(4),
			u.has_delegated ? 'Cedió poder' : '—',
		]);

		doc.setFontSize(11);
		doc.setFont('helvetica', 'bold');
		doc.setTextColor(153, 27, 27); // red-800
		doc.text(`Ausentes (${snapshot.absent?.length || 0})`, 14, ausentesStartY);

		autoTable(doc, {
			startY: ausentesStartY + 3,
			head: [['#', 'Nombre', 'Apartamento', 'Quórum Base', 'Observación']],
			body: absentRows.length > 0 ? absentRows : [['', 'Sin ausentes', '', '', '']],
			headStyles: { fillColor: [220, 38, 38], textColor: 255, fontStyle: 'bold', fontSize: 8 },
			bodyStyles: { fontSize: 8 },
			alternateRowStyles: { fillColor: [255, 241, 242] },
			margin: { left: 14, right: 14 },
		});

		// Pie de página
		const pageCount = doc.internal.getNumberOfPages();
		for (let i = 1; i <= pageCount; i++) {
			doc.setPage(i);
			doc.setFontSize(7);
			doc.setTextColor(150, 150, 150);
			doc.text(
				`Generado el ${new Date().toLocaleString('es-CO')}  ·  Página ${i} de ${pageCount}`,
				14,
				doc.internal.pageSize.height - 8
			);
		}

		doc.save(`llamado_${numero}_${meeting.title.replace(/\s+/g, '_')}.pdf`);
	};

	if (!isOpen || !meetingDetails) return null;

	const duration = calculateMeetingDuration(meetingDetails.actual_start_time);

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
			<div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
				{/* Header */}
				<div className="bg-gradient-to-r from-green-500 to-green-600 p-6 text-white">
					<div className="flex items-center justify-between mb-4">
						<div className="flex items-center gap-4 flex-1">
							<div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
								<Video size={32} />
							</div>
							<div className="flex-1">
								<h2 className="text-2xl font-bold mb-1">
									{meetingDetails.title}
								</h2>
								<p className="text-green-100 flex items-center gap-2">
									<Building2 size={16} />
									{meetingDetails.residential_unit?.name || meetingDetails.residential_unit_name}
								</p>
							</div>
						</div>
						<button
							onClick={onClose}
							className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
						>
							<X size={24} />
						</button>
					</div>

					{/* Stats rápidos */}
					<div className="grid grid-cols-4 gap-4">
						<div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
							<div className="flex items-center gap-2 text-green-100 text-xs mb-1">
								<Clock size={14} />
								<span>Duración</span>
							</div>
							<p className="text-xl font-bold">{duration}</p>
						</div>
						<div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
							<div className="flex items-center gap-2 text-green-100 text-xs mb-1">
								<Users size={14} />
								<span>Conectados</span>
							</div>
							<p className="text-xl font-bold">
								{meetingDetails.connected_users.length} /{' '}
								{meetingDetails.total_invited}
							</p>
						</div>
						<div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
							<div className="flex items-center gap-2 text-green-100 text-xs mb-1">
								<CheckCircle size={14} />
								<span>Quórum</span>
							</div>
							<p className="text-xl font-bold">
								{meetingDetails.quorum_reached ? 'Sí' : 'No'}
							</p>
						</div>
						<div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
							<div className="flex items-center gap-2 text-green-100 text-xs mb-1">
								<Vote size={14} />
								<span>Encuestas</span>
							</div>
							<p className="text-xl font-bold">
								{meetingDetails.polls.length}
							</p>
						</div>
					</div>
				</div>

				{/* Content */}
				<div className="flex-1 overflow-y-auto p-6">
					<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
						{/* Columna izquierda */}
						<div className="lg:col-span-2 space-y-6">
							{/* Información de la reunión */}
							<div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
								<h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
									<FileText size={20} />
									Información de la Reunión
								</h3>
								<div className="space-y-3">
									<div className="flex items-start gap-3">
										<Calendar className="text-gray-500 mt-1" size={18} />
										<div>
											<p className="text-sm text-gray-500">Fecha programada</p>
											<p className="font-semibold text-gray-800">
												{formatMeetingStartTime(meetingDetails.scheduled_date)}
											</p>
										</div>
									</div>
									<div className="flex items-start gap-3">
										<Clock className="text-gray-500 mt-1" size={18} />
										<div>
											<p className="text-sm text-gray-500">Hora de inicio real</p>
											<p className="font-semibold text-gray-800">
												{formatMeetingStartTime(meetingDetails.actual_start_time)}
											</p>
										</div>
									</div>
									{meetingDetails.description && (
										<div className="flex items-start gap-3">
											<FileText className="text-gray-500 mt-1" size={18} />
											<div>
												<p className="text-sm text-gray-500">Descripción</p>
												<p className="font-medium text-gray-800">
													{meetingDetails.description}
												</p>
											</div>
										</div>
									)}
								</div>
							</div>

							{/* Llamados de Asistencia */}
							<div className="bg-white rounded-xl p-5 border border-indigo-200">
								<h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
									<Bell size={20} className="text-indigo-600" />
									Llamados de Asistencia
									{loadingLlamados && (
										<Loader2 size={16} className="animate-spin text-indigo-400" />
									)}
								</h3>
								<div className="space-y-3">
									{[1, 2, 3].map((num) => {
										const llamadoInfo = llamados[String(num)];
										const registrado = llamadoInfo?.registered ?? false;
										const nombreLlamado = NOMBRES_LLAMADO[num - 1];
										const expandido = llamadoExpandido === num;

										return (
											<div
												key={num}
												className={`rounded-xl border-2 overflow-hidden ${
													registrado
														? 'border-indigo-300 bg-indigo-50'
														: 'border-gray-200 bg-gray-50'
												}`}
											>
												{/* Cabecera del llamado */}
												<div className="flex items-center justify-between p-3">
													<div className="flex items-center gap-2">
														{registrado ? (
															<CheckCircle2 size={18} className="text-indigo-600 shrink-0" />
														) : (
															<Bell size={18} className="text-gray-400 shrink-0" />
														)}
														<div>
															<span className="font-semibold text-sm">
																{nombreLlamado} Llamado
															</span>
															{!registrado && (
																<p className="text-xs text-gray-400">Sin registrar</p>
															)}
														</div>
													</div>
													{registrado && (
														<div className="flex items-center gap-2">
															<span className="text-xs font-medium text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">
																{snapshot.quorum_percentage ?? 0}% quórum
															</span>
															<button
																onClick={() => setLlamadoExpandido(expandido ? null : num)}
																className="text-xs text-indigo-600 hover:underline"
															>
																{expandido ? 'Ocultar' : 'Ver detalle'}
															</button>
															<button
																onClick={() => handleDescargarPdf(num)}
																disabled={downloadingPdf === num}
																title="Descargar PDF"
																className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white text-xs rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
															>
																{downloadingPdf === num ? (
																	<Loader2 size={13} className="animate-spin" />
																) : (
																	<Download size={13} />
																)}
																PDF
															</button>
														</div>
													)}
												</div>

												{/* Detalle expandible */}
												{registrado && expandido && snapshot && (
													<div className="border-t border-indigo-200 p-3 bg-white">
														{/* Mini stats */}
														<div className="grid grid-cols-3 gap-2 mb-3">
															<div className="text-center bg-green-50 rounded-lg py-2">
																<p className="text-xs text-green-600 font-medium flex items-center justify-center gap-1">
																	<Wifi size={11} /> Presentes
																</p>
																<p className="text-lg font-bold text-green-700">
																	{snapshot.present?.length || 0}
																</p>
															</div>
															<div className="text-center bg-red-50 rounded-lg py-2">
																<p className="text-xs text-red-600 font-medium flex items-center justify-center gap-1">
																	<WifiOff size={11} /> Ausentes
																</p>
																<p className="text-lg font-bold text-red-700">
																	{snapshot.absent?.length || 0}
																</p>
															</div>
															<div className="text-center bg-indigo-50 rounded-lg py-2">
																<p className="text-xs text-indigo-600 font-medium flex items-center justify-center gap-1">
																	<BarChart3 size={11} /> Quórum
																</p>
																<p className="text-lg font-bold text-indigo-700">
																	{snapshot.quorum_percentage ?? 0}%
																</p>
															</div>
														</div>

														{/* Listas compactas */}
														<div className="grid grid-cols-2 gap-3 max-h-52 overflow-y-auto">
															<div>
																<p className="text-xs font-semibold text-green-700 mb-1">
																	Presentes
																</p>
																{snapshot.present?.slice(0, 20).map((u) => (
																	<div key={u.user_id} className="text-xs text-gray-700 py-0.5 border-b border-gray-100 truncate">
																		{u.full_name}
																		<span className="text-gray-400 ml-1">
																			· {u.apartment_number}
																		</span>
																	</div>
																))}
																{(snapshot.present?.length || 0) > 20 && (
																	<p className="text-xs text-gray-400 mt-1">
																		+{snapshot.present.length - 20} más
																	</p>
																)}
															</div>
															<div>
																<p className="text-xs font-semibold text-red-700 mb-1">
																	Ausentes
																</p>
																{snapshot.absent?.slice(0, 20).map((u) => (
																	<div key={u.user_id} className="text-xs text-gray-700 py-0.5 border-b border-gray-100 truncate">
																		{u.full_name}
																		<span className="text-gray-400 ml-1">
																			· {u.apartment_number}
																		</span>
																	</div>
																))}
																{(snapshot.absent?.length || 0) > 20 && (
																	<p className="text-xs text-gray-400 mt-1">
																		+{snapshot.absent.length - 20} más
																	</p>
																)}
															</div>
														</div>
													</div>
												)}
											</div>
										);
									})}
								</div>
							</div>

							{/* Administrador */}
							{meetingDetails.administrator && (
								<div className="bg-blue-50 rounded-xl p-5 border border-blue-200">
									<h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
										<User size={20} />
										Administrador
									</h3>
									<div className="flex items-center gap-4">
										<div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg">
											{getInitials(meetingDetails.administrator.full_name)}
										</div>
										<div className="flex-1">
											<p className="font-bold text-gray-800">
												{meetingDetails.administrator.full_name}
											</p>
											<div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
												<Mail size={14} />
												{meetingDetails.administrator.email}
											</div>
											{meetingDetails.administrator.phone && (
												<div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
													<Phone size={14} />
													{meetingDetails.administrator.phone}
												</div>
											)}
										</div>
									</div>
								</div>
							)}

							{/* Encuestas */}
							<div className="bg-white rounded-xl p-5 border border-gray-200">
								<h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
									<Vote size={20} />
									Encuestas ({meetingDetails.polls.length})
								</h3>
								<div className="space-y-3 max-h-64 overflow-y-auto">
									{meetingDetails.polls.length > 0 ? (
										meetingDetails.polls.map((poll) => (
											<div
												key={poll.poll_id}
												className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
											>
												<div className="flex items-start justify-between mb-2">
													<div className="flex-1">
														<h4 className="font-semibold text-gray-800 mb-1">
															{poll.title}
														</h4>
														{poll.description && (
															<p className="text-sm text-gray-600">
																{poll.description}
															</p>
														)}
													</div>
													<span
														className={`px-2 py-1 rounded-full text-xs font-semibold ${getPollStatusColor(poll.status)} whitespace-nowrap ml-2`}
													>
														{poll.status}
													</span>
												</div>
												<div className="flex items-center gap-4 text-sm text-gray-600 mt-2">
													<div className="flex items-center gap-1">
														<TrendingUp size={14} />
														<span>{poll.total_votes} votos</span>
													</div>
													<span>•</span>
													<span>{poll.poll_type}</span>
													{poll.requires_quorum && (
														<>
															<span>•</span>
															<span>Quórum: {poll.minimum_quorum_percentage}%</span>
														</>
													)}
												</div>
											</div>
										))
									) : (
										<p className="text-center text-gray-500 py-8">
											No hay encuestas creadas
										</p>
									)}
								</div>
							</div>
						</div>

						{/* Columna derecha - Participantes */}
						<div className="space-y-6">
							<div className="bg-white rounded-xl p-5 border border-gray-200">
								<h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
									<Users size={20} />
									Participantes Conectados ({meetingDetails.connected_users.length})
								</h3>
								<div className="space-y-2 max-h-[600px] overflow-y-auto">
									{meetingDetails.connected_users.length > 0 ? (
										meetingDetails.connected_users.map((user) => (
											<div
												key={user.user_id}
												className="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
											>
												<div className="flex items-center gap-3">
													<div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
														{getInitials(user.full_name)}
													</div>
													<div className="flex-1 min-w-0">
														<p className="font-semibold text-gray-800 text-sm truncate">
															{user.full_name}
														</p>
														<div className="flex items-center gap-2 text-xs text-gray-500">
															<Home size={12} />
															<span>Apto. {user.apartment_number}</span>
															<span>•</span>
															<span>{formatAttendanceType(user.attendance_type)}</span>
														</div>
														<div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
															<span>Peso: {user.voting_weight}</span>
														</div>
													</div>
													{user.is_present && (
														<div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0 animate-pulse"></div>
													)}
												</div>
											</div>
										))
									) : (
										<p className="text-center text-gray-500 py-8">
											No hay usuarios conectados
										</p>
									)}
								</div>
							</div>

							{/* Información de la unidad */}
							<div className="bg-purple-50 rounded-xl p-5 border border-purple-200">
								<h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
									<Building2 size={20} />
									Unidad Residencial
								</h3>
								<div className="space-y-2">
									<p className="text-sm text-gray-600">Nombre</p>
									<p className="font-semibold text-gray-800">
										{meetingDetails.residential_unit?.name || meetingDetails.residential_unit_name}
									</p>
									<p className="text-sm text-gray-600 mt-3">NIT</p>
									<p className="font-semibold text-gray-800">
										{meetingDetails.residential_unit?.nit || meetingDetails.residential_unit_nit}
									</p>
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* Footer */}
				<div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
					{meetingDetails.zoom_join_url && (
						<a
							href={meetingDetails.zoom_join_url}
							target="_blank"
							rel="noopener noreferrer"
							className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2"
						>
							<Video size={18} />
							Unirse a Zoom
						</a>
					)}
					<button
						onClick={onClose}
						className="px-6 py-2 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700 transition-colors"
					>
						Cerrar
					</button>
				</div>
			</div>
		</div>
	);
};

export default ActiveMeetingDetailsModal;
