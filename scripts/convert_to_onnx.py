"""
Run this ONCE, locally, in Python — not part of the website build.

It converts Saggarwal/token_bert from PyTorch to ONNX format so it can run
in the browser via transformers.js. Output goes to ./onnx_output/ — copy
that folder's contents into the site's public/models/token_bert/ folder
afterward (see README in that folder for the exact file list expected).

Setup (one time):
    pip install optimum[exporters] onnx onnxruntime

Usage:
    python convert_to_onnx.py
"""

from optimum.exporters.onnx import main_export

MODEL_ID = "Saggarwal/token_bert"
OUTPUT_DIR = "./onnx_output"

main_export(
    model_name_or_path=MODEL_ID,
    output=OUTPUT_DIR,
    task="token-classification",
)

print(f"\nDone. Files written to {OUTPUT_DIR}/")
print("Copy all of them into: macroroni-site/public/models/token_bert/")
