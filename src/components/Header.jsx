import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import "./Header.css";

const links = [
  { to: "/", label: "Home" },
  { to: "/docs", label: "Docs" },
  { to: "/playground", label: "Playground" },
];

function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="site-header">
      <div className="container site-header__row">
        <NavLink to="/" className="brand" onClick={() => setOpen(false)}>
        <img src="image.png" className="brand__mark" alt="Brand Logo" style={{ width: '24px', height: 'auto' }} />
          <span className="brand__name">Speak Up</span>
        </NavLink>

        <button
          className="nav-toggle"
          aria-label="Toggle navigation"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span />
          <span />
          <span />
        </button>

        <nav className={`site-nav ${open ? "site-nav--open" : ""}`}>
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === "/"}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                "site-nav__link" + (isActive ? " site-nav__link--active" : "")
              }
            >
              {link.label}
            </NavLink>
          ))}
          <a
            className="site-nav__link site-nav__link--ext"
            href="https://github.com/Brainspark1/macroroni"
            target="_blank"
            rel="noreferrer"
          >
            GitHub ↗
          </a>
        </nav>
      </div>
    </header>
  );
}

export default Header;
