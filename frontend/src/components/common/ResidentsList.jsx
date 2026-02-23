import React, { useState, useRef, useEffect } from 'react';
import { UsersIcon, MoreVertical, Mail, Send, Shield, ShieldOff, UserCheck, UserX, Search, QrCode, Calendar, FileSpreadsheet } from 'lucide-react';
import Swal from "sweetalert2";
import ResidentActionsMenu from './ResidentActionsMenu';
import QRCodeModal from './QRCodeModal';
import Modal from './Modal';
import { jsPDF } from 'jspdf';
import QRCodeLib from 'qrcode';
import { useQuery } from '@tanstack/react-query';
import { UserService } from '../../services/api/UserService';
import { MeetingService } from '../../services/api/MeetingService';
import logoGiramaster from '../../assets/logo-giramaster.jpeg';
import ExcelJS from 'exceljs';

/**
 * Componente reutilizable para mostrar lista de residentes
 * Usado tanto en Admin Dashboard como en Super Admin Dashboard
 *
 * @param {boolean} isSuperAdmin - Si es true, puede habilitar/deshabilitar acceso a todos los usuarios incluyendo administradores.
 *                                 Si es false (Admin), solo puede habilitar/deshabilitar copropietarios (rol 3) e invitados (rol 4).
 */
const ResidentsList = ({
	residents,
	isLoading,
	onResendCredentials,
	onEditResident,
	onDeleteResident,
	onSendBulkCredentials,
	isSendingBulk,
	onToggleAccess,
	onBulkToggleAccess,
	showSearch = false, // Nueva prop para mostrar/ocultar barra de búsqueda
	title = "Residentes", // Título personalizable
	isSuperAdmin = false, // Si es SuperAdmin puede gestionar acceso de todos
	// Props para invitación a reuniones
	showInviteButton = false, // Mostrar botón de invitación
	residentialUnitId = null, // ID de la unidad residencial
	onInviteToMeeting = null, // Función callback para invitar a reunión
}) => {
	const [selectedResidents, setSelectedResidents] = useState([]);
	const [selectAll, setSelectAll] = useState(false);
	const [selectedResidentMenu, setSelectedResidentMenu] = useState(null);
	const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
	const [searchTerm, setSearchTerm] = useState('');
	const [qrModalOpen, setQrModalOpen] = useState(false);
	const [selectedResidentForQR, setSelectedResidentForQR] = useState(null);
	const [autoLoginUrl, setAutoLoginUrl] = useState('');
	const [isSendingQRs, setIsSendingQRs] = useState(false);
	const menuButtonRefs = useRef({});

	// Estado para modal de invitación a reunión
	const [showInviteModal, setShowInviteModal] = useState(false);
	const [scheduledMeetings, setScheduledMeetings] = useState([]);
	const [selectedMeeting, setSelectedMeeting] = useState('');
	const [loadingMeetings, setLoadingMeetings] = useState(false);
	const [inviting, setInviting] = useState(false);

	// Obtener datos del usuario actual para nombre de unidad residencial
	const { data: userData } = useQuery({
		queryKey: ['current-user-data'],
		queryFn: async () => {
			const response = await UserService.getCurrentUserData();
			return response.data;
		},
		retry: 1,
		refetchOnWindowFocus: false
	});

	// Extraer nombre de la unidad residencial
	const residentialUnitName = userData?.residential_unit?.str_name || 'Unidad Residencial';

	/**
	 * Determina si se puede modificar el acceso de un residente
	 * - SuperAdmin: puede modificar acceso de todos (incluyendo administradores)
	 * - Admin: solo puede modificar acceso de copropietarios (rol 3) e invitados (rol 4)
	 */
	const canToggleAccess = (resident) => {
		if (isSuperAdmin) {
			return true; // SuperAdmin puede modificar todos
		}
		// Admin solo puede modificar copropietarios (3) e invitados (4)
		const residentRole = resident.int_id_rol;
		return residentRole === 3 || residentRole === 4;
	};

	// Filtrar residentes por búsqueda
	const filteredResidents = residents?.filter((resident) => {
		if (!searchTerm) return true;
		const search = searchTerm.toLowerCase();
		return (
			resident.firstname?.toLowerCase().includes(search) ||
			resident.lastname?.toLowerCase().includes(search) ||
			resident.username?.toLowerCase().includes(search) ||
			resident.email?.toLowerCase().includes(search) ||
			resident.apartment_number?.toLowerCase().includes(search) ||
			resident.phone?.toLowerCase().includes(search)
		);
	}) || [];

	// Actualizar posición del menú cuando cambia el scroll o el tamaño de la ventana
	useEffect(() => {
		const updateMenuPosition = () => {
			if (
				selectedResidentMenu &&
				menuButtonRefs.current[selectedResidentMenu]
			) {
				const button = menuButtonRefs.current[selectedResidentMenu];
				const rect = button.getBoundingClientRect();
				const menuWidth = 192;
				const viewportWidth = window.innerWidth;
				const viewportHeight = window.innerHeight;

				let left = rect.right - menuWidth;
				if (left < 8) {
					left = 8;
				}
				if (rect.right > viewportWidth - 8) {
					left = viewportWidth - menuWidth - 8;
				}

				let top = rect.bottom + 8;
				const menuHeight = 120;
				if (top + menuHeight > viewportHeight - 8) {
					top = rect.top - menuHeight - 8;
				}
				if (top < 8) {
					top = 8;
				}

				setMenuPosition({
					top: top,
					left: left,
				});
			}
		};

		if (selectedResidentMenu) {
			updateMenuPosition();
			const scrollContainers = document.querySelectorAll(
				'[class*="overflow-y-auto"]'
			);
			scrollContainers.forEach((container) => {
				container.addEventListener('scroll', updateMenuPosition, true);
			});
			window.addEventListener('scroll', updateMenuPosition, true);
			window.addEventListener('resize', updateMenuPosition);
		}

		return () => {
			const scrollContainers = document.querySelectorAll(
				'[class*="overflow-y-auto"]'
			);
			scrollContainers.forEach((container) => {
				container.removeEventListener('scroll', updateMenuPosition, true);
			});
			window.removeEventListener('scroll', updateMenuPosition, true);
			window.removeEventListener('resize', updateMenuPosition);
		};
	}, [selectedResidentMenu]);

	// Resetear selección cuando cambian los residentes filtrados
	useEffect(() => {
		setSelectedResidents([]);
		setSelectAll(false);
	}, [searchTerm]);

	const handleSelectAll = () => {
		if (selectAll) {
			setSelectedResidents([]);
		} else {
			setSelectedResidents(filteredResidents.map((r) => r.id));
		}
		setSelectAll(!selectAll);
	};

	const handleSelectResident = (residentId) => {
		setSelectedResidents((prev) => {
			const updated = prev.includes(residentId)
				? prev.filter((id) => id !== residentId)
				: [...prev, residentId];

			setSelectAll(updated.length === filteredResidents.length);
			return updated;
		});
	};

	const handleSendBulkCredentials = () => {
		onSendBulkCredentials(selectedResidents, () => {
			setSelectedResidents([]);
			setSelectAll(false);
		});
	};

	// Función helper para convertir imagen a Base64
	const loadImageAsBase64 = (url) => {
		return new Promise((resolve, reject) => {
			const img = new Image();
			img.crossOrigin = 'Anonymous';
			img.onload = () => {
				const canvas = document.createElement('canvas');
				canvas.width = img.width;
				canvas.height = img.height;
				const ctx = canvas.getContext('2d');
				ctx.drawImage(img, 0, 0);
				resolve(canvas.toDataURL('image/jpeg'));
			};
			img.onerror = reject;
			img.src = url;
		});
	};

	// Función para agregar header en cada página del PDF
	const addHeader = (pdf, pageNumber, totalPages, logoBase64, unitName) => {
		const pageWidth = pdf.internal.pageSize.getWidth();
		const margin = 20;


		// Agregar logo (esquina superior izquierda)
		const logoWidth = 40;
		const logoHeight = 15.6; // Mantiene proporción 2.56:1 del logo 948x370
		pdf.addImage(logoBase64, 'JPEG', margin, margin - 5, logoWidth, logoHeight);


		// Título principal (centrado)
		pdf.setFontSize(16);
		pdf.setFont('helvetica', 'bold');
		pdf.setTextColor(41, 128, 185); // Azul corporativo
		pdf.text('CÓDIGOS QR DE ACCESO', pageWidth / 2, margin + 2, { align: 'center' });


		// Nombre de la unidad residencial (centrado, debajo del título)
		pdf.setFontSize(14);
		pdf.setFont('helvetica', 'bold');
		pdf.setTextColor(52, 73, 94); // Gris oscuro
		pdf.text(unitName, pageWidth / 2, margin + 10, { align: 'center' });


		// Fecha de generación (centrado, debajo de unidad)
		pdf.setFontSize(9);
		pdf.setFont('helvetica', 'normal');
		pdf.setTextColor(127, 140, 141); // Gris claro

		const currentDate = new Date().toLocaleDateString('es-ES', {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
		pdf.text(`Generado el ${currentDate}`, pageWidth / 2, margin + 16, { align: 'center' });


		// Línea separadora
		pdf.setDrawColor(189, 195, 199);
		pdf.setLineWidth(0.5);
		pdf.line(margin, margin + 20, pageWidth - margin, margin + 20);


		// Resetear colores
		pdf.setTextColor(0, 0, 0);
	};

	// Función para agregar footer en cada página del PDF
	const addFooter = (pdf, pageNumber, totalPages) => {
		const pageWidth = pdf.internal.pageSize.getWidth();
		const pageHeight = pdf.internal.pageSize.getHeight();
		const margin = 20;


		// Línea separadora superior
		pdf.setDrawColor(189, 195, 199);
		pdf.setLineWidth(0.5);
		pdf.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);


		// Número de página
		pdf.setFontSize(9);
		pdf.setFont('helvetica', 'normal');
		pdf.setTextColor(127, 140, 141);
		pdf.text(
			`Página ${pageNumber} de ${totalPages}`,
			pageWidth / 2,
			pageHeight - 8,
			{ align: 'center' }
		);


		// Marca de agua
		pdf.setFontSize(8);
		pdf.text(
			'Sistema de Gestión de Asambleas - GIRAMASTER',
			pageWidth / 2,
			pageHeight - 4,
			{ align: 'center' }
		);


		// Resetear colores
		pdf.setTextColor(0, 0, 0);
	};

	const handleGenerateBulkQRsPDF = async () => {
		if (selectedResidents.length === 0) {
			Swal.fire({
				icon: 'warning',
				title: 'Sin selección',
				text: 'Por favor, selecciona al menos un residente para generar QRs.',
				confirmButtonColor: '#3498db',
			});
			return;
		}

		// Confirmar acción
		const result = await Swal.fire({
			title: '¿Generar documento PDF con códigos QR?',
			html: `Se generará un documento PDF con <strong>${selectedResidents.length}</strong> código(s) QR (21 por página).`,
			icon: 'question',
			showCancelButton: true,
			confirmButtonColor: '#9333ea',
			cancelButtonColor: '#6b7280',
			confirmButtonText: 'Sí, generar PDF',
			cancelButtonText: 'Cancelar'
		});

		if (!result.isConfirmed) return;

		setIsSendingQRs(true);

		try {
			const token = localStorage.getItem('access_token');


			if (!token) {
				throw new Error('No hay token de autenticación. Por favor, inicia sesión nuevamente.');
			}

			console.log('🔄 Generando PDF con QRs para:', selectedResidents.length, 'residentes');

			// Mostrar progreso
			Swal.fire({
				title: 'Generando códigos QR...',
				html: 'Generando tokens de acceso para todos los residentes...',
				allowOutsideClick: false,
				allowEscapeKey: false,
				didOpen: () => {
					Swal.showLoading();
				},
			});

			const qrData = [];
			let successCount = 0;
			let errorCount = 0;
			const errors = [];

			try {
				// Petición al endpoint bulk
				const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8001/api/v1';
				const endpoint = `${apiUrl}/residents/generate-qr-bulk-simple`;

				const response = await fetch(endpoint, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'Authorization': `Bearer ${token}`
					},
					body: JSON.stringify({
						user_ids: selectedResidents,
						expiration_hours: 48
					})
				});

				if (!response.ok) {
					// Manejo especial para rate limit (429)
					if (response.status === 429) {
						const retryAfter = response.headers.get('Retry-After');
						const minutes = retryAfter ? Math.ceil(retryAfter / 60) : 5;

						await Swal.fire({
							icon: 'warning',
							title: 'Límite de solicitudes alcanzado',
							html: `Por favor, espera <strong>${minutes}</strong> minuto(s) antes de intentar nuevamente.`,
							confirmButtonColor: '#3498db'
						});

						setIsSendingQRs(false);
						return;
					}

					const errorData = await response.json().catch(() => ({ detail: 'Error desconocido' }));
					throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
				}

				const data = await response.json();
				console.log('✅ Respuesta del backend:', data);

				// Procesar tokens recibidos
				for (let i = 0; i < data.data.qr_tokens.length; i++) {
					const tokenData = data.data.qr_tokens[i];

					try {
						// Generar QR como imagen
						const qrImageUrl = await QRCodeLib.toDataURL(tokenData.auto_login_url, {
							width: 512,
							margin: 1,
							color: {
								dark: '#1e40af',
								light: '#ffffff'
							}
						});

						qrData.push({
							resident: tokenData,
							qrImageUrl
						});

						successCount++;
						console.log(`✅ QR generado para: ${tokenData.firstname} ${tokenData.lastname}`);
					} catch (qrError) {
						errorCount++;
						errors.push(`${tokenData.firstname} ${tokenData.lastname}: Error generando imagen QR`);
						console.error(`❌ Error generando imagen QR:`, qrError);
					}

					// Actualizar progreso
					Swal.update({
						html: `Generando imágenes QR: ${i + 1} de ${data.data.qr_tokens.length}`
					});
				}

				// Reportar errores del backend si los hay
				if (data.data.failed_users && data.data.failed_users.length > 0) {
					data.data.failed_users.forEach(failed => {
						errorCount++;
						errors.push(`Usuario ID ${failed.user_id}: ${failed.error}`);
					});
				}

			} catch (fetchError) {
				console.error('❌ Error en petición bulk:', fetchError);
				throw fetchError;
			}

			// Si hay al menos un QR generado, crear el PDF
			if (qrData.length > 0) {
				Swal.update({
					title: 'Creando documento PDF...',
					html: 'Preparando documento con códigos QR...'
				});

				// Crear PDF con jsPDF
				const pdf = new jsPDF({
					orientation: 'portrait',
					unit: 'mm',
					format: 'a4'
				});

				const pageWidth = pdf.internal.pageSize.getWidth();
				const pageHeight = pdf.internal.pageSize.getHeight();
				const margin = 10; // Márgenes reducidos

				// Configuración del grid: 3 columnas x 7 filas
				const cols = 3;
				const rows = 7;
				const qrsPerPage = cols * rows; // 21 QR por página

				const availableWidth = pageWidth - (2 * margin);
				const availableHeight = pageHeight - (2 * margin);

				const cellWidth = availableWidth / cols;
				const cellHeight = availableHeight / rows;

				// Tamaño del QR (ajustado para que quepa con el texto)
				const qrSize = Math.min(cellWidth * 0.75, cellHeight * 0.55);

				let currentPage = 1;
				let pageQRCount = 0;

				Swal.update({
					html: 'Generando documento con los códigos QR...'
				});

				// Iterar sobre cada QR y añadirlo al PDF
				for (let i = 0; i < qrData.length; i++) {
					const { resident, qrImageUrl } = qrData[i];

					// Calcular posición en el grid 3x7
					const col = pageQRCount % cols;
					const row = Math.floor(pageQRCount / cols);

					const x = margin + col * cellWidth;
					const y = margin + row * cellHeight;

					// Centrar QR en la celda
					const qrX = x + (cellWidth - qrSize) / 2;
					const qrY = y + 5;

					// Añadir imagen QR
					pdf.addImage(qrImageUrl, 'PNG', qrX, qrY, qrSize, qrSize);

					// Añadir nombre de la unidad residencial (arriba del nombre)
					pdf.setFontSize(7);
					pdf.setFont('helvetica', 'normal');
					pdf.setTextColor(100, 100, 100);
					const unitY = qrY + qrSize + 3;
					pdf.text(
						residentialUnitName || 'Unidad Residencial',
						x + cellWidth / 2,
						unitY,
						{ align: 'center', maxWidth: cellWidth - 4 }
					);

					// Añadir nombre del residente (centrado, debajo de unidad)
					pdf.setFontSize(9);
					pdf.setFont('helvetica', 'bold');
					pdf.setTextColor(0, 0, 0);
					const nameY = unitY + 4;
					pdf.text(
						`${resident.firstname} ${resident.lastname}`,
						x + cellWidth / 2,
						nameY,
						{ align: 'center', maxWidth: cellWidth - 4 }
					);

					// Añadir apartamento (centrado, debajo del nombre)
					pdf.setFontSize(8);
					pdf.setFont('helvetica', 'normal');
					pdf.setTextColor(80, 80, 80);
					const aptY = nameY + 3.5;
					pdf.text(
						`Apt. ${resident.apartment_number}`,
						x + cellWidth / 2,
						aptY,
						{ align: 'center' }
					);

					// Resetear color de texto
					pdf.setTextColor(0, 0, 0);

					pageQRCount++;

					// Si completamos 21 QRs y hay más residentes, añadir nueva página
					if (pageQRCount === qrsPerPage && i < qrData.length - 1) {
						pdf.addPage();
						currentPage++;
						pageQRCount = 0;
					}
				}

				// Guardar PDF
				const fileName = `QR_Residentes_${new Date().toISOString().split('T')[0]}.pdf`;
				pdf.save(fileName);

				console.log(`✅ PDF generado: ${fileName}`);
			}

			// Mostrar resultado
			if (errorCount === 0) {
				await Swal.fire({
					icon: 'success',
					title: '¡PDF generado exitosamente!',
					html: `Se generaron <strong>${successCount}</strong> código(s) QR correctamente.`,
					confirmButtonColor: '#27ae60',
				});
			} else if (successCount > 0) {
				await Swal.fire({
					icon: 'warning',
					title: 'PDF generado con advertencias',
					html: `
					<p>✅ <strong>${successCount}</strong> código(s) generado(s)</p>
					<p>❌ <strong>${errorCount}</strong> error(es)</p>
					<hr style="margin: 10px 0;">
					<p style="text-align: left; font-size: 0.9em; max-height: 200px; overflow-y: auto;">
						${errors.map(err => `• ${err}`).join('<br>')}
					</p>
				`,
					confirmButtonColor: '#f39c12',
				});
			} else {
				await Swal.fire({
					icon: 'error',
					title: 'Error al generar PDF',
					html: `
					<p>No se pudo generar ningún código QR.</p>
					<hr style="margin: 10px 0;">
					<p style="text-align: left; font-size: 0.9em; max-height: 200px; overflow-y: auto;">
						${errors.map(err => `• ${err}`).join('<br>')}
					</p>
				`,
					confirmButtonColor: '#e74c3c',
				});
			}

		} catch (error) {
			console.error('❌ Error generando PDF:', error);
			await Swal.fire({
				icon: 'error',
				title: 'Error al generar PDF',
				text: error.message || 'Ocurrió un error inesperado al intentar generar el documento PDF.',
				confirmButtonColor: '#e74c3c',
			});
		} finally {
			setIsSendingQRs(false);
		}
	};

	const handleDownloadExcel = async () => {
		if (selectedResidents.length === 0) {
			Swal.fire({
				icon: 'warning',
				title: 'Sin selección',
				text: 'Por favor, selecciona al menos un residente para generar el Excel.',
				confirmButtonColor: '#3498db',
			});
			return;
		}

		const result = await Swal.fire({
			title: '¿Descargar Excel con tokens QR?',
			html: `Se generará un Excel con <strong>${selectedResidents.length}</strong> residente(s).<br/>
               <small style="color:#888">⚠️ Esto regenerará los tokens de acceso de los seleccionados.</small>`,
			icon: 'question',
			showCancelButton: true,
			confirmButtonColor: '#16a34a',
			cancelButtonColor: '#6b7280',
			confirmButtonText: 'Sí, descargar',
			cancelButtonText: 'Cancelar'
		});

		if (!result.isConfirmed) return;

		Swal.fire({
			title: 'Generando tokens...',
			html: 'Espera mientras se generan los tokens de acceso...',
			allowOutsideClick: false,
			allowEscapeKey: false,
			didOpen: () => Swal.showLoading(),
		});

		try {
			const token = localStorage.getItem('access_token');
			if (!token) throw new Error('No hay token de autenticación.');

			const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8001/api/v1';
			const response = await fetch(`${apiUrl}/residents/generate-qr-bulk-simple`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${token}`
				},
				body: JSON.stringify({
					user_ids: selectedResidents,
					expiration_hours: 48
				})
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(errorData.detail || `Error HTTP ${response.status}`);
			}

			const data = await response.json();
			const tokens = data.data?.qr_tokens || [];

			if (!tokens.length) throw new Error('No se obtuvieron datos del servidor.');

			// Crear workbook con ExcelJS
			const workbook = new ExcelJS.Workbook();
			workbook.creator = 'GIRAMASTER';
			workbook.created = new Date();

			// Agregar worksheet
			const worksheet = workbook.addWorksheet('Tokens QR');

			// Agregar encabezados
			worksheet.addRow(['Nombre', 'Apartamento', 'URL de Acceso']);

			// Aplicar estilo a los encabezados
			const headerRow = worksheet.getRow(1);
			headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
			headerRow.fill = {
				type: 'pattern',
				pattern: 'solid',
				fgColor: { argb: '3498DB' }
			};
			headerRow.alignment = { horizontal: 'center' };

			// Agregar datos
			tokens.forEach((item) => {
				worksheet.addRow([
					`${item.firstname || ''} ${item.lastname || ''}`.trim(),
					item.apartment_number || '',
					item.auto_login_url || ''
				]);
			});

			// Ajustar anchos de columna
			worksheet.getColumn(1).width = 35;
			worksheet.getColumn(2).width = 18;
			worksheet.getColumn(3).width = 90;

			// Nombre del archivo con fecha
			const fecha = new Date().toISOString().slice(0, 10);
			const nombreArchivo = `tokens_qr_${residentialUnitName?.replace(/\s+/g, '_') || 'residentes'}_${fecha}.xlsx`;

			// Generar y descargar el archivo
			const buffer = await workbook.xlsx.writeBuffer();
			const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
			const link = document.createElement('a');
			link.href = URL.createObjectURL(blob);
			link.download = nombreArchivo;
			link.click();
			URL.revokeObjectURL(link.href);

			Swal.fire({
				icon: 'success',
				title: '¡Excel descargado!',
				html: `Se generaron <strong>${tokens.length}</strong> tokens de acceso.<br/>
                   <small style="color:#888">Los tokens tienen vigencia de 48 horas.</small>`,
				confirmButtonColor: '#16a34a',
				timer: 4000,
				timerProgressBar: true,
			});

		} catch (error) {
			console.error('❌ Error al generar Excel:', error);
			Swal.fire({
				icon: 'error',
				title: 'Error al generar Excel',
				text: error.message || 'Ocurrió un error inesperado.',
				confirmButtonColor: '#e74c3c'
			});
		}
	};

	// ========== FUNCIONES DE INVITACIÓN A REUNIONES ==========

	// Cargar reuniones programadas
	const loadScheduledMeetings = async () => {
		if (!residentialUnitId) return;

		setLoadingMeetings(true);
		try {
			const response = await MeetingService.getMeetingsByResidentialUnit(residentialUnitId);
			if (response.success && response.data) {
				const programmed = response.data.filter((m) => m.str_status === 'Programada');
				setScheduledMeetings(programmed);
			}
		} catch (err) {
			console.error('Error al cargar reuniones:', err);
		} finally {
			setLoadingMeetings(false);
		}
	};

	// Abrir modal de invitación
	const handleOpenInviteModal = async () => {
		setSelectedMeeting('');
		await loadScheduledMeetings();
		setShowInviteModal(true);
	};

	// Cerrar modal de invitación
	const handleCloseInviteModal = () => {
		setShowInviteModal(false);
		setSelectedMeeting('');
	};

	// Enviar invitaciones
	const handleSendInvitations = async () => {
		if (!selectedMeeting || selectedResidents.length === 0) {
			Swal.fire({
				icon: 'warning',
				title: 'Validación',
				text: 'Por favor seleccione una reunión y al menos un residente',
			});
			return;
		}

		setInviting(true);
		try {
			const response = await MeetingService.createBatchInvitations(
				parseInt(selectedMeeting),
				selectedResidents
			);

			if (response.success) {
				Swal.fire({
					icon: 'success',
					title: 'Invitaciones Enviadas',
					html: `
						<div class="text-center">
							<p class="mb-2">Se crearon <strong>${response.data?.invitations_created || 0}</strong> invitaciones</p>
							${response.data?.failed > 0 ? `<p class="text-red-500">Fallidas: ${response.data.failed}</p>` : ''}
						</div>
					`,
				});
				handleCloseInviteModal();
				if (onInviteToMeeting) {
					onInviteToMeeting();
				}
			} else {
				throw new Error(response.message || 'Error al enviar invitaciones');
			}
		} catch (err) {
			console.error('Error al enviar invitaciones:', err);
			Swal.fire({
				icon: 'error',
				title: 'Error',
				text: err.response?.data?.message || err.message || 'Error al enviar invitaciones',
			});
		} finally {
			setInviting(false);
		}
	};

	const handleGenerateQR = async (resident) => {
		try {
			// Mostrar loading
			Swal.fire({
				title: 'Generando acceso...',
				html: 'Creando enlace de acceso directo',
				allowOutsideClick: false,
				allowEscapeKey: false,
				didOpen: () => {
					Swal.showLoading();
				},
			});

			// Llamar a la API para generar el token de auto-login (endpoint simple)
			const token = localStorage.getItem('access_token');


			if (!token) {
				throw new Error('No hay token de autenticación. Por favor, inicia sesión nuevamente.');
			}


			const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8001/api/v1';
			const endpoint = `${apiUrl}/residents/generate-qr-simple`;


			console.log('🔄 Making request to:', endpoint);
			console.log('🔄 Request data:', { userId: resident.id });
			console.log('🔄 Auth token:', token.substring(0, 20) + '...');


			const response = await fetch(endpoint, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${token}`
				},
				body: JSON.stringify({
					userId: resident.id
				})
			});


			console.log('🔄 Response status:', response.status);
			console.log('🔄 Response headers:', Object.fromEntries(response.headers.entries()));

			if (response.ok) {
				const data = await response.json();
				console.log('✅ Response from backend:', data);


				if (!data.success) {
					throw new Error(data.message || 'Error en la respuesta del servidor');
				}


				if (!data.data || !data.data.auto_login_token) {
					throw new Error('Respuesta inválida: falta token de acceso');
				}


				const token = data.data.auto_login_token;
				// ✅ Usar window.location.origin para obtener la URL del frontend
				const frontendUrl = window.location.origin;
				const url = `${frontendUrl}/auto-login/${token}`;


				console.log('✅ QR URL generated:', url);
				console.log('✅ Frontend URL:', frontendUrl);


				setAutoLoginUrl(url);
				setSelectedResidentForQR(resident);
				setQrModalOpen(true);


				Swal.close();
			} else {
				const errorData = await response.json().catch(() => ({}));
				console.error('❌ Backend error response:', errorData);
				throw new Error(errorData.message || `Error HTTP ${response.status}: ${response.statusText}`);
			}
		} catch (error) {
			console.error('❌ Error generating QR:', error);
			console.error('❌ Error details:', {
				message: error.message,
				stack: error.stack,
				resident: resident
			});


			// Mostrar error más detallado
			let errorMessage = 'No se pudo generar el código QR de acceso';


			if (error.message) {
				if (error.message.includes('403')) {
					errorMessage = 'No tienes permisos para generar códigos QR';
				} else if (error.message.includes('404')) {
					errorMessage = 'Usuario no encontrado';
				} else if (error.message.includes('500')) {
					errorMessage = 'Error interno del servidor. Revisa la consola para más detalles.';
				} else {
					errorMessage = `Error: ${error.message}`;
				}
			}


			Swal.fire({
				icon: 'error',
				title: 'Error al generar QR',
				html: `
					<p>${errorMessage}</p>
					<p style="font-size: 12px; color: #666; margin-top: 10px;">
						Abre la consola del navegador (F12) para ver más detalles del error.
					</p>
				`,
				confirmButtonColor: '#e74c3c'
			});
		}
	};

	const handleMenuOpen = (residentId, event) => {
		event.stopPropagation();
		const button = event.currentTarget;

		if (selectedResidentMenu === residentId) {
			setSelectedResidentMenu(null);
		} else {
			const rect = button.getBoundingClientRect();
			const menuWidth = 192;
			const viewportWidth = window.innerWidth;
			const viewportHeight = window.innerHeight;

			let left = rect.right - menuWidth;
			if (left < 8) {
				left = 8;
			}
			if (rect.right > viewportWidth - 8) {
				left = viewportWidth - menuWidth - 8;
			}

			let top = rect.bottom + 8;
			const menuHeight = 120;
			if (top + menuHeight > viewportHeight - 8) {
				top = rect.top - menuHeight - 8;
			}
			if (top < 8) {
				top = 8;
			}

			setMenuPosition({
				top: top,
				left: left,
			});
			setSelectedResidentMenu(residentId);
		}
	};

	return (
		<div
			className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col"
			style={{ maxHeight: '700px' }}
		>
			<div className="p-6 border-b border-gray-200 shrink-0">
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
					<h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
						<UsersIcon size={24} />
						{title} ({filteredResidents?.length || 0})
					</h2>

					{/* Barra de acciones masivas - solo visible cuando hay selección */}
					{selectedResidents.length > 0 && (
						<div className="flex flex-col gap-3 bg-gray-50 rounded-lg p-3 border border-gray-200">
							{/* Primera fila: contador y botón de limpiar */}
							<div className="flex items-center justify-between gap-2">
								<span className="text-sm font-semibold text-gray-700 whitespace-nowrap">
									{selectedResidents.length} seleccionado(s)
								</span>
								<button
									onClick={() => setSelectedResidents([])}
									className="text-xs text-red-500 hover:text-red-700 font-medium"
								>
									Limpiar selección
								</button>
							</div>

							{/* Segunda fila: botones de acciones */}
							<div className="flex flex-wrap gap-2">
								{/* Botón enviar credenciales */}
								<button
									onClick={handleSendBulkCredentials}
									disabled={isSendingBulk}
									className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-xs font-medium disabled:opacity-50"
									title="Enviar credenciales por correo"
								>
									{isSendingBulk ? (
										<svg className="animate-spin h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
											<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
											<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
										</svg>
									) : (
										<Send size={14} />
									)}
									<span>Credenciales</span>
								</button>

								{/* Botón generar PDF QRs */}
								<button
									onClick={handleGenerateBulkQRsPDF}
									disabled={isSendingQRs}
									className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500 text-white rounded-md hover:bg-purple-600 transition-colors text-xs font-medium disabled:opacity-50"
									title="Generar PDF con códigos QR"
								>
									{isSendingQRs ? (
										<svg className="animate-spin h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
											<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
											<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
										</svg>
									) : (
										<QrCode size={14} />
									)}
									<span>PDF QRs</span>
								</button>

								<button
									onClick={handleDownloadExcel}
									className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-xs font-medium"
									title="Descargar Excel con nombre, apartamento y token QR"
								>
									<FileSpreadsheet size={14} />
									<span>Excel QRs</span>
								</button>

								{/* Botón habilitar acceso */}
								<button
									onClick={() => {
										const modifiableResidents = selectedResidents.filter((id) => {
											const resident = filteredResidents.find((r) => r.id === id);
											return resident && canToggleAccess(resident);
										});
										if (modifiableResidents.length > 0) {
											onBulkToggleAccess(modifiableResidents, true);
										} else {
											Swal.fire({
												icon: 'warning',
												title: 'Sin permisos',
												text: 'No tienes permisos para modificar el acceso de los usuarios seleccionados.',
												confirmButtonColor: '#3498db',
											});
										}
									}}
									className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors text-xs font-medium"
									title="Habilitar acceso"
								>
									<Shield size={14} />
									<span>Habilitar</span>
								</button>

								{/* Botón deshabilitar acceso */}
								<button
									onClick={() => {
										const modifiableResidents = selectedResidents.filter((id) => {
											const resident = filteredResidents.find((r) => r.id === id);
											return resident && canToggleAccess(resident);
										});
										if (modifiableResidents.length > 0) {
											onBulkToggleAccess(modifiableResidents, false);
										} else {
											Swal.fire({
												icon: 'warning',
												title: 'Sin permisos',
												text: 'No tienes permisos para modificar el acceso de los usuarios seleccionados.',
												confirmButtonColor: '#3498db',
											});
										}
									}}
									className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors text-xs font-medium"
									title="Deshabilitar acceso"
								>
									<ShieldOff size={14} />
									<span>Deshabilitar</span>
								</button>

								{/* Botón invitar a reunión - solo si showInviteButton es true */}
								{showInviteButton && (
									<button
										onClick={handleOpenInviteModal}
										className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors text-xs font-medium"
										title="Invitar a reunión programada"
									>
										<Calendar size={14} />
										<span>Invitar</span>
									</button>
								)}
							</div>
						</div>
					)}
				</div>

				{/* Barra de búsqueda (opcional) */}
				{showSearch && (
					<div className="relative">
						<Search
							className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"
							size={20}
						/>
						<input
							type="text"
							placeholder="Buscar por nombre, usuario, email, teléfono o apartamento..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3498db] focus:border-transparent"
						/>
					</div>
				)}
			</div>

			<div
				className="flex-1 overflow-y-auto overflow-x-hidden"
				style={{ minHeight: 0 }}
			>
				{isLoading ? (
					<div className="flex items-center justify-center py-12">
						<svg
							className="animate-spin h-8 w-8 text-[#3498db]"
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
					</div>
				) : filteredResidents && filteredResidents.length > 0 ? (
					<>
						{/* Checkbox para seleccionar todos */}
						<div className="px-4 py-3 bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
							<label className="flex items-center gap-3 cursor-pointer">
								<input
									type="checkbox"
									checked={selectAll}
									onChange={handleSelectAll}
									className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
								/>
								<span className="text-sm font-semibold text-gray-700">
									Seleccionar todos ({filteredResidents.length})
								</span>
							</label>
						</div>

						{/* Lista de residentes */}
						<div className="divide-y divide-gray-200">
							{filteredResidents.map((resident) => (
								<div
									key={resident.id}
									className="p-4 hover:bg-gray-50 transition-colors relative"
								>
									<div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-3">

										{/* Checkbox individual */}
										<input
											type="checkbox"
											checked={selectedResidents.includes(resident.id)}
											onChange={() => handleSelectResident(resident.id)}
											onClick={(e) => e.stopPropagation()}
											className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer shrink-0"
										/>

										{/* Información del residente */}
										<div className="flex-1 min-w-0">
											<p className="font-semibold text-gray-800 truncate">
												{resident.firstname} {resident.lastname}
											</p>
											<p className="text-sm text-gray-600 mt-1">
												Apt. {resident.apartment_number}
											</p>
											{resident.email && (
												<p className="text-xs text-gray-500 truncate">
													{resident.email}
												</p>
											)}
										</div>

										{/* Indicador de estado */}
										<div className="shrink-0 mr-2">
											<span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${resident.bln_allow_entry
												? 'bg-green-100 text-green-700'
												: 'bg-red-100 text-red-700'
												}`}>
												{resident.bln_allow_entry ? 'Activo' : 'Inactivo'}
											</span>
										</div>

										{/* Botones de acción */}
										<div className="flex items-center gap-2 shrink-0">

											{/* Botón para enviar WhatsApp */}
											<button
												onClick={(e) => {
													e.stopPropagation();

													if (!resident?.phone) {
														Swal.fire({
															icon: 'error',
															title: 'Sin número de WhatsApp',
															text: 'Este usuario no posee un número de WhatsApp registrado.',
															confirmButtonText: 'Cerrar',
															confirmButtonColor: '#25D366',
														});
														return;
													}

													const phone = resident.phone.replace(/\D/g, "");
													window.open(`https://wa.me/${phone}`, "_blank");
												}}
												className="p-2 hover:bg-green-100 rounded-lg transition-colors"
												title="Enviar WhatsApp"
											>
												<img src="/Wpp.png" alt="WhatsApp" className="w-5 h-5" />
											</button>

											{/* Botón para generar QR */}
											<button
												onClick={(e) => {
													e.stopPropagation();
													handleGenerateQR(resident);
												}}
												className="p-2 hover:bg-purple-100 rounded-lg transition-colors group"
												title="Generar código QR de acceso"
											>
												<QrCode size={20} className="text-purple-600 group-hover:text-purple-700" />
											</button>

											{/* Botón para enviar credenciales individual */}
											<button
												onClick={(e) => {
													e.stopPropagation();
													onResendCredentials(resident);
												}}
												className="p-2 hover:bg-blue-100 rounded-lg transition-colors group"
												title="Enviar credenciales por correo"
											>
												<Mail size={20} className="text-blue-600 group-hover:text-blue-700" />
											</button>

											{/* Botón de toggle access - solo visible si puede modificar el acceso */}
											{canToggleAccess(resident) && (
												<button
													onClick={(e) => {
														e.stopPropagation();
														onToggleAccess(resident);
													}}
													className={`p-2 rounded-lg transition-colors group ${resident.bln_allow_entry ? 'hover:bg-red-100' : 'hover:bg-green-100'
														}`}
													title={resident.bln_allow_entry ? 'Deshabilitar acceso' : 'Habilitar acceso'}
												>
													{resident.bln_allow_entry ? (
														<UserX size={20} className="text-red-600 group-hover:text-red-700" />
													) : (
														<UserCheck size={20} className="text-green-600 group-hover:text-green-700" />
													)}
												</button>
											)}

											{/* Botón del menú de 3 puntos */}
											<button
												ref={(el) => {
													if (el) {
														menuButtonRefs.current[resident.id] = el;
													}
												}}
												onClick={(e) => handleMenuOpen(resident.id, e)}
												className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
											>
												<MoreVertical size={20} className="text-gray-600" />
											</button>
										</div>
									</div>
								</div>
							))}
						</div>
					</>
				) : (
					<div className="text-center py-12">
						<UsersIcon className="mx-auto text-gray-400 mb-4" size={48} />
						<p className="text-gray-600">
							{searchTerm
								? 'No se encontraron residentes con esa búsqueda'
								: 'No hay residentes registrados'}
						</p>
					</div>
				)}
			</div>

			{/* Menú de acciones */}
			{selectedResidentMenu && (
				<ResidentActionsMenu
					resident={filteredResidents.find((r) => r.id === selectedResidentMenu)}
					position={menuPosition}
					onView={() => { }}
					onEdit={onEditResident}
					onDelete={onDeleteResident}
					onGenerateQR={handleGenerateQR}
					onClose={() => setSelectedResidentMenu(null)}
				/>
			)}

			{/* Modal de QR Code */}
			{selectedResidentForQR && (
				<QRCodeModal
					resident={selectedResidentForQR}
					isOpen={qrModalOpen}
					onClose={() => {
						setQrModalOpen(false);
						setSelectedResidentForQR(null);
						setAutoLoginUrl('');
					}}
					autoLoginUrl={autoLoginUrl}
				/>
			)}

			{/* Modal de Invitación a Reunión */}
			{showInviteButton && (
				<Modal
					isOpen={showInviteModal}
					onClose={handleCloseInviteModal}
					title="Invitar a Reunión"
					size="md"
				>
					<div className="space-y-4">
						{/* Información de selección */}
						<div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
							<p className="text-blue-800 text-sm">
								<strong>{selectedResidents.length}</strong> residente(s) seleccionado(s)
							</p>
						</div>

						{/* Selector de reunión */}
						<div>
							<label className="block text-sm font-semibold text-gray-700 mb-2">
								Seleccionar Reunión Programada
							</label>
							{loadingMeetings ? (
								<div className="flex items-center justify-center py-4">
									<div className="animate-spin h-5 w-5 border-2 border-[#3498db] border-t-transparent rounded-full"></div>
									<span className="ml-2 text-gray-600 text-sm">Cargando reuniones...</span>
								</div>
							) : scheduledMeetings.length === 0 ? (
								<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
									<p className="text-yellow-800 text-sm">
										No hay reuniones programadas para esta unidad residencial.
									</p>
								</div>
							) : (
								<select
									value={selectedMeeting}
									onChange={(e) => setSelectedMeeting(e.target.value)}
									className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3498db] focus:border-transparent text-sm"
								>
									<option value="">-- Seleccione una reunión --</option>
									{scheduledMeetings.map((meeting) => (
										<option key={meeting.id} value={meeting.id}>
											{meeting.str_title} - {new Date(meeting.dat_schedule_date).toLocaleString()}
										</option>
									))}
								</select>
							)}
						</div>

						{/* Lista de residentes seleccionados */}
						{selectedResidents.length > 0 && (
							<div>
								<label className="block text-sm font-semibold text-gray-700 mb-2">
									Residentes a invitar:
								</label>
								<div className="bg-gray-50 border border-gray-200 rounded-lg p-2 max-h-32 overflow-y-auto">
									<ul className="space-y-1">
										{residents
											.filter((r) => selectedResidents.includes(r.id))
											.map((r) => (
												<li key={r.id} className="flex items-center gap-2 text-xs text-gray-700">
													<span className="text-green-500">✓</span>
													{r.firstname} {r.lastname} - {r.apartment_number}
												</li>
											))}
									</ul>
								</div>
							</div>
						)}

						{/* Botones de acción */}
						<div className="flex justify-end gap-3 pt-3 border-t border-gray-200">
							<button
								onClick={handleCloseInviteModal}
								className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
							>
								Cancelar
							</button>
							<button
								onClick={handleSendInvitations}
								disabled={!selectedMeeting || selectedResidents.length === 0 || inviting}
								className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${selectedMeeting && selectedResidents.length > 0 && !inviting
									? 'bg-green-500 text-white hover:bg-green-600'
									: 'bg-gray-200 text-gray-400 cursor-not-allowed'
									}`}
							>
								{inviting ? (
									<>
										<div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
										Enviando...
									</>
								) : (
									<>
										<Send size={16} />
										Enviar Invitaciones
									</>
								)}
							</button>
						</div>
					</div>
				</Modal>
			)}
		</div>
	);
};

export default ResidentsList;
