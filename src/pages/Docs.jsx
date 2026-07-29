import React from "react";
import "./Docs.css";

function Docs() {
  return (
    <div className="container docs">
      <div className="section-head">
        <span className="eyebrow">docs</span>
        <h2>Speak_Up documentation</h2>
        <p>
          A Python library for adding voice-controlled interfaces to
          GUI-based NES emulator games.
        </p>
      </div>

      <div className="docs__grid">
        <aside className="docs__nav panel">
          <a href="#overview">Overview</a>
          <a href="#install">Install</a>
          <a href="#prerequisites">Prerequisites</a>
          <a href="#mapping-file">The mapping file</a>
          <a href="#pipeline">Wire up the pipeline</a>
          <a href="#resources">Resources</a>
        </aside>

        <div className="docs__content">
          <section id="overview" className="docs__section panel">
            <h3>Overview</h3>
            <p>
              Speak_Up gives developers a pipeline built around GAMEBERT, a
              BERT model trained on generic video game commands following
              the formula "character, do action on target with item." Rather
              than training a model per game, you supply a single JSON file
              mapping RAM addresses to your game's characters, actions,
              items, and targets —> Speak_Up handles the rest.
            </p>
            <p>
              Two layers sit on top of that core mapping: a{" "}
              <strong>correction layer</strong> that catches a player
              correcting themselves mid-phrase, and a{" "}
              <strong>semantic mapping layer</strong> that resolves synonyms
              a player might use for the same in-game term. Together, they're
              what let a command like "Mario, go jump on that goomba"
              resolve correctly, rather than requiring players to memorize
              exact phrasing.
            </p>
          </section>

          <section id="install" className="docs__section panel">
            <h3>Install</h3>
            <pre className="code-block">
              <code>pip install Speak_Up</code>
            </pre>
          </section>

          <section id="prerequisites" className="docs__section panel">
            <h3>Prerequisites</h3>
            <p>Before writing any integration code, make sure you have:</p>
            <ul>
              <li>An active emulator or gaming environment for your target game already installed</li>
              <li>Python's package manager, pip</li>
            </ul>
            <p>
              The example throughout this guide uses Super Mario Bros. via{" "}
              <a
                href="https://github.com/Kautenja/gym-super-mario-bros"
                target="_blank"
                rel="noreferrer"
              >
                gym-super-mario-bros
              </a>
              , but Speak_Up isn't specific to that library or that game,
              any GUI-based NES emulator setup works the same way, as long
              as you can supply RAM addresses for it.
            </p>
          </section>

          <section id="mapping-file" className="docs__section panel">
            <h3>The mapping file</h3>
            <p>
              This JSON file is what bridges what a player says and what
              your emulator can actually read in memory. You define the RAM
              addresses for your game's individual characters, actions,
              items, and targets —> Speak_Up does not infer these for you.
            </p>
            <p className="docs__note">
              Most RAM address information for NES games is documented on{" "}
              <a
                href="https://datacrystal.tcrf.net/wiki/Category:NES_games"
                target="_blank"
                rel="noreferrer"
              >
                Data Crystal
              </a>
              .
            </p>
            <div className="docs__placeholder">
              TODO: drop in the real <code>game_mappings.json</code> example
              for Super Mario Bros. here.
            </div>
          </section>

          <section id="pipeline" className="docs__section panel">
            <h3>Wire up the pipeline</h3>
            <p>
              Once your mapping file is defined, pass it into the Speak_Up
              loop pipeline inside your game's script. This configures
              GAMEBERT to listen for, and recognize, your game's specific
              entities.
            </p>
            <div className="docs__placeholder">
              TODO: drop in the real Super Mario Bros. pipeline
              integration code here.
            </div>
          </section>

          <section id="resources" className="docs__section panel">
            <h3>Resources</h3>
            <ul>
              <li>
                <a
                  href="https://datacrystal.tcrf.net/wiki/Category:NES_games"
                  target="_blank"
                  rel="noreferrer"
                >
                  Data Crystal
                </a>{" "}
                 RAM address documentation for most NES games
              </li>
              <li>
                <a
                  href="https://github.com/Kautenja/gym-super-mario-bros"
                  target="_blank"
                  rel="noreferrer"
                >
                  gym-super-mario-bros
                </a>{" "}
                  the emulator environment used in this guide's example
              </li>
              <li>
                <a
                  href="https://github.com/Brainspark1/macroroni"
                  target="_blank"
                  rel="noreferrer"
                >
                  Source on GitHub
                </a>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

export default Docs;
