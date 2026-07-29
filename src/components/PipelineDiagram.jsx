import React from "react";
import "./PipelineDiagram.css";

const STAGES = [
  {
    id: "01",
    name: "Speech-to-text",
    detail: "The player's spoken phrase is transcribed live.",
  },
  {
    id: "02",
    name: "GAMEBERT",
    detail: "Parses \"character, action, target, item\" from the transcript.",
  },
  {
    id: "03",
    name: "Semantic mapping",
    detail: "Synonyms ('hop', 'leap', 'jump') resolve to one action.",
  },
  {
    id: "04",
    name: "Correction layer",
    detail: "A mid-phrase self-correction replaces, not appends.",
  },
  {
    id: "05",
    name: "JSON mapping file",
    detail: "Your game_mappings.json resolves the command to RAM addresses.",
  },
  {
    id: "06",
    name: "Emulator write",
    detail: "The resolved addresses are written to the running emulator.",
  },
];

function PipelineDiagram() {
  return (
    <ol className="pipeline">
      {STAGES.map((stage, i) => (
        <li className="pipeline__stage" key={stage.id}>
          <div className="pipeline__id">{stage.id}</div>
          <div className="pipeline__body">
            <h3 className="pipeline__name">{stage.name}</h3>
            <p className="pipeline__detail">{stage.detail}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export default PipelineDiagram;
