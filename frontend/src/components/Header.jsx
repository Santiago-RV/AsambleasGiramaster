import React from "react";

const Header = ({ title }) => {
  return (
    <div className="header">
      <h1>{title}</h1>
      <div className="user-profile">
        <div className="user-avatar">SA</div>
        <span>Super Administrador</span>
      </div>
    </div>
  );
};

export default Header;
