const sendAudioForMerging = async (audioFile1, audioFile2, callId) => {
  try {
    console.log('Original files:', {
      file1Size: audioFile1.size,
      file2Size: audioFile2.size,
      file1Type: audioFile1.type,
      file2Type: audioFile2.type,
      callId
    });

    // Function to convert File to AudioBuffer
    const fileToAudioBuffer = async (file) => {
      const arrayBuffer = await file.arrayBuffer();
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      return await audioContext.decodeAudioData(arrayBuffer);
    };

    // Function to convert AudioBuffer to WebM using MediaRecorder
    const audioBufferToWebM = async (buffer) => {
      return new Promise((resolve, reject) => {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const source = audioContext.createBufferSource();
        source.buffer = buffer;
        
        const destination = audioContext.createMediaStreamDestination();
        source.connect(destination);

        const mediaRecorder = new MediaRecorder(destination.stream, {
          mimeType: 'audio/webm;codecs=opus',
          bitsPerSecond: 128000
        });

        const chunks = [];
        
        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            chunks.push(e.data);
          }
        };

        mediaRecorder.onstop = () => {
          const blob = new Blob(chunks, { type: 'audio/webm' });
          resolve(blob);
        };

        mediaRecorder.onerror = (err) => {
          reject(err);
        };

        // Start recording
        mediaRecorder.start();

        // Instead of playing the buffer, we'll manually trigger the stop
        // after a very short delay to capture the entire buffer
        source.start(0);
        
        // Stop after a minimal delay - just enough to ensure the buffer is processed
        setTimeout(() => {
          mediaRecorder.stop();
          source.disconnect();
          destination.disconnect();
        }, 100); // 100ms delay should be sufficient
      });
    };

    let processedFile1, processedFile2;

    // Convert files if needed
    if (!audioFile1.type.includes('webm') || !audioFile2.type.includes('webm')) {
      console.log('Converting files to WebM format...');
      
      // Convert both files to AudioBuffer first
      const buffer1 = await fileToAudioBuffer(audioFile1);
      const buffer2 = await fileToAudioBuffer(audioFile2);
      
      // Convert AudioBuffers to WebM
      const webm1 = await audioBufferToWebM(buffer1);
      const webm2 = await audioBufferToWebM(buffer2);

      processedFile1 = new File([webm1], 'customer.webm', { type: 'audio/webm' });
      processedFile2 = new File([webm2], 'rep.webm', { type: 'audio/webm' });

      console.log('Conversion complete:', {
        originalFile1Size: audioFile1.size,
        originalFile2Size: audioFile2.size,
        processedFile1Size: processedFile1.size,
        processedFile2Size: processedFile2.size,
      });
    } else {
      processedFile1 = audioFile1;
      processedFile2 = audioFile2;
    }

    // Send original files if they're WAV, or processed files if conversion was needed
    const filesToSend = {
      file1: audioFile1.type === 'audio/wav' ? audioFile1 : processedFile1,
      file2: audioFile2.type === 'audio/wav' ? audioFile2 : processedFile2
    };

    console.log('Files being sent:', {
      file1Size: filesToSend.file1.size,
      file2Size: filesToSend.file2.size,
      file1Type: filesToSend.file1.type,
      file2Type: filesToSend.file2.type
    });

    const formData = new FormData();
    formData.append('audio1', filesToSend.file1);
    formData.append('audio2', filesToSend.file2);
    formData.append('callId', callId);

    const response = await fetch('http://127.0.0.1:5000/merge', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Server error response:', errorText);
      throw new Error(`Server responded with ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    console.log('Merge result:', result);
    return result;

  } catch (error) {
    console.error('Error merging audio:', error);
    throw error;
  }
};

export default sendAudioForMerging;