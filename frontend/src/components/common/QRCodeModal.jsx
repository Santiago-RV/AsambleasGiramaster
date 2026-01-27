import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { X, Mail, MessageCircle, Printer, Download, Share2 } from 'lucide-react';
import Swal from 'sweetalert2';

const QRCodeModal = ({ 
	resident, 
	isOpen, 
	onClose, 
	autoLoginUrl 
}) => {
	const [qrCodeUrl, setQrCodeUrl] = useState('');
	const [isGenerating, setIsGenerating] = useState(false);
	const [isSending, setIsSending] = useState(false);

	// Generar QR Code cuando se abre el modal
	useEffect(() => {
		if (isOpen && autoLoginUrl) {
			generateQRCode();
		}
	}, [isOpen, autoLoginUrl]);

	const generateQRCode = async () => {
		setIsGenerating(true);
		try {
			const qrDataUrl = await QRCode.toDataURL(autoLoginUrl, {
				width: 300,
				margin: 2,
				color: {
					dark: '#1e40af',
					light: '#ffffff'
				}
			});
			setQrCodeUrl(qrDataUrl);
		} catch (error) {
			console.error('Error generating QR code:', error);
			Swal.fire({
				icon: 'error',
				title: 'Error',
				text: 'No se pudo generar el código QR',
				confirmButtonColor: '#e74c3c'
			});
		} finally {
			setIsGenerating(false);
		}
	};

	const handleSendEmail = async () => {
		if (!resident?.email) {
			Swal.fire({
				icon: 'warning',
				title: 'Sin correo electrónico',
				text: 'El residente no tiene un correo electrónico registrado.',
				confirmButtonColor: '#3498db'
			});
			return;
		}

		setIsSending(true);
		try {
			// Aquí llamarías a tu API para enviar el correo con el QR
			Swal.fire({
				icon: 'success',
				title: '¡Enviado!',
				text: `El código QR ha sido enviado a ${resident.email}`,
				confirmButtonColor: '#27ae60'
			});
		} catch (error) {
			Swal.fire({
				icon: 'error',
				title: 'Error',
				text: 'No se pudo enviar el correo electrónico',
				confirmButtonColor: '#e74c3c'
			});
		} finally {
			setIsSending(false);
		}
	};

	const handleShareWhatsApp = () => {
		if (!resident?.phone) {
			Swal.fire({
				icon: 'warning',
				title: 'Sin teléfono',
				text: 'El residente no tiene un número de teléfono registrado.',
				confirmButtonColor: '#3498db'
			});
			return;
		}

		const phone = resident.phone.replace(/\D/g, "");
		const message = `Hola ${resident.firstname} ${resident.lastname}, te comparto tu código de acceso directo al sistema: ${autoLoginUrl}`;
		window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
	};

	const handlePrint = () => {
		const printWindow = window.open('', '_blank');
		printWindow.document.write(`
			<html>
				<head>
					<title>Código de Acceso - ${resident.firstname} ${resident.lastname}</title>
					<style>
						body { 
							font-family: Arial, sans-serif; 
							text-align: center; 
							padding: 20px;
							margin: 0;
						}
						.header {
							margin-bottom: 30px;
						}
						.qr-container {
							margin: 20px auto;
							display: inline-block;
						}
						.resident-info {
							background: #f8f9fa;
							padding: 15px;
							border-radius: 8px;
							margin: 20px auto;
							max-width: 400px;
							text-align: left;
						}
						.info-row {
							margin: 8px 0;
							display: flex;
							justify-content: space-between;
						}
						.label {
							font-weight: bold;
							color: #495057;
						}
						.url {
							font-size: 12px;
							color: #6c757d;
							word-break: break-all;
							margin-top: 10px;
						}
						.footer {
							margin-top: 30px;
							font-size: 12px;
							color: #6c757d;
						}
						@media print {
							body { padding: 10px; }
							.no-print { display: none; }
						}
					</style>
				</head>
				<body>
					<div class="header">
						<h2>Código de Acceso al Sistema</h2>
						<p>Asambleas Giramaster</p>
					</div>
					
					<div class="qr-container">
						<img src="${qrCodeUrl}" alt="Código QR de Acceso" />
					</div>
					
					<div class="resident-info">
						<div class="info-row">
							<span class="label">Nombre:</span>
							<span>${resident.firstname} ${resident.lastname}</span>
						</div>
						<div class="info-row">
							<span class="label">Usuario:</span>
							<span>${resident.username}</span>
						</div>
						<div class="info-row">
							<span class="label">Apartamento:</span>
							<span>${resident.apartment_number}</span>
						</div>
						${resident.email ? `
						<div class="info-row">
							<span class="label">Email:</span>
							<span>${resident.email}</span>
						</div>
						` : ''}
						<div class="url">
							<strong>URL de Acceso:</strong><br>
							${autoLoginUrl}
						</div>
					</div>
					
					<div class="footer">
						<p>Este código QR proporciona acceso directo y seguro al sistema.</p>
						<p>Generado el: ${new Date().toLocaleDateString('es-ES')}</p>
					</div>
				</body>
			</html>
		`);
		printWindow.document.close();
		printWindow.print();
	};

	const handleDownload = () => {
		const link = document.createElement('a');
		link.download = `QR_${resident.firstname}_${resident.lastname}.png`;
		link.href = qrCodeUrl;
		link.click();
	};

	const handleCopyLink = async () => {
		try {
			await navigator.clipboard.writeText(autoLoginUrl);
			Swal.fire({
				icon: 'success',
				title: '¡Copiado!',
				text: 'El enlace ha sido copiado al portapapeles',
				timer: 2000,
				showConfirmButton: false,
				confirmButtonColor: '#27ae60'
			});
		} catch (error) {
			Swal.fire({
				icon: 'error',
				title: 'Error',
				text: 'No se pudo copiar el enlace',
				confirmButtonColor: '#e74c3c'
			});
		}
	};

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
			<div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
				{/* Header */}
				<div className="flex items-center justify-between p-6 border-b border-gray-200">
					<h3 className="text-xl font-bold text-gray-800">
						Código QR de Acceso
					</h3>
					<button
						onClick={onClose}
						className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
					>
						<X size={24} className="text-gray-500" />
					</button>
				</div>

				{/* Body */}
				<div className="p-6">
					{/* Info del residente */}
					<div className="bg-blue-50 p-4 rounded-lg mb-6">
						<h4 className="font-semibold text-gray-800 mb-2">
							{resident.firstname} {resident.lastname}
						</h4>
						<div className="text-sm text-gray-600 space-y-1">
							<p>Usuario: {resident.username}</p>
							<p>Apartamento: {resident.apartment_number}</p>
							{resident.email && <p>Email: {resident.email}</p>}
						</div>
					</div>

					{/* QR Code */}
					<div className="flex justify-center mb-6">
						{isGenerating ? (
							<div className="w-[300px] h-[300px] flex items-center justify-center bg-gray-100 rounded-lg">
								<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
							</div>
						) : (
							qrCodeUrl && (
								<div className="p-4 bg-white rounded-lg shadow-md">
									<img 
										src={qrCodeUrl} 
										alt="Código QR de Acceso"
										className="w-[300px] h-[300px]"
									/>
								</div>
							)
						)}
					</div>

					{/* URL de acceso */}
					{autoLoginUrl && (
						<div className="bg-gray-50 p-3 rounded-lg mb-6">
							<p className="text-xs text-gray-500 mb-1">Enlace de acceso directo:</p>
							<p className="text-xs text-gray-700 break-all font-mono">
								{autoLoginUrl}
							</p>
						</div>
					)}

					{/* Botones de acción */}
					<div className="grid grid-cols-2 gap-3">
						<button
							onClick={handleSendEmail}
							disabled={isSending || !resident.email}
							className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
						>
							<Mail size={18} />
							<span className="hidden sm:inline">Enviar por email</span>
							<span className="sm:hidden">Email</span>
						</button>

						<button
							onClick={handleShareWhatsApp}
							disabled={!resident.phone}
							className="flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
						>
							<MessageCircle size={18} />
							<span className="hidden sm:inline">WhatsApp</span>
							<span className="sm:hidden">WPP</span>
						</button>

						<button
							onClick={handlePrint}
							className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
						>
							<Printer size={18} />
							<span className="hidden sm:inline">Imprimir</span>
							<span className="sm:hidden">Imprimir</span>
						</button>

						<button
							onClick={handleDownload}
							disabled={!qrCodeUrl}
							className="flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
						>
							<Download size={18} />
							<span className="hidden sm:inline">Descargar</span>
							<span className="sm:hidden">Descargar</span>
						</button>

						<button
							onClick={handleCopyLink}
							className="flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium col-span-2"
						>
							<Share2 size={18} />
							Copiar enlace
						</button>
					</div>

					{/* Nota informativa */}
					<div className="mt-6 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
						<p className="text-xs text-yellow-800">
							<strong>Importante:</strong> Este código QR proporciona acceso directo al sistema.
							Manténlo en un lugar seguro y no lo compartas con personas no autorizadas.
						</p>
					</div>
				</div>
			</div>
		</div>
	);
};

export default QRCodeModal;