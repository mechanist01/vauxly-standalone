import { supabase } from './supabaseClient';

export const fetchDecodedCalls = async () => {
  try {
    const { data: callFolders, error: listError } = await supabase
      .storage
      .from('call-recordings')
      .list('calls');

    if (listError) {
      throw listError;
    }

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

        // Store paths directly without creating signed URLs here
        if (callData.audioFiles) {
          // Store clean paths without bucket prefix
          if (callData.audioFiles.merged) {
            callData.audioFiles.merged = `calls/${folder.name}/audio/merged.webm`;
          }
          if (callData.audioFiles.customer) {
            callData.audioFiles.customer = `calls/${folder.name}/audio/customer.webm`;
          }
          if (callData.audioFiles.rep) {
            callData.audioFiles.rep = `calls/${folder.name}/audio/rep.webm`;
          }
        }

        return callData;
      } catch (error) {
        console.error(`Error processing call ${folder.name}:`, error);
        return null;
      }
    }));

    const validCalls = callsData
      .filter(call => call !== null)
      .sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));

    return validCalls;
  } catch (error) {
    console.error('Error fetching decoded calls:', error);
    throw error;
  }
};

export const fetchAudioFromBucket = async (path) => {
  try {
    if (!path) {
      console.error('No path provided to fetchAudioFromBucket');
      return null;
    }

    // Clean the path
    let cleanPath = path;

    // If it's a full URL, extract the path
    if (cleanPath.startsWith('https://')) {
      try {
        const urlObj = new URL(cleanPath);
        cleanPath = urlObj.pathname.split('/storage/v1/object/sign/call-recordings/')[1]?.split('?')[0] || cleanPath;
      } catch (e) {
        console.error('Error parsing URL:', e);
      }
    }

    // Remove any leading slashes
    cleanPath = cleanPath.replace(/^\/+/, '');

    // Remove bucket name if it's at the start of the path
    if (cleanPath.startsWith('call-recordings/')) {
      cleanPath = cleanPath.replace('call-recordings/', '');
    }

    console.log('Requesting signed URL for clean path:', cleanPath);

    // Get the signed URL
    const { data, error } = await supabase
      .storage
      .from('call-recordings')
      .createSignedUrl(cleanPath, 7200, {
        download: false
      });

    if (error) {
      console.error('Error getting signed URL:', error);
      return null;
    }

    if (!data?.signedUrl) {
      console.error('No signed URL returned');
      return null;
    }

    // Add streaming parameters
    const finalUrl = new URL(data.signedUrl);
    finalUrl.searchParams.set('cache-control', 'no-cache, no-store, must-revalidate');
    finalUrl.searchParams.set('pragma', 'no-cache');
    finalUrl.searchParams.set('expires', '0');
    finalUrl.searchParams.set('_streaming', 'true');

    console.log('Created streaming URL:', finalUrl.toString());
    return finalUrl.toString();
  } catch (error) {
    console.error('Error in fetchAudioFromBucket:', error);
    return null;
  }
};

export const checkForNewCalls = async (currentCalls) => {
  try {
    const latestCalls = await fetchDecodedCalls();
    
    if (latestCalls.length !== currentCalls.length) {
      return true;
    }

    const currentIds = new Set(currentCalls.map(call => call.id));
    const hasNewCalls = latestCalls.some(call => !currentIds.has(call.id));

    return hasNewCalls;
  } catch (error) {
    console.error('Error checking for new calls:', error);
    return false;
  }
};

export const refreshCallUrls = async (callData) => {
  try {
    if (!callData.audioFiles) return callData;

    const updatedAudioFiles = { ...callData.audioFiles };

    // Instead of splitting URLs, use the paths directly
    if (updatedAudioFiles.merged) {
      const mergedUrl = await fetchAudioFromBucket(updatedAudioFiles.merged);
      if (mergedUrl) updatedAudioFiles.merged = mergedUrl;
    }

    if (updatedAudioFiles.customer) {
      const customerUrl = await fetchAudioFromBucket(updatedAudioFiles.customer);
      if (customerUrl) updatedAudioFiles.customer = customerUrl;
    }

    if (updatedAudioFiles.rep) {
      const repUrl = await fetchAudioFromBucket(updatedAudioFiles.rep);
      if (repUrl) updatedAudioFiles.rep = repUrl;
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