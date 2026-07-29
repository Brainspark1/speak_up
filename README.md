# speak_up website

A small marketing/docs/playground site for [speak_up](https://github.com/Brainspark1/speak_up),
a Python library for adding voice-controlled interfaces to NES emulator
games built with React + Vite, ready to deploy on Vercel. The Playground
page runs GAMEBERT, the model powering nes_voice, **entirely in the
browser** via ONNX Runtime (transformers.js). No server, no API key, no
backend at all.

## One-time setup: convert the model to ONNX

The browser can only run ONNX models, and the Hugging Face checkpoint is
PyTorch, so before the Playground works, you need to convert it once,
locally, in Python.

```bash
pip install optimum[exporters] onnx onnxruntime
cd scripts
python convert_to_onnx.py
python quantize_onnx.py   # optional, but shrinks ~250MB down to ~65MB
```

Then copy the output into the site. See `public/models/GAMEBERT/README.md`
for the exact file list expected. This is a one-time step per person setting
up the project; the converted files aren't committed to git (they're binary
and tens of MB, regenerate them from the script instead).

## Run it locally

```bash
npm install
npm run dev
```

Unlike the earlier server-proxy version of this page, `npm run dev` is
enough on its own now there's no serverless function to run separately,
since everything happens in the browser.

## Deploy to Vercel

1. Push this folder to a new GitHub repo **including** the converted
   model files this time (they need to actually ship with the site, since
   there's no server to fetch them from at runtime).
2. vercel.com → "Add New Project" → import that repo → deploy. No
   environment variables needed.

## Project structure

```
scripts/
  convert_to_onnx.py   Run once, locally: PyTorch → ONNX
  quantize_onnx.py      Optional: shrinks the ONNX file for faster loading
public/models/GAMEBERT/   Where the converted model files live (gitignored)
src/
  lib/classifier.js     Singleton that loads the model once and reuses it
  components/           Header, Footer, and the two visual "pipeline" widgets
  pages/                Home, Docs, Playground, one file per route
  App.jsx                Routes
  main.jsx                Mounts the app, wraps it in the router
vercel.json              SPA fallback rewrite
```
