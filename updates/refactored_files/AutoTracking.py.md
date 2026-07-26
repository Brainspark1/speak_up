# AutoTracking.py — Game Position and Distance Calculator

Pure RAM reader. Reads NES memory each frame to determine Mario and enemy positions. Calculates distances, speeds, and time-to-collision. Contains no tracking state — it's stateless by design.

**Key fixes vs original:**
- Removed `target_type_address`, `target_type_name`, `passing_action` — these are UI/tracking state, not position calculation
- Removed `set_target_from_similarity()` and `activate_set_target()` — these set tracking state that doesn't belong here. Target resolution is handled by `ManualActionHandler` via the shared `auto_tracking_class` instance
- Removed `semantic_mapper` — this is for voice/target resolution, not position tracking
- Removed `target_type_lookup` — same reason, this is name→address mapping for trackable targets
- Removed `activate_tracking()` and `deactivate_tracking()` — tracking state management doesn't belong in a position calculator

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


class AutoTracking:
    def __init__(self, json_path):
        self.data = self.read_json_file(json_path)
        self.character_data = self.data["characters"]
        self.enemy_data = self.data["targets"]["enemy"]
        self.item_data = self.data["items"]
        self.env_data = self.data["environment"]

        (
            self.character_absolute_page_number,
            self.character_vertical_screen_position,
            self.character_horizontal_position,
        ) = self.initialize_character_variables()
        (
            self.enemy_active_state,
            self.enemy_type_address,
            self.enemy_horizontal_velocity,
            self.enemy_absolute_map_num,
            self.enemy_horizontal_page_position,
            self.enemy_vertical_screen_position,
        ) = self.initialize_enemy_variables()
        self.initialize_item_veriables()
        self.env_time_hundred, self.env_time_ten, self.env_time_one = (
            self.initialize_environment_variables()
        )

    def initialize_character_variables(self):
        character_absolute_page_number = int(self.character_data["absolute_page_number"], 16)
        character_vertical_screen_position = int(self.character_data["vertical_screen_position"], 16)
        character_horizontal_position = int(self.character_data["horizontal_position"], 16)

        return (
            character_absolute_page_number,
            character_vertical_screen_position,
            character_horizontal_position,
        )

    def initialize_enemy_variables(self):
        enemy_active_state = int(self.enemy_data["active_state"], 16)
        enemy_type_address = int(self.enemy_data["enemy_type"], 16)
        enemy_horizontal_velocity = int(self.enemy_data["horizontal_velocity"], 16)
        enemy_absolute_map_num = int(self.enemy_data["absolute_map_num"], 16)
        enemy_horizontal_page_position = int(self.enemy_data["horizontal_page_position"], 16)
        enemy_vertical_screen_position = int(self.enemy_data["enemy_vertical_screen_position"], 16)

        return (
            enemy_active_state,
            enemy_type_address,
            enemy_horizontal_velocity,
            enemy_absolute_map_num,
            enemy_horizontal_page_position,
            enemy_vertical_screen_position,
        )

    def initialize_item_veriables(self):
        pass

    def initialize_environment_variables(self):
        env_time_hundred = int(self.env_data["time_hundred"], 16)
        env_time_ten = int(self.env_data["time_ten"], 16)
        env_time_one = int(self.env_data["time_one"], 16)
        
        return env_time_hundred, env_time_ten, env_time_one

    def pick_target(self, enemy_profiles):
        """Pick the enemy with the shortest time to collision."""
        closest_enemy = enemy_profiles[0]
        closest_time = closest_enemy.get("time_to_collision_frames", float("inf"))
        for enemy in enemy_profiles[1:]:
            enemy_time = enemy.get("time_to_collision_frames", float("inf"))
            if enemy_time < closest_time:
                closest_enemy = enemy
                closest_time = enemy_time
        return closest_enemy

    def get_game_positions(self, env):
        """Read NES RAM for Mario and active enemy positions.

        Returns dict with character x/y and list of enemy slot dicts.
        Stateless — no side effects, no tracking state.
        """
        ram = env.unwrapped.ram

        character_x_page = int(ram[self.character_absolute_page_number])
        character_x_screen = int(ram[self.character_horizontal_position])
        character_x_pos = (character_x_page * 256) + character_x_screen
        character_y_pos = int(ram[self.character_vertical_screen_position])

        enemy_slots = []
        for i in range(5):
            enemy_active = ram[self.enemy_active_state + i]
            if enemy_active:
                enemy_x_page = int(ram[self.enemy_absolute_map_num + i])
                enemy_x_screen = int(ram[self.enemy_horizontal_page_position + i])
                enemy_x_pos = (enemy_x_page * 256) + enemy_x_screen
                enemy_y_pos = int(ram[self.enemy_vertical_screen_position + i])
                enemy_type = int(ram[self.enemy_type_address + i])
                enemy_slots.append({"slot": i, "x": enemy_x_pos, "y": enemy_y_pos, "type": enemy_type})

        return {"character": {"x": character_x_pos, "y": character_y_pos}, "enemies": enemy_slots}

    def get_distances_to_targets(self, env, positions):
        """Calculate distances, speeds, and time-to-collision for each enemy.

        Stateless — receives env and positions dict, returns computed metrics.
        """
        ram = env.unwrapped.ram
        enemy_metrics = []

        character_x = positions["character"]["x"]
        character_y = positions["character"]["y"]

        for enemy in positions["enemies"]:
            horizontal_distance = enemy["x"] - character_x
            vertical_distance = enemy["y"] - character_y
            distance = (horizontal_distance ** 2 + vertical_distance ** 2) ** 0.5

            raw_speed_byte = int(ram[self.enemy_horizontal_velocity + enemy["slot"]])
            if raw_speed_byte > 128:
                enemy_direction = "left"
                enemy_speed = abs(256 - raw_speed_byte)
            else:
                enemy_direction = "right"
                enemy_speed = raw_speed_byte

            if enemy_speed == 0:
                enemy_speed = 1

            is_moving_towards_character = False
            if horizontal_distance > 0 and enemy_direction == "left":
                is_moving_towards_character = True
            elif horizontal_distance < 0 and enemy_direction == "right":
                is_moving_towards_character = True

            time_to_collision_frames = abs(horizontal_distance) / enemy_speed if is_moving_towards_character else float("inf")

            enemy_metrics.append({
                "enemy_slot_number": enemy["slot"],
                "enemy_type": enemy["type"],
                "horizontal_distance": horizontal_distance,
                "vertical_distance": vertical_distance,
                "distance": round(distance, 2),
                "speed_per_frame": enemy_speed,
                "is_coming_towards": is_moving_towards_character,
                "time_to_collision_frames": time_to_collision_frames,
            })

        return enemy_metrics

    def read_json_file(self, json_path):
        with open(json_path, "r") as file:
            data = json.load(file)
        return data
