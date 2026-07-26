# ManualActionHandler.py — Voice Command Interpreter

Listens for spoken commands in background thread, resolves them against JSON config, writes frame-count durations into a shared array that the main loop reads each frame.

**Key fixes vs original:**
- Added `from SemanticMapper import SemanticMapper` and `self.semantic_mapper = SemanticMapper(...)` — was missing, crashed on voice commands
- Fixed signature: `process_game_commands(self, entities)` instead of `(self, entities, actions_array)` — base class passes only `entities`
- Fixed duration write: now writes `self.duration_array[idx] = duration` instead of assigning to local variable
- Added `-1` sentinel for hold-forever commands (null duration in JSON)
- Removed dead `get_action_array()` method

```python
import io
import json
import logging
import threading
import time
import wave

import cv2
import numpy as np
import pynput
import pyaudio
import sklearn
import transformers

import faster_whisper
import mlx_whisper
import logging

from NESVoiceController import NESVoiceController
from SemanticMapper import SemanticMapper

logger = logging.getLogger("ActionHandler")


class ManualActionHandler(NESVoiceController):
    def __init__(
        self,
        mapping_json_path,
        auto_tracking_class,
        device_backend="mps",
        whisper_model_size="tiny.en",
        initial_prompt=None,
    ):
        super().__init__(
            mapping_json_path=mapping_json_path,
            device_backend=device_backend,
            whisper_model_size=whisper_model_size,
            initial_prompt=initial_prompt,
        )

        self.data = self.read_json_file(mapping_json_path)
        self.auto_tracking_class = auto_tracking_class

        # SemanticMapper for resolving spoken action words to JSON action names
        self.semantic_mapper = SemanticMapper(json_path=mapping_json_path)

        # [B, A, MODE, START, UP, DOWN, LEFT, RIGHT] frame counters
        # Written by process_game_commands (background thread)
        # Read and decremented by main loop each frame
        self.duration_array = [0, 0, 0, 0, 0, 0, 0, 0]

        # Maps button name string → index in the 8-element action array
        self.button2id = {
            "b": 0,
            "a": 1,
            "mode": 2,
            "start": 3,
            "up": 4,
            "down": 5,
            "left": 6,
            "right": 7,
        }

    def process_game_commands(self, entities):
        """Handle TARGET and ACTION commands from NESBERT.

        Called by NESVoiceController.audio_callback() in background thread.
        Works by side effect — writes to self.duration_array for main loop.

        Branches:
        - TARGET words → activate auto-tracking
        - ACTION words → write duration_array from JSON config
        """
        if not entities:
            return

        target_words = [
            entity.get("word", "").strip().lower()
            for entity in entities
            if entity.get("entity_group") == "TARGET"
        ]

        action_words = [
            entity.get("word", "").strip().lower()
            for entity in entities
            if entity.get("entity_group") == "ACTION"
        ]

        # ── TARGET COMMAND ──
        if target_words:
            sentence = " ".join(target_words)
            if "##" in sentence:
                sentence = sentence.replace("#", "").replace(" ", "")
            logger.info(f"Target command received: '{sentence}'")

            name, score = self.auto_tracking_class.set_target_from_similarity(sentence)
            if name:
                logger.info(f"Tracking started on {name} (confidence: {score:.2f})")
            else:
                logger.info(f"No target recognized in: {sentence}")
            return

        # ── ACTION COMMAND ──
        if action_words:
            action_sentence = " ".join(action_words)
            if "##" in action_sentence:
                action_sentence = action_sentence.replace("#", "").replace(" ", "")
            logger.info(f"Action command received: '{action_sentence}'")

            action_name, score = self.set_action_from_similarity(action_sentence)
            if not action_name or score < 0.15:
                logger.info(f"No action recognized in: {action_sentence}")
                return

            # STOP — clear all sustained actions
            if action_name.lower() == "stop":
                logger.info("Stop command received")
                self.duration_array = [0, 0, 0, 0, 0, 0, 0, 0]
                self.auto_tracking_class.deactivate_tracking()
                return

            # Read action config from JSON
            action_info = self.data["actions"].get(action_name, {})
            buttons = action_info.get("button_array", [])
            durations = action_info.get("duration_array", [])

            if not buttons:
                logger.info(f"Action '{action_name}' has no button_array")
                return

            # Write button durations: >0 = countdown, None = -1 (hold forever)
            for button, duration in zip(buttons, durations):
                idx = self.button2id.get(button.lower())
                if idx is not None:
                    self.duration_array[idx] = duration if duration is not None else -1

            logger.info(f"Action set: {action_name} → buttons={buttons} durations={durations}")
            return

    def set_action_from_similarity(self, transcript_sentence, min_confidence=0.2):
        """Match spoken text to an action name via TF-IDF cosine similarity."""
        name, score = self.semantic_mapper.find_max_action_similarity(transcript_sentence)
        if score < min_confidence:
            return None, score
        return name, score

    def read_json_file(self, json_path):
        with open(json_path, "r") as file:
            data = json.load(file)
        return data

    def get_duration_array(self):
        """Return reference to duration_array for main loop read/decrement."""
        return self.duration_array
