import { supabase } from './supabaseClient';

export const getAudioStream = async (selectedCall) => {
  try {
    if (!selectedCall?.audioFiles?.merged) {
      console.error('No merged audio file path available:', selectedCall);
      return null;
    }

    console.log('Getting audio stream for path:', selectedCall.audioFiles.merged);

    // Get public URL for the merged audio file
    const { data: publicUrlData } = supabase
      .storage
      .from('call-recordings')
      .getPublicUrl(selectedCall.audioFiles.merged);

    if (!publicUrlData?.publicUrl) {
      console.error('Failed to get public URL for:', selectedCall.audioFiles.merged);
      return null;
    }

    console.log('Got public URL:', publicUrlData.publicUrl);
    return publicUrlData.publicUrl;

  } catch (error) {
    console.error('Error getting audio stream:', error);
    throw error;
  }
};

export const initializeAudioPlayer = async (audioElement, selectedCall) => {
  try {
    if (!audioElement) {
      throw new Error('No audio element provided');
    }

    console.log('Initializing audio player for call:', selectedCall?.id);

    // Reset current audio
    audioElement.pause();
    audioElement.currentTime = 0;
    audioElement.src = '';

    if (!selectedCall) {
      console.log('No call selected, audio player cleared');
      return;
    }

    // Get audio URL
    const audioUrl = await getAudioStream(selectedCall);
    if (!audioUrl) {
      throw new Error('Failed to get audio URL');
    }

    console.log('Setting audio source to:', audioUrl);
    audioElement.src = audioUrl;

  } catch (error) {
    console.error('Error initializing audio player:', error);
    throw error;
  }
};

export const updateAudioTimestamp = (audioElement, timestamp) => {
  if (!audioElement) return;
  
  try {
    if (typeof timestamp === 'number' && !isNaN(timestamp)) {
      audioElement.currentTime = timestamp;
      console.log('Audio timestamp updated:', timestamp);
    } else {
      console.error('Invalid timestamp:', timestamp);
    }
  } catch (error) {
    console.error('Error updating audio timestamp:', error);
  }
};

export const getCurrentAudioTime = (audioElement) => {
  if (!audioElement) return 0;
  return audioElement.currentTime;
};

export const isAudioPlaying = (audioElement) => {
  if (!audioElement) return false;
  return !audioElement.paused;
};
