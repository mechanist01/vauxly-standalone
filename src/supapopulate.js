import { supabase } from './supabaseClient';

export const fetchDecodedCalls = async () => {
  try {
    // List all folders in the calls directory of the call-recordings bucket
    const { data: callFolders, error: listError } = await supabase
      .storage
      .from('call-recordings')
      .list('calls');

    if (listError) {
      throw listError;
    }

    // Process each call folder
    const callsData = await Promise.all(callFolders.map(async (folder) => {
      try {
        // Get the call-data.json file for each call
        const { data: jsonData, error: downloadError } = await supabase
          .storage
          .from('call-recordings')
          .download(`calls/${folder.name}/call-data.json`);

        if (downloadError) {
          console.error(`Error downloading data for call ${folder.name}:`, downloadError);
          return null;
        }

        // Parse the JSON data
        const text = await jsonData.text();
        const callData = JSON.parse(text);

        // Get signed URLs for audio files if they exist
        if (callData.audioFiles) {
          if (callData.audioFiles.merged) {
            const { data: { signedUrl: mergedUrl } } = await supabase
              .storage
              .from('call-recordings')
              .createSignedUrl(callData.audioFiles.merged, 3600); // 1 hour expiry

            callData.audioFiles.merged = mergedUrl;
          }

          if (callData.audioFiles.customer) {
            const { data: { signedUrl: customerUrl } } = await supabase
              .storage
              .from('call-recordings')
              .createSignedUrl(callData.audioFiles.customer, 3600);

            callData.audioFiles.customer = customerUrl;
          }

          if (callData.audioFiles.rep) {
            const { data: { signedUrl: repUrl } } = await supabase
              .storage
              .from('call-recordings')
              .createSignedUrl(callData.audioFiles.rep, 3600);

            callData.audioFiles.rep = repUrl;
          }
        }

        return callData;
      } catch (error) {
        console.error(`Error processing call ${folder.name}:`, error);
        return null;
      }
    }));

    // Filter out any null values from failed processing and sort by upload date
    const validCalls = callsData
      .filter(call => call !== null)
      .sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));

    return validCalls;
  } catch (error) {
    console.error('Error fetching decoded calls:', error);
    throw error;
  }
};

export const fetchAudioFromBucket = async (audioUrl) => {
  try {
    // If the URL is already a signed URL, return it directly
    if (audioUrl.includes('token=')) {
      return audioUrl;
    }

    // Otherwise, create a new signed URL
    const { data: { signedUrl }, error } = await supabase
      .storage
      .from('call-recordings')
      .createSignedUrl(audioUrl, 3600); // 1 hour expiry

    if (error) {
      throw error;
    }

    return signedUrl;
  } catch (error) {
    console.error('Error fetching audio from bucket:', error);
    throw error;
  }
};

// Helper function to check if new calls are available
export const checkForNewCalls = async (currentCalls) => {
  try {
    const latestCalls = await fetchDecodedCalls();
    
    // Compare the number of calls
    if (latestCalls.length !== currentCalls.length) {
      return true;
    }

    // Compare the latest call IDs
    const currentIds = new Set(currentCalls.map(call => call.id));
    const hasNewCalls = latestCalls.some(call => !currentIds.has(call.id));

    return hasNewCalls;
  } catch (error) {
    console.error('Error checking for new calls:', error);
    return false;
  }
};

// Function to refresh signed URLs for a specific call
export const refreshCallUrls = async (callData) => {
  try {
    if (!callData.audioFiles) return callData;

    const updatedAudioFiles = { ...callData.audioFiles };

    if (updatedAudioFiles.merged) {
      const { data: { signedUrl: mergedUrl } } = await supabase
        .storage
        .from('call-recordings')
        .createSignedUrl(updatedAudioFiles.merged.split('?')[0], 3600);
      updatedAudioFiles.merged = mergedUrl;
    }

    if (updatedAudioFiles.customer) {
      const { data: { signedUrl: customerUrl } } = await supabase
        .storage
        .from('call-recordings')
        .createSignedUrl(updatedAudioFiles.customer.split('?')[0], 3600);
      updatedAudioFiles.customer = customerUrl;
    }

    if (updatedAudioFiles.rep) {
      const { data: { signedUrl: repUrl } } = await supabase
        .storage
        .from('call-recordings')
        .createSignedUrl(updatedAudioFiles.rep.split('?')[0], 3600);
      updatedAudioFiles.rep = repUrl;
    }

    return {
      ...callData,
      audioFiles: updatedAudioFiles
    };
  } catch (error) {
    console.error('Error refreshing call URLs:', error);
    return callData;
  }
};