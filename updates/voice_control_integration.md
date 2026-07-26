# Voice Control Integration Design

## Overview

There are **two independent command types**:

| Command Type | Example | What Happens |
|-------------|---------|-------------|
| **Target command** | "goomba" | Activates auto-tracking to approach and kill enemy |
| **Manual action command** | "move right", "jump" | Executes directly from JSON `button_array`/`duration_array` — stateless |

**Key design:** Manual commands are **stateless together mode** — no succession, no queue. The `succession` field is **only** used by auto-tracking from `TrackingActionHandler.go_to_target()`, never by manual commands.

---

## Flow Diagrams

### Target Flow (e.g. "goomba") — Voice → Tracking → Main Loop

```
BACKGROUND THREAD (NESVoiceController.audio_callback)
    │
User says "goomba"
    │
    ▼
Whisper → NESBERT tags → [TARGET: "goomba"]
    │
    ▼
ManualActionHandler.process_game_commands(entities)
    │  (runs in audio callback thread)
    ▼
auto_tracking_class.set_target_from_similarity("goomba")
    │
    ├── Calls auto_tracking.semantic_mapper.find_max_target_similarity("goomba")
    │   └── Compares against JSON target descriptions via TF-IDF
    │
    ▼
Returns: ("goomba", 0.85) → target_type_name = "goomba", address = 0x06
         Auto-tracking now active on AutoTracking instance

    ════════════════════════════════════════
    MAIN LOOP (each frame, ~60fps)
    ════════════════════════════════════════

    ▼
tracking_action_handler.auto_tracking_class.get_game_positions(env)
    → reads NES RAM: Mario X/Y, enemy X/Y per slot

    ▼
tracking_action_handler.auto_tracking_class.get_distances_to_targets(env, positions)
    → calculates horizontal_distance, vertical_distance, speed, time_to_collision

    ▼
tracking_action_handler.go_to_target(profiles, left_index, right_index, action)
    │
    ├── abs(horizontal_distance) > track_distance (22)
    │   → NOT close enough → sets direction button in action array → returns None
    │
    └── abs(horizontal_distance) <= track_distance (22)
        → IS close enough → reads JSON tracking.action = "jump"
        → builds command dict with buttons, durations, succession
        → returns command dict

    ▼
current_command = command  (stored in main loop state)

    ▼ (next frames)
if current_command["succession"]:
    # step through sequence_presses one at a time
else:
    # press all buttons for hold_frames

    ▼
env.step(action) → Mario jumps on goomba
```

### Manual Action Flow (e.g. "move right") — Voice → Handler → Main Loop

```
BACKGROUND THREAD (NESVoiceController.audio_callback)
    │
User says "move right"
    │
    ▼
Whisper → NESBERT tags → [ACTION: "move right"]
    │
    ▼
ManualActionHandler.process_game_commands(entities)
    │  (runs in audio callback thread)
    ▼
ManualActionHandler.set_action_from_similarity("move right")
    │
    ├── Calls self.semantic_mapper.find_max_action_similarity("move right")
    │   └── Compares against JSON action descriptions via TF-IDF
    │
    ▼
Returns: ("move right", 0.93)
    │
    ▼
Reads JSON: button_array=["right"], duration_array=[30]
    │
    ▼
for button, duration in zip(buttons, durations):
    idx = self.button2id.get(button.lower())
    self.duration_array[idx] = duration if duration is not None else -1
    │
    ▼
Side effect: self.duration_array[7] = 30  (right button = index 7)

    ════════════════════════════════════════
    MAIN LOOP (next frame)
    ════════════════════════════════════════

    ▼
dur = manual_action_handler.get_duration_array()
for i in range(8):
    if dur[i] == -1:
        action[i] = 1          # hold forever
    elif dur[i] > 0:
        action[i] = 1          # press this frame
        dur[i] -= 1            # count down
    │
    ▼
Frame 1:  duration_array[7] = 30 → action[7] = 1, decrement to 29
Frame 2:  duration_array[7] = 29 → action[7] = 1, decrement to 28
...
Frame 30: duration_array[7] = 1  → action[7] = 1, decrement to 0
Frame 31: duration_array[7] = 0  → action[7] = 0 → Mario stops

    ▼
env.step(action) → Mario moves right for 30 frames
```

---

## Current Bugs

