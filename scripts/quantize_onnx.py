"""
Optional but recommended: run this AFTER convert_to_onnx.py.

DistilBERT-based models export to ~250MB in full precision (fp32) — too
big for a pleasant first-load experience in a browser. Dynamic quantization
(int8) typically shrinks that to ~65MB with only a small accuracy trade-off,
which matters a lot more for something running on someone's phone over
mobile data than it does for a server.

Setup (one time, same environment as convert_to_onnx.py):
    pip install onnxruntime

Usage:
    python quantize_onnx.py
"""

from onnxruntime.quantization import quantize_dynamic, QuantType

quantize_dynamic(
    model_input="./onnx_output/model.onnx",
    model_output="./onnx_output/model_quantized.onnx",
    weight_type=QuantType.QInt8,
)

print("Done. model_quantized.onnx is the smaller file transformers.js will load.")
print("Copy it (plus the tokenizer/config files) into public/models/token_bert/")
