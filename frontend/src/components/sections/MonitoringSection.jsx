import React from "react";

const MonitoringSection = () => {
  const monitorAssembly = (id) => {
    console.log("Ingresando a asamblea:", id);
  };

  return (
    <div className="content-section" id="monitoring">
      <div className="table-container">
        <div className="table-header">
          <h3> Monitoreo de Asambleas</h3>
          <div className="search-box">
            <select
              style={{
                padding: "0.5rem",
                border: "2px solid #ecf0f1",
                borderRadius: "6px",
                marginRight: "1rem",
              }}
            >
              <option>Todas las asambleas</option>
              <option>Solo activas</option>
              <option>Solo finalizadas</option>
              <option>Programadas</option>
            </select>
            <input type="text" placeholder="Buscar unidad residencial..." />
            <button className="btn">Buscar</button>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Unidad Residencial</th>
              <th>Fecha/Hora</th>
              <th>Copropietarios</th>
              <th>Conectados</th>
              <th>Estado</th>
              <th>Progreso</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {/* Asamblea en vivo */}
            <tr style={{ background: "#d5f4e6" }}>
              <td>
                <strong>Torres del Parque</strong>
              </td>
              <td>2025-01-15 15:00</td>
              <td>120</td>
              <td>
                <span style={{ color: "#27ae60", fontWeight: "bold" }}>
                  87 (72%)
                </span>
              </td>
              <td>
                <span className="status-badge status-active">EN VIVO</span>
              </td>
              <td>
                <div
                  style={{
                    background: "#ecf0f1",
                    borderRadius: "10px",
                    height: "8px",
                    position: "relative",
                  }}
                >
                  <div
                    style={{
                      background: "#27ae60",
                      height: "100%",
                      width: "65%",
                      borderRadius: "10px",
                    }}
                  ></div>
                </div>
                <small>65% completado</small>
              </td>
              <td>
                <button className="btn btn-success w-4/5">Ingresar</button>
                <button className="btn btn-warning w-4/5">Configurar</button>
              </td>
            </tr>

            {/* Asamblea programada */}
            <tr>
              <td>Conjunto Palmeras</td>
              <td>2025-01-20 09:00</td>
              <td>85</td>
              <td>-</td>
              <td>
                <span className="status-badge status-pending">Programada</span>
              </td>
              <td>-</td>
              <td>
                <button className="btn">Previsualizar</button>
                <button className="btn btn-warning">Editar</button>
              </td>
            </tr>

            {/* Asamblea finalizada */}
            <tr>
              <td>Edificio Central</td>
              <td>2025-01-10 17:00</td>
              <td>45</td>
              <td>42 (93%)</td>
              <td>
                <span className="status-badge status-inactive">Finalizada</span>
              </td>
              <td>
                <div
                  style={{
                    background: "#ecf0f1",
                    borderRadius: "10px",
                    height: "8px",
                    position: "relative",
                  }}
                >
                  <div
                    style={{
                      background: "#3498db",
                      height: "100%",
                      width: "100%",
                      borderRadius: "10px",
                    }}
                  ></div>
                </div>
                <small>Completado</small>
              </td>
              <td>
                <button className="btn btn-success">Reportes</button>
                <button className="btn">Descargar</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MonitoringSection;
