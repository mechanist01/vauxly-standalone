import React, { useState, useEffect } from 'react';
import { Upload, RefreshCw, Check, Clock } from 'lucide-react';
import { fetchDecodedCalls } from '../supapopulate';

const LoadDecodeMenu = ({ 
  isOpen, 
  onClose, 
  onCallSelect, 
  selectedCall, 
  setActiveMenu,
  onFilesSelected 
}) => {
  const [file1Stream, setFile1Stream] = useState(null);
  const [file2Stream, setFile2Stream] = useState(null);
  const [file1Name, setFile1Name] = useState('');
  const [file2Name, setFile2Name] = useState('');
  const [file1Data, setFile1Data] = useState(null);
  const [file2Data, setFile2Data] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pollingProgress, setPollingProgress] = useState('');
  const [availableCalls, setAvailableCalls] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [formData, setFormData] = useState({
    repName: '',
    customerName: '',
    saleStatus: 'Sale',
    brand: 'Vitality Now',
    product: 'Youthful Brain',
    saleAmount: '',
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredCalls, setFilteredCalls] = useState([]);

  useEffect(() => {
    if (isOpen) {
      refreshCalls();
    }
  }, [isOpen]);

  const refreshCalls = async () => {
    setIsRefreshing(true);
    try {
      const calls = await fetchDecodedCalls();
      setAvailableCalls(calls);
    } catch (error) {
      console.error('Error fetching calls:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    const searchLower = searchQuery.toLowerCase();
    const updatedCalls = availableCalls.filter((call) => 
      Object.values(call).some(
        (value) =>
          typeof value === 'string' &&
          value.toLowerCase().includes(searchLower)
      )
    );
    setFilteredCalls(updatedCalls);
  }, [searchQuery, availableCalls]);

  const handleFileUpload = async (event, fileNumber) => {
    const file = event.target.files[0];
    if (!file || !file.type.startsWith('audio/')) return;

    try {
      // Create a MediaSource instance for preview
      const mediaSource = new MediaSource();
      const audioUrl = URL.createObjectURL(mediaSource);

      mediaSource.addEventListener('sourceopen', async () => {
        const mimeType = 'audio/webm; codecs=opus';
        const sourceBuffer = mediaSource.addSourceBuffer(mimeType);

        const stream = file.stream();
        const reader = stream.getReader();

        const readChunk = async () => {
          const { done, value } = await reader.read();
          if (done) {
            mediaSource.endOfStream();
            return;
          }

          if (!sourceBuffer.updating) {
            sourceBuffer.appendBuffer(value);
          } else {
            await new Promise((resolve) => {
              sourceBuffer.addEventListener('updateend', resolve, { once: true });
            });
            readChunk();
          }
        };

        readChunk();
      });

      if (fileNumber === 1) {
        setFile1Stream(audioUrl);
        setFile1Name(file.name);
        setFile1Data(file); // Store the actual File object
      } else {
        setFile2Stream(audioUrl);
        setFile2Name(file.name);
        setFile2Data(file); // Store the actual File object
      }
    } catch (error) {
      console.error('Error setting up stream:', error);
    }
  };

  const handleDrop = async (event, fileNumber) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (!file || !file.type.startsWith('audio/')) return;
    
    // Use the same file upload handler for dropped files
    const fakeEvent = { target: { files: [file] } };
    await handleFileUpload(fakeEvent, fileNumber);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    if (!file1Stream || !file2Stream) return;
    
    setLoading(true);
    try {
      setPollingProgress('Processing streams...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      setPollingProgress('Decoding audio...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Clean up streams
      if (file1Stream) URL.revokeObjectURL(file1Stream);
      if (file2Stream) URL.revokeObjectURL(file2Stream);
      
      setFile1Stream(null);
      setFile2Stream(null);
      setFile1Name('');
      setFile2Name('');
      setFormData({
        repName: '',
        customerName: '',
        saleStatus: 'Sale',
        brand: 'Vitality Now',
        product: 'Youthful Brain',
        saleAmount: '',
      });
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setLoading(false);
      setPollingProgress('');
    }
  };

  const handleCallClick = (call) => {
    setActiveMenu('Dashboard');
    onCallSelect(call);
  };

  const handleFilesReady = async () => {
    if (file1Stream && file2Stream) {
      setPollingProgress('Processing streams...');
      await handleSubmit();
    }
  };

  useEffect(() => {
    handleFilesReady();
  }, [file1Stream, file2Stream]);

  useEffect(() => {
    if (file1Stream && file2Stream) {
      setShowPopup(true);
      onFilesSelected({
        streams: { file1: file1Stream, file2: file2Stream },
        files: { file1: file1Data, file2: file2Data },
        names: { file1: file1Name, file2: file2Name }
      });
    }
    
    // Cleanup function to revoke object URLs when component unmounts
    return () => {
      if (file1Stream) URL.revokeObjectURL(file1Stream);
      if (file2Stream) URL.revokeObjectURL(file2Stream);
    };
  }, [file1Stream, file2Stream, file1Data, file2Data, file1Name, file2Name, onFilesSelected]);

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  return (
    <div className={`slide-menu ${isOpen ? 'open' : ''}`}>
      <div className="slide-menu-content">
        <h3 className="menu-section-header">Decode Call</h3>
        <div className="upload-mini-grid">
          <div 
            className={`upload-mini-container ${file1Stream ? 'upload-success' : ''}`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDrop(e, 1)}
          >
            {file1Stream ? (
              <p className="upload-success-text">{file1Name}</p>
            ) : (
              <>
                <Upload className="upload-mini-icon" size={18} />
                <p className="upload-mini-text">Drop audio file 1</p>
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e, 1)}
                  id="file-upload-mini-1"
                  accept="audio/*"
                />
                <label htmlFor="file-upload-mini-1" className="upload-mini-label">
                  Select
                </label>
              </>
            )}
          </div>

          <div 
            className={`upload-mini-container ${file2Stream ? 'upload-success' : ''}`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDrop(e, 2)}
          >
            {file2Stream ? (
              <p className="upload-success-text">{file2Name}</p>
            ) : (
              <>
                <Upload className="upload-mini-icon" size={18} />
                <p className="upload-mini-text">Drop audio file 2</p>
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e, 2)}
                  id="file-upload-mini-2"
                  accept="audio/*"
                />
                <label htmlFor="file-upload-mini-2" className="upload-mini-label">
                  Select
                </label>
              </>
            )}
          </div>
        </div>

        <h3 className="menu-section-header">Load Call</h3>
        <div className="mini-search-box">
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search calls..."
            className="mini-search-input"
          />
        </div>

        <div className="mini-calls-list">
          <div className="mini-calls-header">
            <h3>Recent Calls</h3>
            <button 
              onClick={refreshCalls} 
              className="refresh-button"
              disabled={isRefreshing}
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <div className="mini-calls-container">
            {filteredCalls.map((call) => (
              <div 
                key={call.id} 
                className={`mini-call-item ${selectedCall?.id === call.id ? 'selected' : ''}`}
                onClick={() => handleCallClick(call)}
              >
                <div className="mini-call-info">
                  <div className="mini-call-names">
                    {call.customer} - {call.rep}
                  </div>
                  <div className="mini-call-sale">
                    {call.sale}
                  </div>
                  <div className="mini-call-date">
                    {new Date(call.uploadDate).toLocaleDateString()}
                  </div>
                  <div className="mini-call-amount">
                    ${call.saleAmount}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoadDecodeMenu;
