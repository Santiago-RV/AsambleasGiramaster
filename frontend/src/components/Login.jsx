import React, { useState } from "react";

const Login = () => {
  const [usuario, setUsuario] = useState("");
  const [clave, setClave] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (usuario === "" || clave === "") {
      alert("Por favor ingresa usuario y contraseña");
      return;
    }

    if (usuario === "admin" && clave === "12345") {
      alert("Bienvenido " + usuario);
    } else {
      alert("Usuario o contraseña incorrectos");
    }
  };

  return (
    <div className="content-section" id="Login">
      <div className="form-container"></div>
      <h2 className="form-title">Iniciar Sesión</h2>

      <form onSubmit={handleSubmit}>
        <div className="form-group" style={{ width: "200px",margin: "0 auto"}}>
          <label>Usuario</label>
          <input type="text" placeholder="Usuario" />
        </div>

        <div className="form-group" style={{ width: "200px", margin: "0 auto"}}>
          <label>Contraseña</label>
          <input type="text" placeholder="Contraseña" />
        </div>
        <br></br>
        <button type="submit" className="btn btn-success" style={{ width: "200px",margin: "0 auto"}}>
          Ingresar
        </button>

        <p className="text-center text-sm text-gray-500 mt-4 cursor-pointer hover:text-blue-600">
          ¿Olvidaste tu contraseña?
        </p>
      </form>
    </div>
  );
};

export default Login;
