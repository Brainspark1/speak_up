import React, { useEffect, useState } from "react";
import "./SignalPath.css";

// Each frame represents which stage of the real pipeline is "live" right
// now, and which controller input it currently resolves to. This is the
// page's signature element — the product's own logic, drawn as a circuit,
// rather than a decorative animation bolted on top.
const FRAMES = [
  { stage: "listen", tokens: [], tagged: {}, active: null },
  {
    stage: "tokenize",
    tokens: ["jump", "on", "goomba"],
    tagged: {},
    active: null,
  },
  {
    stage: "classify",
    tokens: ["jump", "on", "goomba"],
    tagged: { jump: "ACTION", goomba: "TARGET" },
    active: null,
  },
  {
    stage: "execute",
    tokens: ["jump", "on", "goomba"],
    tagged: { jump: "ACTION", goomba: "TARGET" },
    active: "jump",
  },
];

const STAGE_LABELS = {
  listen: "listening",
  tokenize: "tokenizing",
  classify: "classifying",
  execute: "executing",
};

function MicIcon({ isLive }) {
  return (
    <svg viewBox="0 0 32 32" className={`sp-icon ${isLive ? "sp-icon--live" : ""}`}>
      <rect x="12" y="4" width="8" height="15" rx="4" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 15a8 8 0 0 0 16 0" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <line x1="16" y1="23" x2="16" y2="28" stroke="currentColor" strokeWidth="1.5" />
      <line x1="11" y1="28" x2="21" y2="28" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function ControllerIcon({ activeDirection, activeAction }) {
  const dirs = ["up", "right", "down", "left"];
  return (
    <svg viewBox="0 0 64 36" className="sp-icon sp-icon--controller">
      <rect x="1" y="1" width="62" height="34" rx="12" fill="none" stroke="currentColor" strokeWidth="1.5" />
      {/* D-pad */}
      <g stroke="currentColor" strokeWidth="1.3" fill="none">
        <rect x="12" y="12" width="4" height="12" className={activeDirection ? `sp-dpad sp-dpad--${activeDirection}` : ""} />
        <rect x="8" y="16" width="12" height="4" className={activeDirection ? `sp-dpad sp-dpad--${activeDirection}` : ""} />
      </g>
      {/* Action buttons */}
      <circle cx="46" cy="12" r="3.4" fill="none" stroke="currentColor" strokeWidth="1.3" className={activeAction ? "sp-btn-active" : ""} />
      <circle cx="52" cy="18" r="3.4" fill="none" stroke="currentColor" strokeWidth="1.3" className={activeAction ? "sp-btn-active" : ""} />
    </svg>
  );
}

function SignalPath() {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setFrame((f) => (f + 1) % FRAMES.length), 2400);
    return () => clearInterval(id);
  }, []);

  const current = FRAMES[frame];
  const isLive = (stage) => current.stage === stage;

  return (
    <div className="signal-path panel" aria-label="Diagram of speech being converted to a controller input" role="img">
      <div className="signal-path__meta">
        <span className="signal-path__stage-label">{STAGE_LABELS[current.stage]}</span>
      </div>

      <div className="signal-path__row">
        <div className={`sp-node ${isLive("listen") ? "sp-node--live" : ""}`}>
          <MicIcon isLive={isLive("listen")} />
          <span className="sp-node__label">mic</span>
        </div>

        <div className={`sp-connector ${frame >= 1 ? "sp-connector--on" : ""}`} />

        <div className={`sp-node sp-node--tokens ${isLive("tokenize") ? "sp-node--live" : ""}`}>
          {current.tokens.length === 0 ? (
            <span className="sp-waiting">···</span>
          ) : (
            <span className="sp-tokens">
              [{" "}
              {current.tokens.map((t, i) => (
                <span
                  key={t}
                  className={`sp-token ${current.tagged[t] ? `sp-token--${current.tagged[t]}` : ""}`}
                >
                  {t}
                  {i < current.tokens.length - 1 ? " " : ""}
                </span>
              ))}{" "}
              ]
            </span>
          )}
          <span className="sp-node__label">tokens</span>
        </div>

        <div className={`sp-connector ${frame >= 2 ? "sp-connector--on" : ""}`} />

        <div className={`sp-node sp-node--model ${isLive("classify") ? "sp-node--live" : ""}`}>
          <span className="sp-model-name">GAMEBERT</span>
          <span className="sp-node__label">classify</span>
        </div>

        <div className={`sp-connector ${frame >= 3 ? "sp-connector--on" : ""}`} />

        <div className={`sp-node ${isLive("execute") ? "sp-node--live" : ""}`}>
          <ControllerIcon
            activeDirection={null}
            activeAction={current.tagged[current.active] === "ACTION"}
          />
          <span className="sp-node__label">controller</span>
        </div>
      </div>
    </div>
  );
}

export default SignalPath;
