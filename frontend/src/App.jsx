import { Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './providers/AppProvider';
import { ProtectedRoute } from './components/Auth/ProtectedRoute';
import { RoleBasedRoute } from './components/Auth/RoleBasedRoute';
import AutoLogin from './components/Auth/AutoLogin';
import React from 'react';
import Login from './pages/Login';
import HomeSA from './pages/HomeSA';
import AppAdmin from './pages/AdDashboard.jsx'
import AppCopropietario from './pages/CoDashboard.jsx'
import NotFound from './pages/NotFound';
import './App.css';

function App() {
	return (
		<AppProvider>
			<Routes>
				{/* ========================================== */}
				{/* RUTAS PÚBLICAS (NO REQUIEREN AUTENTICACIÓN) */}
				{/* ========================================== */}

				{/* Ruta pública - Login */}
				<Route path="/login" element={<Login />} />

				{/* ✅ Ruta pública - Auto-Login (DEBE ESTAR AQUÍ, NO DENTRO DE ProtectedRoute) */}
				<Route path="/auto-login/:token" element={<AutoLogin />} />

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

					{/* Ruta para Administrador */}
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
							<RoleBasedRoute allowedRoles={['Usuario', 'Invitado']}>
								<AppCopropietario />
							</RoleBasedRoute>
						}
					/>

					{/* Ruta index - Redirige según el rol del usuario */}
					<Route index element={<Navigate to="/login" replace />} />
				</Route>

				{/* Ruta 404 - Página no encontrada */}
				<Route path="*" element={<NotFound />} />
			</Routes>
		</AppProvider>
	);
}

export default App;