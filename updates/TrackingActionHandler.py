import io
import json
import logging
import threading
import time
import wave
import inspect

import cv2
import numpy as np
import pynput
import pyaudio
import sklearn
import transformers

import faster_whisper
import mlx_whisper
import stable_retro

from AutoTracking import AutoTracking
from ActionFinder import ActionFinder


class TrackingActionHandler:
    def __init__(self, env, json_path):
        self.data = self.read_json_file(json_path)
        self.action_data = self.data["actions"]

        self.env = env

        self.track_distance_lookup = {
            name: int(info["tracking"]["track_distance"], 16)
            for name, info in self.data["targets"].items()
            if name != "enemy"
        }

        self.auto_tracking_class = AutoTracking(json_path)

        self.target_profiles = self.auto_tracking_class.get_distances_to_targets(
            env, self.auto_tracking_class.get_game_positions(env)
        )

    def go_to_target(self, target_profiles, left_index, right_index, action):
        target_type = self.target_profiles["enemy_type"]

        candidates = [
            {"name": name, **info}
            for name, info in target_profiles.items()
            if name == target_type
        ]

        if not candidates:
            self.auto_tracking_class.deactivate_tracking()
            action = np.zeros(self.env.action_space.shape, dtype=int)

        target = self.auto_tracking_class.pick_target(candidates)

        horizontal_distance = self.target_profiles["horizontal_distance"]
        tracking_distance = int(
            self.data[target_type]["tracking"]["track_distance"], 16
        )

        function_name = self.data[target_type]["tracking"]["action"]

        action_mode = self.action_data[function_name]["succession"]

        if abs(horizontal_distance) <= tracking_distance:
            if horizontal_distance >= 0:
                direction = "right"
            else:
                direction = "left"

            buttons = list(self.action_data[function_name]["button_array"])
            durations = list(self.action_data[function_name]["duration_array"])

            if action_mode == "False":
                combined_buttons = [direction] + buttons
                combined_durations = durations + [max(durations)]

                if durations:
                    max_duration = max(durations)
                else:
                    max_duration = 0

                command = {
                    "buttons": [direction] + buttons,
                    "durations": [max_duration] + durations,
                    "hold_frames": max_duration,
                    "succession": False,
                }

                return command
            elif action_mode == "True":
                total_duration = sum(durations)

                sequence_presses = []
                for i in range(len(buttons)):
                    sequence_presses.append(
                        {"button": buttons[i], "duration": durations[i]}
                    )

                command = {
                    "direction": direction,
                    "sequence_presses": sequence_presses,
                    "total_duration": total_duration,
                    "current_step": 0,
                    "step_frames_remaining": durations[0] if durations else 0,
                    "succession": True,
                }

                return command

        # # together
        # if action_mode == "False":
        #     if horizontal_distance <= tracking_distance & horizontal_distance >= 0:
        #         action_button_array = self.action_data[function_name]["button_array"]
        #         action_duration_array = self.action_data[function_name][
        #             "duration_array"
        #         ]

        #         action_button_array.append("right")

        #         command = {
        #             "buttons": action_button_array,
        #             "durations": action_duration_array,
        #             "succession": False,
        #         }

        #         return command

        #     if horizontal_distance >= -1 * tracking_distance & horizontal_distance <= 0:
        #         action_button_array = self.action_data[function_name]["button_array"]
        #         action_duration_array = self.action_data[function_name][
        #             "duration_array"
        #         ]

        #         action_button_array.append("left")

        #         command = {
        #             "buttons": action_button_array,
        #             "durations": action_duration_array,
        #             "succession": False,
        #         }

        #         return command
        # elif action_mode == "True":

        # no need for releasing buttons as handled by main loop
        if horizontal_distance >= 0:
            action[right_index] = 1
        else:
            action[left_index] = 1

        return None

    def read_json_file(self, json_path):
        with open(json_path, "r") as file:
            data = json.load(file)

        return data
