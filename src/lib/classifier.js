import { pipeline, env } from '@xenova/transformers';

// Force the system to use local files from Vercel's public directory
env.allowLocalModels = true;
env.localModelPath = '/models/'; 

let classifierInstance = null;

/**
 * Initializes and caches the GAMEBERT token classification pipeline
 * @param {Function} onProgress Callback function tracking chunk loading progress
 */
export async function getClassifier(onProgress) {
  if (classifierInstance) {
    return classifierInstance;
  }

  try {
    // Hooks directly into public/models/GAMEBERT/
    // Validates extracted text streams against your Chatette commands (jump, kill, shoot, fire)
    classifierInstance = await pipeline('token-classification', 'GAMEBERT', {
      progress_callback: onProgress,
    });
    
    return classifierInstance;
  } catch (error) {
    console.error("Failed to load GAMEBERT pipeline instance:", error);
    throw error;
  }
}
