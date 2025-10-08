import React, { useState } from "react";
import { AuthService } from "../Services/API/AuthService";

const Login = () => {
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const formData = new URLSearchParams();
      formData.append("username", usuario); 
      formData.append("password", password);

      AuthService.Login(formData)

      console.log(res.data);
      alert("✅ Login exitoso");


      localStorage.setItem("token", res.data.access_token);
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.detail || "Error en el login");
    }
  };

  return (
    <div className="content-section" id="Login">
      <div className="form-container"></div>
      <h2 className="form-title">Iniciar Sesión</h2>

      <form onSubmit={Login}>
        <div className="form-group" style={{ width: "200px", margin: "0 auto" }}>
          <label>Usuario</label>
          <input type="text" value={usuario} onChange={(e) => setUsuario(e.target.value)} placeholder="Usuario" />
        </div>

        <div className="form-group" style={{ width: "200px", margin: "0 auto" }}>
          <label>Contraseña</label>
          <input
            type="password"
            className="w-full border border-gray-300 rounded-lg p-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Escribe tu contraseña"
          />
        </div>
        <br></br>
        <button type="submit" className="btn btn-success" style={{ width: "200px", margin: "0 auto" }}>
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
