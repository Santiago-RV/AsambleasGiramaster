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
			<div className="w-full min-h-screen overflow-x-hidden">
				<Routes>
					{/* RUTAS PÚBLICAS */}
					<Route path="/login" element={<Login />} />
					<Route path="/auto-login/:token" element={<AutoLogin />} />

					{/* RUTAS PROTEGIDAS */}
					<Route path="/" element={<ProtectedRoute />}>
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
			</div>
		</AppProvider>
	);
}

export default App;