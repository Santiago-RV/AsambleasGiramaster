import { Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './providers/AppProvider';
import { ProgressNotificationProvider } from './contexts/ProgressNotificationContext';
import ProgressNotificationToast from './components/common/ProgressNotificationToast';
import { ProtectedRoute } from './components/Auth/ProtectedRoute';
import { RoleBasedRoute } from './components/Auth/RoleBasedRoute';
import AutoLogin from './components/Auth/AutoLogin';
import React, { Suspense, lazy } from 'react';
import Login from './pages/Login';
import { Toaster } from 'react-hot-toast';
import './App.css';

// Los dashboards se cargan bajo demanda: cada uno arrastra sus propias
// dependencias pesadas (Zoom SDK, chart.js, jsPDF, ExcelJS) y ningún usuario
// entra a los tres. Login y AutoLogin quedan estáticos por ser la puerta de
// entrada y no hacer esperar una descarga extra.
const HomeSA = lazy(() => import('./pages/HomeSA'));
const AppAdmin = lazy(() => import('./pages/AdDashboard.jsx'));
const AppCopropietario = lazy(() => import('./pages/CoDashboard.jsx'));
const PresencialVotingPage = lazy(() => import('./pages/PresencialVotingPage'));
const NotFound = lazy(() => import('./pages/NotFound'));

const RouteFallback = () => (
	<div className="w-full min-h-screen flex items-center justify-center">
		<div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
	</div>
);

function App() {
	return (
		
		<ProgressNotificationProvider>
			<Toaster position="top-end" />
			<ProgressNotificationToast />
			<AppProvider>
				<div className="w-full min-h-screen overflow-x-hidden">
					<Suspense fallback={<RouteFallback />}>
					<Routes>
						{/* ========================================== */}
						{/* RUTAS PÚBLICAS (NO REQUIEREN AUTENTICACIÓN) */}
						{/* ========================================== */}
						
						{/* Ruta pública - Login */}
						<Route path="/login" element={<Login />} />
						
						{/* ✅ Ruta pública - Auto-Login (DEBE ESTAR AQUÍ, NO DENTRO DE ProtectedRoute) */}
						<Route path="/auto-login/:token" element={<AutoLogin />} />
						
						{/* ✅ Ruta pública - Votación Presencial (no requiere autenticación previa) */}
						<Route path="/votacion-presencial/:meetingId" element={<PresencialVotingPage />} />

						{/* ========================================== */}
						{/* RUTAS PROTEGIDAS (REQUIEREN AUTENTICACIÓN) */}
						{/* ========================================== */}
						
						<Route path="/" element={<ProtectedRoute />}>
							{/* Ruta para Super Administrador */}
							<Route
								path="super-admin"
								element={
									<RoleBasedRoute allowedRoles={['Super Administrador']}>
										<HomeSA />
									</RoleBasedRoute>
								}
							/>

								<Route
									path="admin"
									element={
										<RoleBasedRoute allowedRoles={['Administrador']}>
											<AppAdmin />
										</RoleBasedRoute>
									}
								/>

							{/* Ruta para Copropietario/Usuario */}
							<Route
								path="copropietario"
								element={
									<RoleBasedRoute allowedRoles={['Usuario']}>
										<AppCopropietario />
									</RoleBasedRoute>
								}
							/>

								<Route index element={<Navigate to="/login" replace />} />
							</Route>

							<Route path="*" element={<NotFound />} />
					</Routes>
					</Suspense>
				</div>
			</AppProvider>
		</ProgressNotificationProvider>
	);
}

export default App;