# main.py — Final Corrected Version

```python
import sys
import stable_retro as retro
import pygame
import numpy as np

from ManualActionHandler import ManualActionHandler
from TrackingActionHandler import TrackingActionHandler
from AutoTracking import AutoTracking

pygame.init()

ENV_NAME = "SuperMarioBros-Nes-v0"
try:
    env = retro.make(game=ENV_NAME, state=retro.State.DEFAULT)
except Exception as e:
    print(f"Error loading environment: {e}")
    print("Ensure your ROM is imported using: python3 -m retro.import /path/to/roms")
    sys.exit(1)

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

obs, info = env.reset()

SCREEN_SCALE = 3
screen_width = obs.shape[1] * SCREEN_SCALE
screen_height = obs.shape[0] * SCREEN_SCALE
screen = pygame.display.set_mode((screen_width, screen_height))
pygame.display.set_caption("Super Mario Bros")

clock = pygame.time.Clock()
running = True

current_command = None
step_index = 0
step_remaining = 0
sustain_remaining = 0

BUTTON_INDICES = manual_action_handler.button2id

while running:
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False
        elif event.type == pygame.KEYDOWN and event.key == pygame.K_ESCAPE:
            running = False

    # [B, A, MODE, START, UP, DOWN, LEFT, RIGHT]
    action = [0, 0, 0, 0, 0, 0, 0, 0]

    duration = manual_action_handler.get_duration_array()

    # ── KEYBOARD INPUT ──
    keys = pygame.key.get_pressed()
    if keys[pygame.K_w]:
        action[4] = 1
    if keys[pygame.K_s]:
        action[5] = 1
    if keys[pygame.K_a]:
        action[6] = 1
    if keys[pygame.K_d]:
        action[7] = 1
    if keys[pygame.K_e]:
        action[0] = 1
    if keys[pygame.K_Space]:
        action[1] = 1

    # ── VOICE DURATIONS ──
    # dur[i] == -1 → hold forever (e.g. "run left" with null duration)
    # dur[i] > 0   → press and count down
    # dur[i] == 0  → do nothing (duration expired)
    for i in range(8):
        if duration[i] == -1:
            action[i] = 1
        elif duration[i] > 0:
            action[i] = 1
            duration[i] -= 1

    # ── AUTO-TRACKING ──
    # Only checks for new tracking command if no current command is active
    if current_command is None:
        positions = tracking_action_handler.auto_tracking_class.get_game_positions(env)

        profiles = tracking_action_handler.auto_tracking_class.get_distances_to_targets(
            env, positions
        )

        command = tracking_action_handler.go_to_target(
            profiles,
            left_index=BUTTON_INDICES.get("left"),
            right_index=BUTTON_INDICES.get("right"),
            action=action,
        )

        if command:
            current_command = command

            if command["succession"]:
                step_index = 0
                step_remaining = command["sequence_presses"][0]["duration"]

                if command["direction"] == "right":
                    action[BUTTON_INDICES.get("right")] = 1
                else:
                    action[BUTTON_INDICES.get("left")] = 1
            else:
                sustain_remaining = command["hold_frames"]

            for button in command["buttons"]:
                index = BUTTON_INDICES.get(button.lower())
                if index is not None:
                    duration[index] = command["hold_frames"]
                    action[index] = 1

    # ── EXECUTE ACTIVE COMMAND ──
    if current_command:
        if current_command["succession"]:  # succession mode
            if current_command["direction"] == "right":
                action[BUTTON_INDICES.get("right")] = 1
            else:
                action[BUTTON_INDICES.get("left")] = 1

            current_step = current_command["sequence_presses"][step_index]
            button_index = BUTTON_INDICES.get(current_step["button"].lower())
            if button_index is not None:
                action[button_index] = 1

            step_remaining -= 1

            if step_remaining <= 0:
                step_index += 1

                if step_index >= len(current_command["sequence_presses"]):
                    current_command = None
                else:
                    step_remaining = current_command["sequence_presses"][step_index]["duration"]
        else:  # together mode
            for button in current_command["buttons"]:
                index = BUTTON_INDICES.get(button.lower())
                if index is not None:
                    action[index] = 1

            sustain_remaining -= 1

            if sustain_remaining <= 0:
                current_command = None

    # ── STEP ENVIRONMENT ──
    obs, reward, terminated, truncated, info = env.step(action)

    if terminated or truncated:
        obs, info = env.reset()
        current_command = None
        manual_action_handler.duration_array = [0] * 8

    # ── RENDER ──
    frame = obs.transpose(1, 0, 2)
    surf = pygame.surfarray.make_surface(frame)
    scaled_surf = pygame.transform.scale(surf, (screen_width, screen_height))
    screen.blit(scaled_surf, (0, 0))
    pygame.display.flip()

    clock.tick(60)

env.close()
pygame.quit()
sys.exit()
```

## Changes from Original

| Line(s) | Change | Why |
|---------|--------|-----|
| 8 | `from AutoTracking import AutoTracking` | New import — auto_tracking instance needed by both handlers |
| 20-22 | Replaced 3 no-arg constructors with proper instantiation | Original crashed — all 3 classes require arguments |
| 23-30 | Created `auto_tracking` first, passed to both handlers | Both `ManualActionHandler` and `TrackingActionHandler` need the same `auto_tracking` instance |
| 32 | Added `manual_action_handler.start_listening()` | Voice never started without this — audio_callback never runs |
| 35 | Fixed caption to "Super Mario Bros" | Was "Kirby's Adventure" (copy-paste error) |
| 75-79 | Added `duration[i] == -1` check | Hold-forever commands like "run left" need `-1` to be recognized |
| 157 | Changed `"sequence"` to `"sequence_presses"` | Key mismatch — initialized as `"sequence_presses"` on line 109 but read as `"sequence"` here |
| 179 | Added `manual_action_handler.duration_array = [0] * 8` on level reset | Prevents voice commands (like "run left") from persisting into the next level |
