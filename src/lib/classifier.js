import { pipeline, env } from "@huggingface/transformers";

// Load the model from our own /public/models folder instead of fetching it
// from the Hugging Face Hub. Set to false + a hub model id instead if you'd
// rather host the converted files on the Hub (see scripts/README in the repo).
env.allowLocalModels = true;
env.allowRemoteModels = false;
env.localModelPath = "/models/";

// A Promise, not the pipeline itself — multiple components can await the
// same in-flight load instead of triggering it twice. This is the pattern
// Hugging Face's own docs recommend for using transformers.js in an app
// with more than one place that might need the model.
let classifierPromise = null;

export function getClassifier(onProgress) {
  if (!classifierPromise) {
    classifierPromise = pipeline("token-classification", "GAMEBERT", {
      progress_callback: onProgress,
    });
  }
  return classifierPromise;
}
