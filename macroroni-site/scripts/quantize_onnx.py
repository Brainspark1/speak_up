import onnxruntime

from onnxruntime.quantization import quantize_dynamic, QuantType

quantize_dynamic(
    model_input="./onnx_output/model.onnx",
    model_output="./onnx_output/model_quantized.onnx",
    weight_type=QuantType.QInt8,
)

print("Done. model_quantized.onnx is the smaller file transformers.js will load.")
print("Copy it (plus the tokenizer/config files) into public/models/GAMEBERT/")
