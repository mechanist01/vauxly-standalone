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

  const callId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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
    dummyCalls.push(newCall);
    onJobIdsReceived(newCall);

    // Start polling process with better response handling
    let responses = { response1: null, response2: null };
    let conversationProcessed = false;

    const pollJobStatus = async (jobId, responseKey) => {
      return new Promise((resolve, reject) => {
        let attempts = 0;
        const intervalId = setInterval(async () => {
          attempts++;
          onProgress(`Polling job ${responseKey === 'response1' ? '1' : '2'} (attempt ${attempts})...`);
          
          try {
            const response = await fetch(`https://api.hume.ai/v0/batch/jobs/${jobId}/predictions`, {
              method: 'GET',
              headers: {
                'X-Hume-Api-Key': process.env.REACT_APP_HUME_API_KEY,
                'accept': 'application/json; charset=utf-8'
              }
            });

            if (!response.ok) {
              clearInterval(intervalId);
              reject(new Error(`Failed to fetch job status: ${response.status}`));
              return;
            }

            const jobStatus = await response.json();

            if (Array.isArray(jobStatus) && jobStatus.length > 0 && jobStatus[0].source && jobStatus[0].results) {
              clearInterval(intervalId);
              
              responses[responseKey] = {
                callback_response: {
                  predictions: jobStatus[0].results.predictions
                }
              };

              // Only process conversation data when both responses are available
              if (responses.response1 && responses.response2 && !conversationProcessed) {
                conversationProcessed = true; // Prevent multiple processing
                onProgress('Processing complete! Finalizing results...');
                
                const conversationData = processCallbackData(responses);
                if (conversationData && conversationData.conversation) {
                  newCall.conversation = conversationData.conversation;
                  newCall.processed = 'Yes';

                  // Wait for merge to complete before final update
                  await mergePromise;
                  
                  // Update both Supabase and dummyCalls
                  await updateCallDataJson(newCall);
                }
              }

              resolve(jobStatus);
            }

          } catch (error) {
            clearInterval(intervalId);
            reject(error);
          }
        }, 60000);
      });
    };

    // Start polling in the background and wait for both to complete
    await Promise.all([
      pollJobStatus(jobId1, 'response1'),
      pollJobStatus(jobId2, 'response2')
    ]);

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
