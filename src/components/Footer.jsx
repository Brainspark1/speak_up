import React from "react";
import "./Footer.css";

function Footer() {
  return (
    <footer className="site-footer">
      <div className="container site-footer__row">
        <p>
          nes_voice — voice <span className="arrow">→</span> GAMEBERT{" "}
          <span className="arrow">→</span> emulator input.
        </p>
        <div className="site-footer__links">
          <a href="https://pypi.org/project/nes-voice/" target="_blank" rel="noreferrer">
            PyPI
          </a>
          <a href="https://github.com/Brainspark1/macroroni" target="_blank" rel="noreferrer">
            Source
          </a>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
