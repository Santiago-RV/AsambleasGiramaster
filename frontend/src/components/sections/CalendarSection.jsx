import React from "react";

const CalendarSection = () => {
  const previousMonth = () => {
    console.log("Mes anterior");
  };

  const nextMonth = () => {
    console.log("Mes siguiente");
  };

  return (
    <div className="content-section" id="calendar">
      <div className="calendar-container">
        <div className="calendar-header">
          <h2> Calendario de Asambleas</h2>
          <div className="calendar-nav">
            <button onClick={previousMonth}>← Anterior</button>
            <h3 id="current-month">Enero 2025</h3>
            <button onClick={nextMonth}>Siguiente →</button>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            gap: "1px",
            background: "#ecf0f1",
            borderRadius: "8px",
            overflow: "hidden",
            marginTop: "1rem",
          }}
        >
          {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((day) => (
            <div
              key={day}
              style={{
                background: "#34495e",
                color: "white",
                padding: "1rem",
                textAlign: "center",
                fontWeight: "bold",
              }}
            >
              {day}
            </div>
          ))}

          {/* Día 1 */}
          <div
            className="calendar-day"
            style={{
              background: "white",
              padding: "0.8rem",
              minHeight: "100px",
              borderRight: "1px solid #ecf0f1",
            }}
          >
            <div style={{ fontWeight: "bold", marginBottom: "0.5rem" }}>1</div>
          </div>

          {/* Día 2 */}
          <div
            className="calendar-day"
            style={{
              background: "white",
              padding: "0.8rem",
              minHeight: "100px",
              borderRight: "1px solid #ecf0f1",
            }}
          >
            <div style={{ fontWeight: "bold", marginBottom: "0.5rem" }}>2</div>
          </div>

          {/* Día 3 con evento */}
          <div
            className="calendar-day"
            style={{
              background: "white",
              padding: "0.8rem",
              minHeight: "100px",
              borderRight: "1px solid #ecf0f1",
            }}
          >
            <div style={{ fontWeight: "bold", marginBottom: "0.5rem" }}>3</div>
            <div className="event-card">Torres del Parque - 15:00</div>
          </div>

          {/* Día 4 */}
          <div
            className="calendar-day"
            style={{
              background: "white",
              padding: "0.8rem",
              minHeight: "100px",
              borderRight: "1px solid #ecf0f1",
            }}
          >
            <div style={{ fontWeight: "bold", marginBottom: "0.5rem" }}>4</div>
          </div>

          {/* Día 5 con evento */}
          <div
            className="calendar-day"
            style={{
              background: "white",
              padding: "0.8rem",
              minHeight: "100px",
              borderRight: "1px solid #ecf0f1",
            }}
          >
            <div style={{ fontWeight: "bold", marginBottom: "0.5rem" }}>5</div>
            <div className="event-card">Conjunto Palmeras - 09:00</div>
          </div>

          {/* Día 6 */}
          <div
            className="calendar-day"
            style={{
              background: "white",
              padding: "0.8rem",
              minHeight: "100px",
              borderRight: "1px solid #ecf0f1",
            }}
          >
            <div style={{ fontWeight: "bold", marginBottom: "0.5rem" }}>6</div>
          </div>

          {/* Día 7 */}
          <div
            className="calendar-day"
            style={{
              background: "white",
              padding: "0.8rem",
              minHeight: "100px",
            }}
          >
            <div style={{ fontWeight: "bold", marginBottom: "0.5rem" }}>7</div>
          </div>
        </div>

        <div style={{ marginTop: "2rem" }}>
          <h3> Resumen del Mes</h3>
          <div className="stats-grid" style={{ marginTop: "1rem" }}>
            <div className="stat-card">
              <div className="stat-info">
                <h3>12</h3>
                <p>Asambleas Programadas</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-info">
                <h3>3</h3>
                <p>Asambleas Hoy</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-info">
                <h3>85%</h3>
                <p>Ocupación Promedio</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarSection;