| File | Bug |
|------|-----|
| `ManualActionHandler.py` | `self.semantic_mapper` never created in `__init__` — crashes on action voice commands |
| `AutoTracking.py` | `self.semantic_mapper` never created — crashes on target voice commands |
| `ManualActionHandler.py` | `process_game_commands(self, entities, actions_array)` has extra arg `actions_array` — base class passes only `entities` |
| `ManualActionHandler.py` | Action branch assigns `duration = durations[i]` to local var instead of writing to `self.duration_array` |
| `main.py` | All 3 constructors called with no args — must inject JSON path and auto_tracking instance |

---

## Exact Code Changes

---

## `ManualActionHandler.py`

### Fix 1 — Add import
```python
from SemanticMapper import SemanticMapper
```

### Fix 2 — Add semantic_mapper in `__init__`
After `self.auto_tracking_class = auto_tracking_class`, add:
```python
self.semantic_mapper = SemanticMapper(json_path=mapping_json_path)
```

### Fix 3 — Fix process_game_commands signature
Change:
```python
def process_game_commands(self, entities, actions_array):
```
To:
```python
def process_game_commands(self, entities):
```

### Fix 4 — Fix duration write loop
Replace the action branch with:
```python
    action_info = self.data["actions"].get(action_name, {})
    buttons = action_info.get("button_array", [])
    durations = action_info.get("duration_array", [])

    if not buttons:
        logger.info(f"Action '{action_name}' has no button_array")
        return

    for button, duration in zip(buttons, durations):
        idx = self.button2id.get(button.lower())
        if idx is not None:
            self.duration_array[idx] = duration if duration is not None else -1

    logger.info(f"Action set: {action_name} → buttons={buttons} durations={durations}")
    return
```

### Fix 5 — Remove dead code
Remove `get_action_array()` and the large commented-out `else` block.

---

## `AutoTracking.py`

### Fix 6 — Add import
```python
from SemanticMapper import SemanticMapper
```

### Fix 7 — Add semantic_mapper in `__init__`
After existing init code, add:
```python
self.semantic_mapper = SemanticMapper(json_path=json_path)
```

### Fix 8 — Implement deactivate_tracking()
Replace the empty `pass` with:
```python
def deactivate_tracking(self):
    self.target_type_address = None
    self.target_type_name = None
    self.passing_action = False
```

---

## `main.py`

### Fix 9 — Fix constructors and add voice start
Replace:
```python
manual_action_handler = ManualActionHandler()
tracking_action_handler = TrackingActionHandler()
nes_voice_controller = NESVoiceController()
```

With:
```python
from AutoTracking import AutoTracking

JSON_PATH = "json_file.json"

auto_tracking = AutoTracking(JSON_PATH)

manual_action_handler = ManualActionHandler(
    mapping_json_path=JSON_PATH,
    auto_tracking_class=auto_tracking,
    device_backend="mps"
)

tracking_action_handler = TrackingActionHandler(
    env=env,
    json_path=JSON_PATH
)

manual_action_handler.start_listening()
```

### Fix 10 — Fix succession key name
Line ~157:
```python
# OLD (wrong key):
step_remaining = current_command["sequence"][step_index]["duration"]
# NEW (consistent):
step_remaining = current_command["sequence_presses"][step_index]["duration"]
```

---

## Summary

| File | Change | Bug Fixed |
|------|--------|-----------|
| `ManualActionHandler.py` | Add `from SemanticMapper import SemanticMapper` | Missing import |
| `ManualActionHandler.py` | Add `self.semantic_mapper = SemanticMapper(...)` | `self.semantic_mapper` not defined |
| `ManualActionHandler.py` | `(self, entities)` instead of `(self, entities, actions_array)` | Wrong signature — TypeError |
| `ManualActionHandler.py` | `self.duration_array[idx] = duration if duration is not None else -1` | Local var instead of array write |
| `ManualActionHandler.py` | Remove `get_action_array()` and commented `else` | Dead code |
| `AutoTracking.py` | Add `self.semantic_mapper = SemanticMapper(...)` | `self.semantic_mapper` not defined |
| `AutoTracking.py` | Implement `deactivate_tracking()` | Currently empty `pass` |
| `main.py` | Pass args to constructors, add `start_listening()` | Crash — no args |
| `main.py` | `"sequence"` → `"sequence_presses"` | Key mismatch |
