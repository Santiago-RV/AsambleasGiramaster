import React from "react";

const AssembliesSection = () => {
  // función placeholder para el botón "Agregar Usuario"
  const addUserRow = () => {
    console.log("Agregar usuario (aquí metes la lógica)");
  };

  // función placeholder para subir archivos
  const triggerUpload = (id) => {
    document.getElementById(id)?.click();
  };

  return (
    <div className="content-section" id="assemblies">
      <div className="form-container">
        <h2 className="form-title"> Configurar Nueva Asamblea</h2>
        <form>
          <div className="form-grid">
            <div className="form-group">
              <label>Seleccionar Unidad Residencial</label>
              <select>
                <option>Seleccione una unidad...</option>
                <option>Torres del Parque</option>
                <option>Conjunto Palmeras</option>
                <option>Edificio Central</option>
              </select>
            </div>

            <div className="form-group">
              <label>Logo/Imagen de la Unidad</label>
              <div
                className="file-upload"
                onClick={() => triggerUpload("logo-upload")}
              >
                <input
                  type="file"
                  id="logo-upload"
                  style={{ display: "none" }}
                  accept="image/*"
                />
                📷 Subir Logo (Opcional)
              </div>
            </div>

            <div className="form-group">
              <label>Cantidad de Copropietarios</label>
              <input type="number" placeholder="Ej: 120" id="copropietarios-count" />
            </div>

            <div className="form-group">
              <label>Fecha de Inicio</label>
              <input type="datetime-local" />
            </div>

            <div className="form-group">
              <label>Hora de Citación</label>
              <input type="time" />
            </div>

            <div className="form-group">
              <label>Segunda Convocatoria</label>
              <input type="datetime-local" />
            </div>

            <div className="form-group">
              <label>Link de Zoom</label>
              <input type="url" placeholder="https://zoom.us/j/1234567890" />
            </div>

            <div className="form-group">
              <label>Fecha Habilitación Plataforma</label>
              <input type="date" />
            </div>

            <div className="form-group">
              <label>Fecha Fin Plataforma</label>
              <input type="date" />
            </div>
          </div>

          <h3 className="form-title"> Crear Usuarios con Roles</h3>
          <div id="users-container">
            <div className="user-form-row">
              <div className="form-grid">
                <div className="form-group">
                  <label>Nombre Completo</label>
                  <input type="text" placeholder="Ej: María González" />
                </div>
                <div className="form-group">
                  <label>Correo Electrónico</label>
                  <input type="email" placeholder="maria@email.com" />
                </div>
                <div className="form-group">
                  <label>Rol</label>
                  <select>
                    <option>Administrador</option>
                    <option>Invitado</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Contraseña</label>
                  <input type="password" placeholder="Contraseña" />
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            className="btn"
            onClick={addUserRow}
          >
            Agregar Usuario
          </button>

          <h3 className="form-title"> Base de Datos Copropietarios</h3>
          <div
            className="file-upload"
            onClick={() => triggerUpload("excel-upload")}
          >
            <input
              type="file"
              id="excel-upload"
              style={{ display: "none" }}
              accept=".xlsx,.xls"
            />
            Subir Excel con Copropietarios
            <p
              style={{
                fontSize: "0.9rem",
                color: "#7f8c8d",
                marginTop: "0.5rem",
              }}
            >
              Formato: Apartamento, Nombre, Correo, WhatsApp, etc.
            </p>
          </div>

          <div style={{ marginTop: "2rem" }}>
            <button type="submit" className="btn btn-success">
              Crear Asamblea
            </button>
            <button type="button" className="btn btn-warning">
              Enviar Invitaciones
            </button>
            <button type="button" className="btn">
              Generar QR (PDF)
            </button>
            <button type="button" className="btn">
              Generar Excel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AssembliesSection;
