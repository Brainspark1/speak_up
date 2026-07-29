import React, { useState } from "react";
import { getClassifier } from "../lib/classifier.js";
import "./Playground.css";

// Real label scheme, taken directly from config.json's id2label:
// O, B-ACTION/I-ACTION, B-TARGET/I-TARGET, B-CORRECTION/I-CORRECTION.
// There is no DIRECTION category — movement words like "left"/"right"
// aren't tagged by GAMEBERT itself under this scheme; only verbs (ACTION)
// and the things they act on (TARGET) are. CORRECTION marks a mid-phrase
// self-correction, which is what the correction layer described in the
// docs acts on — this demo surfaces it but doesn't simulate that logic.
const ACTION_COMMANDS = {
  jump: "A",
  hop: "A",
  run: "B",
  sprint: "B",
  dash: "B",
  duck: "DOWN",
  crouch: "DOWN",
  stop: "NEUTRAL",
  halt: "NEUTRAL",
};

function actionToCommand(word) {
  return ACTION_COMMANDS[word.toLowerCase().replace(/^##/, "")] || null;
}

const EXAMPLES = [
  "jump",
  "kill the goomba",
  "brown guy",
  "eat",
  "swallow"
];

function Playground() {
  const [text, setText] = useState(EXAMPLES[0]);
  // idle | loading-model | ready | classifying | error
  const [status, setStatus] = useState("idle");
  const [progress, setProgress] = useState(null);
  const [entities, setEntities] = useState([]);
  const [errorMsg, setErrorMsg] = useState("");

  async function runClassification() {
    if (!text.trim()) return;

    try {
      setStatus((s) => (s === "idle" ? "loading-model" : "classifying"));
      setErrorMsg("");

      const classifier = await getClassifier((p) => {
        if (p.status === "progress") {
          setProgress(Math.round(p.progress));
        }
      });

      setStatus("classifying");
      const result = await classifier(text, { aggregation_strategy: "simple" });
      setEntities(result);
      setStatus("ready");
    } catch (err) {
      console.error(err);
      setErrorMsg(
        "Couldn't load or run the model. Make sure the converted files are " +
          "in public/models/GAMEBERT/ — see that folder's README."
      );
      setStatus("error");
    }
  }

  const actionEntities = entities.filter((e) => e.entity_group === "ACTION");
  const targetEntities = entities.filter((e) => e.entity_group === "TARGET");
  const correctionEntities = entities.filter((e) => e.entity_group === "CORRECTION");

  // Walk entities in the order they appear in the sentence (not the
  // pre-filtered lists above) so a CORRECTION can cancel the ACTION that
  // came right before it. This is what makes "jump — no, duck" resolve to
  // DOWN alone instead of both A and DOWN — the model tags the correction,
  // this is where that tag actually gets used rather than just displayed.
  const commands = [];
  for (const e of entities) {
    if (e.entity_group === "ACTION") {
      const cmd = actionToCommand(e.word);
      if (cmd) commands.push(cmd);
    } else if (e.entity_group === "CORRECTION") {
      commands.pop();
    }
  }

  const busy = status === "loading-model" || status === "classifying";

  return (
    <div className="container playground">
      <div className="section-head">
        <span className="eyebrow">playground</span>
        <h2>Type a command, see it classified</h2>
        <p>
          This runs GAMEBERT entirely in your browser via ONNX Runtime, no
          server, no API key. It tags <strong>ACTION</strong> words (verbs),{" "}
          <strong>TARGET</strong> words (what the action applies to), and{" "}
          <strong>CORRECTION</strong> words (a player correcting themselves
          mid-phrase). A correction cancels the action right before it, try
          "jump — no, duck" below. TARGET isn't mapped to a controller macro
          yet, since that needs your game's specific mapping file.
        </p>
      </div>

      <div className="playground__grid">
        <div className="playground__input panel">
          <label className="playground__label" htmlFor="speech-input">
            simulated transcript
          </label>
          <textarea
            id="speech-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            spellCheck={false}
          />
          <div className="playground__examples">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                className="btn"
                type="button"
                onClick={() => setText(ex)}
              >
                {ex}
              </button>
            ))}
          </div>
          <button
            className="btn btn-primary playground__run"
            type="button"
            onClick={runClassification}
            disabled={busy}
          >
            {status === "loading-model" &&
              (progress !== null
                ? `Loading model… ${progress}%`
                : "Loading model…")}
            {status === "classifying" && "Classifying…"}
            {!busy && "Run classification"}
          </button>
        </div>

        <div className="playground__output panel">
          {status === "idle" && (
            <p className="sp-waiting-muted">
              Type something and hit "Run classification." The first run
              downloads the model — later runs are instant.
            </p>
          )}

          {status === "error" && <p className="playground__error">{errorMsg}</p>}

          {(status === "ready" || status === "classifying") && (
            <>
              <div className="playground__row">
                <span className="playground__row-label">action</span>
                <div className="playground__chips">
                  {actionEntities.length === 0 && (
                    <span className="sp-waiting-muted">none found</span>
                  )}
                  {actionEntities.map((e, i) => (
                    <span className="chip chip--matched" key={i}>
                      {e.word} ({(e.score * 100).toFixed(0)}%)
                    </span>
                  ))}
                </div>
              </div>

              <div className="playground__row">
                <span className="playground__row-label">target</span>
                <div className="playground__chips">
                  {targetEntities.length === 0 && (
                    <span className="sp-waiting-muted">none found</span>
                  )}
                  {targetEntities.map((e, i) => (
                    <span className="chip" key={i}>
                      {e.word} ({(e.score * 100).toFixed(0)}%)
                    </span>
                  ))}
                </div>
              </div>

              <div className="playground__row">
                <span className="playground__row-label">correction</span>
                <div className="playground__chips">
                  {correctionEntities.length === 0 && (
                    <span className="sp-waiting-muted">none found</span>
                  )}
                  {correctionEntities.map((e, i) => (
                    <span className="chip chip--correction" key={i}>
                      {e.word} ({(e.score * 100).toFixed(0)}%)
                    </span>
                  ))}
                </div>
              </div>

              <div className="playground__row">
                <span className="playground__row-label">macro output</span>
                <div className="playground__chips">
                  {commands.length === 0 && (
                    <span className="sp-waiting-muted">No mapped commands</span>
                  )}
                  {commands.map((c, i) => (
                    <span className="chip chip--command" key={c + i}>
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}

          <p className="playground__hint">
            Recognized action words: jump/hop, shoot/fire, duck/crouch,
            eat/swallow.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Playground;
