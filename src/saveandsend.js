import dummyCalls from './totalcalls';
import { processCallbackData } from './calldata';
import { supabase } from './supabaseClient';
import sendAudioForMerging from './mergeaudio';

const saveAndSend = async (data, audioFile1, audioFile2, onProgress = () => {}, onJobIdsReceived = () => {}) => {
  console.log('saveAndSend: Start');
  if (!audioFile1 || !audioFile2) {
    console.error('saveAndSend: Both audio files are required');
    throw new Error('Both audio files are required');
  }

  if (!(audioFile1 instanceof File) || !(audioFile2 instanceof File)) {
    console.error('saveAndSend: Invalid file objects provided');
    throw new Error('Invalid file objects provided');
  }

  const customerName = data.customerName.split(' ');
  const firstName = customerName[0];
  const lastName = customerName[customerName.length - 1];
  const uploadDate = new Date().toISOString().slice(0, 6).replace('-', '');
  const callId = `${firstName}-${lastName}-${uploadDate}`;

  console.log(`saveAndSend: Generated callId ${callId}`);

  const newCall = {
    id: callId,
    processed: 'No',
    name: data.customerName,
    sale: data.saleStatus,
    rep: data.repName,
    customer: data.customerName,
    saleAmount: data.saleAmount,
    brand: data.brand,
    product: data.product,
    uploadDate: new Date().toISOString().slice(0, 16).replace('T', ' '),
    jobIds: [],
    audioFiles: {
      customer: null,
      rep: null,
      merged: null
    },
    conversation: []
  };

  try {
    onProgress('Uploading audio files to storage...');
    console.log('saveAndSend: Uploading audio files');

    const basePath = `calls/${callId}`;
    const customerAudioPath = `${basePath}/audio/customer.wav`;
    const repAudioPath = `${basePath}/audio/rep.wav`;

    // Upload customer audio
    const customerUpload = await supabase.storage
      .from('call-recordings')
      .upload(customerAudioPath, audioFile1, {
        cacheControl: '3600',
        upsert: false
      });

    if (customerUpload.error) throw customerUpload.error;
    
    // Upload rep audio
    const repUpload = await supabase.storage
      .from('call-recordings')
      .upload(repAudioPath, audioFile2, {
        cacheControl: '3600',
        upsert: false
      });

    if (repUpload.error) throw repUpload.error;

    newCall.audioFiles = {
      customer: customerAudioPath,
      rep: repAudioPath,
      merged: null
    };

    onProgress('Sending files to Hume AI for processing...');
    
    const sendFileToHume = async (audioFile, fileName) => {
      const formData = new FormData();
      const humeConfig = {
        models: {
          prosody: {
            granularity: "utterance",
            identify_speakers: true
          }
        }
      };
      
      formData.append('json', JSON.stringify(humeConfig));
      formData.append('file', audioFile, fileName);

      if (!process.env.REACT_APP_HUME_API_KEY) {
        throw new Error('Hume API key is not configured');
      }

      const response = await fetch('https://api.hume.ai/v0/batch/jobs', {
        method: 'POST',
        headers: {
          'X-Hume-Api-Key': process.env.REACT_APP_HUME_API_KEY,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed: ${response.status} - ${errorText}`);
      }

      const responseData = await response.json();
      if (!responseData.job_id) {
        throw new Error('No job ID received from API');
      }

      return responseData.job_id;
    };

    // Start audio merging process early
    const mergePromise = (async () => {
      try {
        const mergeResult = await sendAudioForMerging(audioFile1, audioFile2, callId);
        if (mergeResult.success && mergeResult.path) {
          newCall.audioFiles.merged = mergeResult.path;
          await updateCallDataJson(newCall);
        }
      } catch (error) {
        console.error('Error in merge process:', error);
      }
    })();

    // Function to safely update call data JSON and refresh UI
    const updateCallDataJson = async (callData) => {
      try {
        await supabase.storage
          .from('call-recordings')
          .upload(
            `${basePath}/call-data.json`,
            new Blob([JSON.stringify(callData, null, 2)], { type: 'application/json' }),
            { upsert: true }
          );

        // Update dummyCalls
        const callIndex = dummyCalls.findIndex(call => call.id === callId);
        if (callIndex !== -1) {
          dummyCalls[callIndex] = {...callData};
        } else {
          dummyCalls.push({...callData});
        }
      } catch (error) {
        console.error('Error updating call-data.json:', error);
        throw error;
      }
    };

    // Get job IDs from Hume and start initial setup
    const jobId1 = await sendFileToHume(audioFile1, 'customer.wav');
    const jobId2 = await sendFileToHume(audioFile2, 'rep.wav');
    
    newCall.jobIds = [jobId1, jobId2];
    await updateCallDataJson(newCall);
    onJobIdsReceived(newCall);

    // Polling function with maximum attempts
    const pollJobStatus = async (jobId, responseKey, responses, onProgress) => {
      return new Promise((resolve, reject) => {
        let attempts = 0;
        const maxAttempts = 30; // 30 minutes maximum polling time
        
        const intervalId = setInterval(async () => {
          attempts++;
          onProgress(`Polling job ${responseKey === 'response1' ? '1' : '2'} (attempt ${attempts}/${maxAttempts})...`);
          
          if (attempts >= maxAttempts) {
            clearInterval(intervalId);
            reject(new Error(`Job ${jobId} timed out after ${maxAttempts} attempts`));
            return;
          }

          try {
            const response = await fetch(`https://api.hume.ai/v0/batch/jobs/${jobId}/predictions`, {
              method: 'GET',
              headers: {
                'X-Hume-Api-Key': process.env.REACT_APP_HUME_API_KEY,
                'accept': 'application/json; charset=utf-8'
              }
            });

            // Handle different response types
            const responseData = await response.json();
            
            // Case 1: Job is still processing
            if (response.status === 400 && responseData.message === "Job is in progress.") {
              console.log(`Job ${jobId} still processing... (attempt ${attempts})`);
              return; // Continue polling
            }
            
            // Case 2: Any other error
            if (!response.ok) {
              clearInterval(intervalId);
              reject(new Error(`Failed to fetch job status: ${response.status} - ${JSON.stringify(responseData)}`));
              return;
            }

            // Case 3: Success with predictions
            if (Array.isArray(responseData) && responseData.length > 0 && responseData[0].source && responseData[0].results) {
              clearInterval(intervalId);
              
              responses[responseKey] = {
                callback_response: {
                  predictions: responseData[0].results.predictions
                }
              };

              resolve(responseData);
              return;
            }

            // Case 4: Unexpected response format
            console.log(`Unexpected response format for job ${jobId}:`, responseData);
            
          } catch (error) {
            console.error(`Error polling job ${jobId}:`, error);
            // Don't reject here - let it continue polling unless it's a critical error
            if (error.name !== 'TypeError' && error.name !== 'NetworkError') {
              clearInterval(intervalId);
              reject(error);
            }
          }
        }, 60000); // 60 second interval

        // Add cleanup on promise rejection
        return () => clearInterval(intervalId);
      });
    };

    // Usage remains the same
    const responses = { response1: null, response2: null };
    let conversationProcessed = false;

    await Promise.all([
      pollJobStatus(jobId1, 'response1', responses, onProgress),
      pollJobStatus(jobId2, 'response2', responses, onProgress)
    ]);

    // Process results only after both are complete
    if (responses.response1 && responses.response2 && !conversationProcessed) {
      conversationProcessed = true;
      onProgress('Processing complete! Finalizing results...');
      
      const conversationData = processCallbackData(responses);
      if (conversationData && conversationData.conversation) {
        newCall.conversation = conversationData.conversation;
        newCall.processed = 'Yes';
        
        await mergePromise;
        await updateCallDataJson(newCall);
      }
    }

    return {
      callId,
      success: true,
      paths: {
        customer: customerAudioPath,
        rep: repAudioPath,
        callData: `${basePath}/call-data.json`
      }
    };

  } catch (error) {
    console.error('saveAndSend: Error processing files', error);
    throw error;
  }
};

export default saveAndSend;
