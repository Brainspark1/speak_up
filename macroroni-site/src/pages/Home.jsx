import React from "react";
import { Link } from "react-router-dom";
import SignalPath from "../components/SignalPath.jsx";
import PipelineDiagram from "../components/PipelineDiagram.jsx";
import "./Home.css";

const CONTRIBUTORS = [
  "Nihaal Garud",
  "Sarthak Aggarwal",
  "Joshua Lopez",
  "Harshad Goswami",
];

function Home() {
  return (
    <>
      <section className="hero container">
        <div className="hero__copy">
          <span className="eyebrow">python library</span>
          <h1>
            Add a voice interface
            <br />
            to any NES game.
          </h1>
          <p>
            Speak Up is a Python library that brings voice-controlled
            interfaces to GUI-based NES emulator games. Point it at a JSON
            file mapping your game's characters, actions, items, and
            targets to RAM addresses — GAMEBERT, a BERT model trained on
            generic game commands, handles the rest.
          </p>
          <div className="hero__actions">
            <Link className="btn btn-primary" to="/playground">
              Try the playground
            </Link>
            <Link className="btn" to="/docs">
              Read the docs
            </Link>
          </div>
        </div>
        <div className="hero__demo">
          <SignalPath />
        </div>
      </section>

      <section className="section container">
        <div className="section-head">
          <span className="eyebrow">pipeline</span>
          <h2>From spoken phrase to RAM write</h2>
          <p>
            GAMEBERT is trained on the generic formula "character, do action
            on target with item" — your JSON mapping file is what makes that
            generic understanding specific to your game.
          </p>
        </div>
        <PipelineDiagram />
      </section>

      <section className="section container">
        <div className="section-head">
          <span className="eyebrow">why it's not just keyword matching</span>
          <h2>Two layers most voice demos skip</h2>
          <p>
            A correction layer catches a player talking themselves into a
            command mid-phrase — "jump — no, duck" resolves to one action,
            not two. A semantic mapping layer means players can say "hop,"
            "leap," or "jump" and all three resolve to the same action you
            defined once in your JSON file.
          </p>
        </div>
      </section>

      <section className="section container">
        <div className="section-head">
          <span className="eyebrow">team</span>
          <h2>Built by four people, one summer</h2>
          <p> 
            The Super Mario Bros. integration on this site is Speak Up's
            reference implementation — built with{" "}
            <a
              href="https://github.com/Kautenja/gym-super-mario-bros"
              target="_blank"
              rel="noreferrer"
            >
              gym-super-mario-bros
            </a>
            .
          </p>
        </div>
        <ul className="contributors">
          {CONTRIBUTORS.map((name) => (
            <li className="contributors__item panel" key={name}>
              {name}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

export default Home;
