// src/components/LoadDecodeMenu.js
import React, { useState, useEffect } from 'react';
import { Upload, RefreshCw, Check, Clock } from 'lucide-react';
import { fetchDecodedCalls } from '../supapopulate';

const LoadDecodeMenu = ({ 
  isOpen, 
  onClose, 
  onCallSelect, 
  selectedCall, 
  setActiveMenu,
  onFilesSelected  // New prop for notifying parent of file uploads
}) => {
  const [file1, setFile1] = useState(null);
  const [file2, setFile2] = useState(null);
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

  // Fetch calls on component mount and when menu opens
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

  const handleFileUpload = (event, fileNumber) => {
    const file = event.target.files[0];
    if (!file || !file.type.startsWith('audio/')) return;
    if (fileNumber === 1) setFile1(file);
    else setFile2(file);
  };

  const handleDrop = (event, fileNumber) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (!file || !file.type.startsWith('audio/')) return;
    if (fileNumber === 1) setFile1(file);
    else setFile2(file);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    if (!file1 || !file2) return;
    
    setLoading(true);
    try {
      // Your existing form submission logic here
      setPollingProgress('Processing files...');
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 2000));
      setPollingProgress('Decoding audio...');
      // Simulate more processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Reset form after successful submission
      setFile1(null);
      setFile2(null);
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
    // Switch to dashboard view and update selected call
    setActiveMenu('Dashboard');
    onCallSelect(call);
    // Note: Removed the onClose() call to keep the menu open
  };

  // Monitor file uploads and notify parent component
  useEffect(() => {
    if (file1 && file2) {
      onFilesSelected(file1, file2);
    }
  }, [file1, file2, onFilesSelected]);

  return (
    <div className={`slide-menu ${isOpen ? 'open' : ''}`}>
      <div className="slide-menu-content">
        <div className="upload-mini-grid">
          {/* Upload containers */}
          <div 
            className={`upload-mini-container ${file1 ? 'upload-success' : ''}`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDrop(e, 1)}
          >
            {file1 ? (
              <p className="upload-success-text">{file1.name}</p>
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
            className={`upload-mini-container ${file2 ? 'upload-success' : ''}`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDrop(e, 2)}
          >
            {file2 ? (
              <p className="upload-success-text">{file2.name}</p>
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
        
        <div className="mini-calls-list">
          {/* Calls list content */}
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
            {availableCalls.map((call, index) => (
              <div 
                key={call.id} 
                className={`mini-call-item ${selectedCall?.id === call.id ? 'selected' : ''}`}
                onClick={() => handleCallClick(call)}
              >
                <div className="mini-call-info">
                  <div className="mini-call-names">
                    {call.customer} - {call.rep}
                  </div>
                  <div className="mini-call-details">
                    <span className="mini-call-date">
                      {new Date(call.uploadDate).toLocaleDateString()}
                    </span>
                    <span className="mini-call-amount">${call.saleAmount}</span>
                    <div className="mini-call-status">
                      {call.processed === 'Yes' ? (
                        <>
                          <Check size={14} className="text-green-500" />
                          <span>Processed</span>
                        </>
                      ) : (
                        <>
                          <Clock size={14} className="text-yellow-500" />
                          <span>Processing</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {(file1 || file2) && (
          <div className="mini-form">
            {/* Form content */}
            {/* Your existing form content... */}
          </div>
        )}
      </div>
    </div>
  );
};

export default LoadDecodeMenu;
