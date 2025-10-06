import React from "react";

const ClientsSection  = () => {
  return (
    
<div className="content-section" id="clients">
    
                <div className="form-container">
                    <h2 className="form-title"> Crear Nueva Unidad Residencial</h2>
                    <form>
                        <div className="form-grid">
                            <div className="form-group">
                                <label>Nombre de la Unidad Residencial</label>
                                <input type="text" placeholder="Ej: Torres del Parque"/>
                            </div>
                            <div className="form-group">
                                <label>Número de Apartamentos</label>
                                <input type="number" placeholder="Ej: 120"/>
                            </div>
                            <div className="form-group">
                                <label>NIT</label>
                                <input type="text" placeholder="Ej: 900123456-7"/>
                            </div>
                            <div className="form-group">
                                <label>Ciudad</label>
                                <input type="text" placeholder="Ej: Medellín"/>
                            </div>
                            <div className="form-group">
                                <label>Dirección</label>
                                <input type="text" placeholder="Ej: Carrera 15 # 25-30"/>
                            </div>
                            <div className="form-group">
                                <label>Correo Electrónico</label>
                                <input type="email" placeholder="administracion@unidadresidencial.com"/>
                            </div>
                            <div className="form-group">
                                <label>Teléfono Administración</label>
                                <input type="tel" placeholder="Ej: +57 4 123 4567"/>
                            </div>
                            <div className="form-group">
                                <label>Teléfono Portería</label>
                                <input type="tel" placeholder="Ej: +57 4 765 4321"/>
                            </div>
                        </div>
                        
                        <h3 className="form-title"> Información Empresa de Administración</h3>
                        <div className="form-grid">
                            <div className="form-group">
                                <label>Nombre</label>
                                <input type="text" placeholder="Ej: AdminPro S.A.S"/>
                            </div>
                            <div className="form-group">
                                <label>Correo</label>
                                <input type="email" placeholder="contacto@adminpro.com"/>
                            </div>
                            <div className="form-group">
                                <label>Teléfono</label>
                                <input type="tel" placeholder="Ej: +57 4 555 1234"/>
                            </div>
                            <div className="form-group">
                                <label>Nombre del Administrador</label>
                                <input type="text" placeholder="Ej: Juan Pérez"/>
                            </div>
                            <div className="form-group">
                                <label>Correo Administrador</label>
                                <input type="email" placeholder="juan.perez@adminpro.com"/>
                            </div>
                            <div className="form-group">
                                <label>Celular Administrador</label>
                                <input type="tel" placeholder="Ej: +57 300 123 4567"/>
                            </div>
                            <div className="form-group">
                                <label>Nombre Auxiliar</label>
                                <input type="text" placeholder="Ej: María González"/>
                            </div>
                            <div className="form-group">
                                <label>Correo Auxiliar</label>
                                <input type="email" placeholder="maria.gonzalez@adminpro.com"/>
                            </div>
                            <div className="form-group">
                                <label>Celular Auxiliar</label>
                                <input type="tel" placeholder="Ej: +57 301 234 5678"/>
                            </div>
                        </div>

                        <h3 className="form-title"> Información Contabilidad y Revisoría</h3>
                        <div className="form-grid">
                            <div className="form-group">
                                <label>Nombre Contador(a)</label>
                                <input type="text" placeholder="Ej: Carlos Rodríguez"/>
                            </div>
                            <div className="form-group">
                                <label>Correo Contador</label>
                                <input type="email" placeholder="contador@contabilidadpro.com"/>
                            </div>
                            <div className="form-group">
                                <label>Celular Contador</label>
                                <input type="tel" placeholder="Ej: +57 302 345 6789"/>
                            </div>
                            <div className="form-group">
                                <label>Nombre Revisor Fiscal</label>
                                <input type="text" placeholder="Ej: Ana Martínez"/>
                            </div>
                            <div className="form-group">
                                <label>Correo Revisor Fiscal</label>
                                <input type="email" placeholder="revisor@auditoriapro.com"/>
                            </div>
                            <div className="form-group">
                                <label>Celular Revisor Fiscal</label>
                                <input type="tel" placeholder="Ej: +57 303 456 7890"/>
                            </div>
                        </div>

                        <button type="submit" className="btn btn-success"> Guardar Cliente</button>
                        <button type="reset" className="btn"> Limpiar Formulario</button>
                    </form>
                </div>

                <div className="table-container">
                    <div className="table-header">
                        <h3> Lista de Unidades Residenciales</h3>
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th>Unidad Residencial</th>
                                <th>Ciudad</th>
                                <th>Apartamentos</th>
                                <th>Administrador</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>Torres del Parque</td>
                                <td>Medellín</td>
                                <td>120</td>
                                <td>Juan Pérez</td>
                                <td><span className="status-badge status-active">Activo</span></td>
                                <td>
                                <div className="flex flex-col gap-2">
                                    <button className="btn btn-warning">Editar</button>
                                    <button className="btn btn-danger">Borrar</button>
                                    <button className="btn btn-success">Informe</button>
                                </div>
                                </td>

                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
              );
};

export default ClientsSection;
