# Model files

These are the real, converted GAMEBERT model files — already in place,
nothing to copy in manually:

```
public/models/GAMEBERT/
  config.json
  tokenizer.json
  tokenizer_config.json
  special_tokens_map.json
  vocab.txt
  onnx/
    model.onnx
```

`src/lib/classifier.js` loads this model with `pipeline("token-classification", "GAMEBERT", ...)`
— the string `"GAMEBERT"` must exactly match this folder's name, case and
all, since transformers.js appends it to `env.localModelPath` (`/models/`)
to find these files. **If you ever rename this folder, update that string
too** — a mismatch here fails silently as a generic "couldn't load the
model" error with no indication of why.

## Real label scheme (from config.json)

```
O, B-ACTION, I-ACTION, B-TARGET, I-TARGET, B-CORRECTION, I-CORRECTION
```

No DIRECTION label exists. GAMEBERT tags verbs (ACTION), the things they
act on (TARGET), and mid-phrase self-corrections (CORRECTION) — nothing
else. `Playground.jsx` reads these three categories directly, and a
CORRECTION entity cancels the ACTION immediately before it.

## Regenerating these files

If you retrain the model, regenerate the ONNX version with:
```bash
pip install optimum[exporters] onnx onnxruntime
cd scripts
python convert_to_onnx.py
```
then copy the output here, replacing these files.
