import React from "react";

const UsersSection = () => {
  return (
    <div className="content-section" id="users">
      <div className="form-container">
        <h2 className="form-title">Gestión de Usuarios y Roles</h2>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-info">
              <h3>156</h3>
              <p>Super Administradores</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-info">
              <h3>1,247</h3>
              <p>Administradores</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-info">
              <h3>8,932</h3>
              <p>Invitados Activos</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-info">
              <h3>23,456</h3>
              <p>Total Copropietarios</p>
            </div>
          </div>
        </div>

        <div className="form-grid">
          <div className="form-group">
            <label>Nombre Completo</label>
            <input type="text" placeholder="Ej: Carlos Administrador" />
          </div>
          <div className="form-group">
            <label>Correo Electrónico</label>
            <input type="email" placeholder="carlos@email.com" />
          </div>
          <div className="form-group">
            <label>Rol del Usuario</label>
            <select>
              <option>Super Administrador</option>
              <option>Administrador</option>
              <option>Invitado</option>
            </select>
          </div>
          <div className="form-group">
            <label>Unidad Residencial (si aplica)</label>
            <select>
              <option>Todas las unidades</option>
              <option>Torres del Parque</option>
              <option>Conjunto Palmeras</option>
              <option>Edificio Central</option>
            </select>
          </div>
          <div className="form-group">
            <label>Contraseña</label>
            <input type="password" placeholder="Contraseña" />
          </div>
          <div className="form-group">
            <label>Estado</label>
            <select>
              <option>Activo</option>
              <option>Inactivo</option>
              <option>Pendiente</option>
            </select>
          </div>
        </div>

        <div style={{ marginTop: "1.5rem" }}>
          <button className="btn btn-success">Crear Usuario</button>
          <button className="btn btn-warning">Enviar Credenciales</button>
        </div>
      </div>

      <div className="table-container">
        <div className="table-header">
          <h3>Lista de Usuarios del Sistema</h3>
          <div className="search-box">
            <select
              style={{
                padding: "0.5rem",
                border: "2px solid #ecf0f1",
                borderRadius: "6px",
                marginRight: "1rem",
              }}
            >
              <option>Todos los roles</option>
              <option>Super Administradores</option>
              <option>Administradores</option>
              <option>Invitados</option>
            </select>
            <input type="text" placeholder="Buscar usuario..." />
            <button className="btn">Buscar</button>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Correo</th>
              <th>Rol</th>
              <th>Unidad Asignada</th>
              <th>Último Acceso</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <div
                    className="user-avatar"
                    style={{
                      width: "32px",
                      height: "32px",
                      fontSize: "0.8rem",
                    }}
                  >
                    JA
                  </div>
                  <strong>Juan Administrador</strong>
                </div>
              </td>
              <td>juan.admin@adminpro.com</td>
              <td>
                <span
                  className="status-badge"
                  style={{ background: "#d5f4e6", color: "#27ae60" }}
                >
                  Super Admin
                </span>
              </td>
              <td>Torres del Parque</td>
              <td>2025-01-15 14:30</td>
              <td>
                <span className="status-badge status-active">Activo</span>
              </td>
              <td>
                <button className="btn btn-warning">Editar</button>
                <button className="btn btn-danger">Eliminar</button>
              </td>
            </tr>
            <tr>
              <td>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <div
                    className="user-avatar"
                    style={{
                      width: "32px",
                      height: "32px",
                      fontSize: "0.8rem",
                    }}
                  >
                    MG
                  </div>
                  <strong>María González</strong>
                </div>
              </td>
              <td>maria.gonzalez@conjuntopalmeras.com</td>
              <td>
                <span
                  className="status-badge"
                  style={{ background: "#fef5e7", color: "#f39c12" }}
                >
                  Administrador
                </span>
              </td>
              <td>Conjunto Palmeras</td>
              <td>2025-01-14 09:15</td>
              <td>
                <span className="status-badge status-active">Activo</span>
              </td>
              <td>
                <button className="btn btn-warning">Editar</button>
                <button className="btn btn-danger">Eliminar</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UsersSection;
