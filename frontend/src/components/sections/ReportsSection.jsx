import React from "react";

const ReportsSection = () => {
  return (
    <div className="content-section" id="reports">
      <div className="form-container">
        <h2 className="form-title"> Centro de Informes y Reportes</h2>

        <div className="form-grid">
          <div className="form-group">
            <label>Seleccionar Unidad Residencial</label>
            <select id="report-client">
              <option>Todas las unidades</option>
              <option>Torres del Parque</option>
              <option>Conjunto Palmeras</option>
              <option>Edificio Central</option>
            </select>
          </div>
          <div className="form-group">
            <label>Rango de Fechas</label>
            <input type="date" id="report-start-date" />
          </div>
          <div className="form-group">
            <label>Hasta</label>
            <input type="date" id="report-end-date" />
          </div>
          <div className="form-group">
            <label>Tipo de Reporte</label>
            <select id="report-type">
              <option>Todos los reportes</option>
              <option>Asistencia</option>
              <option>Votaciones</option>
              <option>Poderes</option>
              <option>Estadísticas Generales</option>
            </select>
          </div>
        </div>

        <div style={{ marginTop: "1.5rem" }}>
          <button className="btn btn-success"> Generar Reporte</button>
          <button className="btn btn-warning"> Vista Previa</button>
          <button className="btn"> Exportar PDF</button>
          <button className="btn"> Exportar Excel</button>
        </div>
      </div>

      <div className="table-container">
        <div className="table-header">
          <h3> Historial de Reportes Generados</h3>
          <button className="btn"> Organizar por Fecha</button>
        </div>
        <table>
          <thead>
            <tr>
              <th>Unidad Residencial</th>
              <th>Fecha Asamblea</th>
              <th>Tipo Reporte</th>
              <th>Generado</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Torres del Parque</td>
              <td>2025-01-15</td>
              <td>Completo (Asistencia + Votaciones)</td>
              <td>2025-01-15 18:30</td>
              <td>
                <span className="status-badge status-active">Disponible</span>
              </td>
              <td>
                <button className="btn btn-success">Ver</button>
                <button className="btn">PDF</button>
                <button className="btn">Excel</button>
                <button className="btn btn-danger">Borrar</button>
              </td>
            </tr>
            <tr>
              <td>Edificio Central</td>
              <td>2025-01-10</td>
              <td>Votaciones</td>
              <td>2025-01-10 19:15</td>
              <td>
                <span className="status-badge status-active">Disponible</span>
              </td>
              <td>
                <button className="btn btn-success">Ver</button>
                <button className="btn">PDF</button>
                <button className="btn">Excel</button>
                <button className="btn btn-danger">Borrar</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="form-container">
        <h2 className="form-title">Vista Previa del Reporte</h2>
        <div
          id="report-preview"
          style={{
            background: "#f8f9fa",
            padding: "2rem",
            borderRadius: "8px",
            minHeight: "300px",
          }}
        >
          <div style={{ textAlign: "center", color: "#7f8c8d" }}>
            Selecciona los parámetros y haz clic en "Vista Previa" para ver el
            reporte
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsSection;
