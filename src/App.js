import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Play, SkipBack, SkipForward, Home, FileText, BarChart2, Settings, Menu, Upload, RefreshCw } from 'lucide-react';
import { calculateFillerWordPercentage } from './tools/FillerWords';
import { calculateRepWPM } from './tools/repwpm';
import { calculateMatchPercentage } from './tools/ScriptAdherence';
import { calculateCallControl } from './tools/callcontrol';
import { calculateCustomerMotivation } from './tools/customermotivation';
import { calculateRepCertainty } from './tools/repcertainty';
import CustomerAppreciation from './tools/CustomerAppreciation';
import SkipButtons from './tools/callskip';
import './App.css';
import dummyCalls from './totalcalls';
import saveAndSend from './saveandsend';
import { getAudioStream, updateAudioTimestamp } from './grabaudioplay';
import { fetchDecodedCalls, fetchAudioFromBucket } from './supapopulate';
import LoadDecodeMenu from './tools/LoadDecodeMenu'; // Add this import at the top

const TWO_MINUTES = 120;

const formatCustomerJourneyData = (data) => {
  return data
    .filter(item => item.speaker === 'Customer')
    .map(item => ({
      time: item.timestamp,
      score: ((item.top_sentiments[0]?.score || 0) * 100) * 8,
      sentiment: item.top_sentiments[0]?.name || 'Unknown',
      message: item.message
    }));
};

const getMaxScore = (data) => {
  const maxScore = Math.max(...data.map(item => 
    Math.max(...item.top_sentiments.map(s => s.score))
  ));
  const adjustedMax = Math.round((maxScore * 1.3) * 1000) / 1000;
  return adjustedMax;
};

const formatTime = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ backgroundColor: '#2d3748', padding: '0.5rem', borderRadius: '0.25rem', boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)', border: '1px solid #4a5568' }}>
        <p style={{ color: '#f7fafc', fontSize: '0.875rem' }}>Time: {formatTime(label)}</p>
        <p style={{ color: '#f7fafc', fontSize: '0.875rem' }}>Sentiment: {payload[0].payload.sentiment}</p>
        <p style={{ color: '#f7fafc', fontSize: '0.875rem' }}>Score: {payload[0].payload.score.toFixed(3)}</p>
        <p style={{ color: '#f7fafc', fontSize: '0.875rem', marginTop: '0.25rem', maxWidth: '20rem', wordWrap: 'break-word' }}>"{payload[0].payload.message}"</p>
      </div>
    );
  }
  return null;
};

// Sidebar component
const Sidebar = ({ activeMenu, setActiveMenu, onLoadDecodeClick, isLoadDecodeOpen }) => {
  const menuItems = ['Dashboard', 'Decoded Calls'];

  return (
    <div className="sidebar">
      <h2>vauxly</h2>
      {menuItems.map((item) => (
        <button
          key={item}
          className={activeMenu === item ? 'active' : ''}
          onClick={() => setActiveMenu(item)}
        >
          {item}
        </button>
      ))}
      <button
        onClick={onLoadDecodeClick}
        className={`load-decode-button ${isLoadDecodeOpen ? 'active' : ''}`} // Updated line
      >
        Load & Decode
      </button>
    </div>
  );
};

const Dashboard = ({
  selectedCall,
  handleCallChange,
  availableCalls,
  repCertaintyScore,
  callControlScore,
  customerMotivation,
  fillerWordPercentage,
  repWPM,
  scriptMatchPercentage,
  customerJourneyData,
  visibleTimeRange,
  handleScroll,
  chatBoxRef,
  loading,
  chatData,
  handleTimestampClick,
  setVisibleTimeRange,
  buttonConfigs,
  refreshAvailableCalls,
  isRefreshing,
  audioRef,
  setCurrentTime,
  onDropdownOpen
}) => {
  const processedCalls = availableCalls.filter(call => call.processed === 'Yes');
  console.log('Available calls:', availableCalls);
  console.log('Processed calls:', processedCalls);
  console.log('Selected call:', selectedCall);

  return (
    <div className="dashboard">
      <div className="main-container">
        <div className="decoded-call-section">
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <select
              id="call-select"
              value={selectedCall ? selectedCall.id : ''}  // Changed from customer to id
              onChange={handleCallChange}
              onClick={onDropdownOpen}
              onFocus={onDropdownOpen}
            >
              <option value="">Select a call</option>
              {processedCalls.map((call) => {
                console.log('Rendering option for call:', call);
                return (
                  <option key={call.id} value={call.id}>  // Changed from index to call.id
                    {`${call.customer} - ${call.rep} - $${call.saleAmount}`}
                  </option>
                );
              })}
            </select>
          </div>

          {selectedCall && (
            <div className="call-tags flex space-x-2 mt-2">
              <div className="tag bg-secondary text-white p-2 rounded cursor-pointer">
                Sale: {selectedCall.sale}
              </div>
              <div className="tag bg-secondary text-white p-2 rounded cursor-pointer">
                Upload Date: {selectedCall.uploadDate}
              </div>
              <div className="tag bg-secondary text-white p-2 rounded cursor-pointer">
                Brand: {selectedCall.brand}
              </div>
              <div className="tag bg-secondary text-white p-2 rounded cursor-pointer">
                Product: {selectedCall.product}
              </div>
              <div className="tag bg-secondary text-white p-2 rounded cursor-pointer">
                Amount: ${selectedCall.saleAmount}
              </div>
            </div>
          )}
        </div>

        {/* AI Analysis Grid */}
        <AnalysisGrid
          repCertaintyScore={repCertaintyScore}
          callControlScore={callControlScore}
          customerMotivation={customerMotivation}
          selectedCall={selectedCall}
        />

        {/* Rep Analysis Grid */}
        <div className="analysis-grid">
          <CustomerAppreciation />
          <div className="analysis-item">
            <h3>Filler Words</h3>
            <p>
              <span
                style={{ fontSize: '28px', fontWeight: 'bold', color: getFillerWordColor(fillerWordPercentage) }}
              >
                {fillerWordPercentage.toFixed(2)}%
              </span>
            </p>
          </div>
          <div className="analysis-item">
            <h3>Words/Minute</h3>
            <p>
              <span
                style={{ fontSize: '28px', fontWeight: 'bold', color: getWPMColor(repWPM) }}
              >
                {repWPM.toFixed(2)}
              </span>
            </p>
          </div>
          <div className="analysis-item">
            <h3>Script Adherence</h3>
            <p>
              <span
                style={{ fontSize: '28px', fontWeight: 'bold', color: getScriptAdherenceColor(scriptMatchPercentage) }}
              >
                {scriptMatchPercentage.toFixed(2)}%
              </span>
            </p>
          </div>
        </div>

        {/* Audio Timeline */}
        <div className="audio-timeline">
          <audio 
            ref={audioRef}
            controls 
            className="audio-player"
            onLoadStart={() => {
              console.log('Audio loading started');
            }}
            onCanPlay={() => {
              console.log('Audio ready to play');
            }}
            onError={(e) => {
              console.error('Audio error:', e);
            }}
          />
        </div>

        {/* Customer Journey and Conversation */}
        <div className="customer-journey-conversation">
          <div className="customer-sentiment-journey">
            <h3>Customer Sentiment Journey</h3>
            <ResponsiveContainer width="95%" height={290}>
              <LineChart
                data={customerJourneyData.filter(
                  item => item.time >= visibleTimeRange[0] && item.time <= visibleTimeRange[1]
                )}
                margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#4a5568" />
                <XAxis
                  dataKey="time"
                  tickFormatter={formatTime}
                  stroke="#f7fafc"
                  tick={{ fill: '#f7fafc' }}
                  domain={visibleTimeRange}
                  allowDataOverflow
                />
                <YAxis
                  domain={[-100, 100]}
                  stroke="#f7fafc"
                  tick={false} // Remove Y-axis labels
                  tickFormatter={(value) => `${value.toFixed(0)}%`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#4299e1"
                  strokeWidth={2}
                  dot={{ fill: '#4299e1', r: 4 }}
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
            <input
              type="range"
              className="custom-range-slider"
              min="0"
              max={Math.max(0, Math.floor(customerJourneyData[customerJourneyData.length - 1]?.time || 0) - TWO_MINUTES)}
              value={visibleTimeRange[0]}
              onChange={(e) => {
                const newStart = Number(e.target.value);
                setVisibleTimeRange([newStart, newStart + TWO_MINUTES]);
                if (audioRef.current) {
                  audioRef.current.currentTime = newStart + TWO_MINUTES / 2;
                }
              }}
              style={{ width: '95%', marginTop: '0.5rem' }}
            />
          </div>

          <div className="conversation-container">
            <div className="message-box">
              <div 
                className="conversation-messages" 
                ref={chatBoxRef}
              >
                {loading ? (
                  <div className="text-center text-white">Loading conversation...</div>
                ) : chatData.length === 0 ? (
                  <div className="text-center text-white">No conversation data available</div>
                ) : (
                  chatData.map((message, index) => (
                    <div
                      key={index}
                      id={`message-${index}`}
                      className={`message-wrapper ${message.speaker === 'Rep' ? 'message-left' : 'message-right'} ${
                        message.timestamp >= visibleTimeRange[0] && 
                        message.timestamp <= visibleTimeRange[1] ? 
                        'message-visible' : ''
                      }`}
                      data-timestamp={message.timestamp}
                    >
                      <div className={`message ${message.speaker === 'Rep' ? 'message-rep' : 'message-customer'}`}>
                        <p className="message-text">{message.message}</p>
                        <div className="message-sentiments">
                          {message.top_sentiments.map((sentiment, idx) => (
                            <span key={idx} className="sentiment-tag">
                              {sentiment.name}
                            </span>
                          ))}
                        </div>
                        <span
                          className="message-time"
                          onClick={() => {
                            if (audioRef.current) {
                              audioRef.current.currentTime = message.timestamp;
                            }
                          }}
                        >
                          {formatTime(message.timestamp)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            <SkipButtons
              chatData={chatData}
              setVisibleTimeRange={setVisibleTimeRange}
              buttonConfigs={buttonConfigs}
              chatBoxRef={chatBoxRef}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// Define color calculation functions
const getFillerWordColor = (percentage) => {
  if (percentage < 1.5) return '#39e642';
  else if (percentage >= 1.5 && percentage < 3) return '#f6e05e';
  else return '#e53e3e';
};

const getWPMColor = (wpm) => {
  if (wpm < 155) return '#39e642';
  else if (wpm >= 155 && wpm < 180) return '#f6e05e';
  else return '#e53e3e';
};

const getScriptAdherenceColor = (percentage) => {
  if (percentage >= 90) return '#39e642';
  else if (percentage >= 75 && percentage < 90) return '#f6e05e';
  else return '#e53e3e';
};

// Define color functions for the analysis grid
const getRepCertaintyColor = (score) => {
  if (score >= 80) return '#39e642';
  else if (score >= 50) return '#f6e05e';
  else return '#e53e3e';
};

const getCallControlColor = (score) => {
  if (score >= 70) return '#39e642';
  else if (score >= 40) return '#f6e05e';
  else return '#e53e3e';
};

const getCustomerMotivationColor = (score) => {
  if (score >= 70) return '#39e642';
  else if (score >= 40) return '#f6e05e';
  else return '#e53e3e';
};

// Analysis Grid Component
const AnalysisGrid = ({ repCertaintyScore, callControlScore, customerMotivation, selectedCall }) => {
  const isSale = selectedCall?.sale?.toLowerCase() === 'sale' || 
                selectedCall?.sale?.toLowerCase() === 'sold';

  return (
    <div className="analysis-grid">
      <div className="analysis-item">
        <h3 className={`strikethrough-container ${isSale ? 'active fade-text' : ''}`}>
          Customer Objection Reason
        </h3>
        <p></p> 
      </div>
      <div className="analysis-item">
        <h3>Rep Certainty</h3>
        <p>
          <span style={{ 
            fontSize: '28px', 
            fontWeight: 'bold',
            color: getRepCertaintyColor(repCertaintyScore)
          }}>
            {repCertaintyScore}%
          </span>
        </p>
      </div>
      <div className="analysis-item">
        <h3>Call Control</h3>
        <p>
          <span style={{ 
            fontSize: '28px', 
            fontWeight: 'bold',
            color: getCallControlColor(callControlScore)
          }}>
            {callControlScore}%
          </span>
        </p>
      </div>
      <div className="analysis-item">
        <h3>Customer Motivation</h3>
        <p>
          <span style={{ 
            fontSize: '28px', 
            fontWeight: 'bold',
            color: getCustomerMotivationColor(customerMotivation.motivationScore)
          }}>
            {customerMotivation.motivationScore}%
          </span>
        </p>
      </div>
    </div>
  );
};

const CallList = ({ availableCalls }) => {
  return (
    <div className="calllist">
      <div className="calllist-header">
        <div className="calllist-item">Processed</div>
        <div className="calllist-item">Call Name</div>
        <div className="calllist-item">Sale Status</div>
        <div className="calllist-item">Rep Name</div>
        <div className="calllist-item">Customer Name</div>
        <div className="calllist-item">Sale Amount</div>
        <div className="calllist-item">Brand</div>
        <div className="calllist-item">Product</div>
      </div>
      {availableCalls.map((call, index) => (
        <div key={index} className="calllist-row">
          <div className="calllist-item">{call.processed}</div>
          <div className="calllist-item">{call.name}</div>
          <div className="calllist-item">{call.sale}</div>
          <div className="calllist-item">{call.rep}</div>
          <div className="calllist-item">{call.customer}</div>
          <div className="calllist-item">{call.saleAmount}</div>
          <div className="calllist-item">{call.brand}</div>
          <div className="calllist-item">{call.product}</div>
        </div>
      ))}
    </div>
  );
};



const App = () => {
  // State declarations
  const [selectedCall, setSelectedCall] = useState('Call 1');
  const [currentTime, setCurrentTime] = useState(0);
  const [chatData, setChatData] = useState([]);
  const [customerJourneyData, setCustomerJourneyData] = useState([]);
  const [maxScore, setMaxScore] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [visibleTimeRange, setVisibleTimeRange] = useState([0, TWO_MINUTES]);
  const [fillerWordPercentage, setFillerWordPercentage] = useState(0);
  const [repWPM, setRepWPM] = useState(0);
  const [scriptMatchPercentage, setScriptMatchPercentage] = useState(0);
  const [callControlScore, setCallControlScore] = useState(0);
  const [customerMotivation, setCustomerMotivation] = useState({ motivationScore: 0 });
  const [repCertaintyScore, setRepCertaintyScore] = useState(0);
  const [audio, setAudio] = useState(null);
  const [activeMenu, setActiveMenu] = useState('Dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [file1, setFile1] = useState(null);
  const [file2, setFile2] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const [formData, setFormData] = useState({
    repName: '',
    customerName: '',
    saleStatus: 'Sale',
    brand: 'Vitality Now',
    product: 'Youthful Brain',
    saleAmount: '',
  });
  const [savedCalls, setSavedCalls] = useState([]); // New state for saved calls
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [availableCalls, setAvailableCalls] = useState([]);
  const [isPolling, setIsPolling] = useState(false);
  const [pollingProgress, setPollingProgress] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoadDecodeOpen, setIsLoadDecodeOpen] = useState(false);
  
  const chatBoxRef = useRef(null);

  const buttonConfigs = [
    { buttonText: 'Intro', searchText: 'vitality now with' },
    { buttonText: 'Discovery', searchText: 'brought' },
    { buttonText: 'Protocol Review', searchText: 'right path' },
    { buttonText: 'Step 1', searchText: 'based on what' },
    { buttonText: 'Step 2', searchText: 'the first supplement' },
    { buttonText: 'Step 3', searchText: 'in a VIP bundle' },
    { buttonText: 'Step 4', searchText: '6 or the 12 months supply' },
    { buttonText: 'Walkdown', searchText: 'send you the first' }
  ];

  // Use ref instead of state for audio element
  const audioRef = useRef(null);

  // Function to get call data from dummyCalls
  const getCallData = () => {
    return [...dummyCalls]; // Return a copy of dummyCalls
  };

  // Modified handleCallChange to process metrics when a call is selected
  const handleCallChange = async (event) => {
    const selectedId = event.target.value;
    console.log('handleCallChange called with value:', selectedId);
    setLoading(true);

    try {
      if (!selectedId) {
        console.log('No call selected, resetting state');
        setSelectedCall(null);
        resetMetrics();
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.src = '';
        }
        return;
      }

      const callData = availableCalls.find(call => call.id === selectedId);
      console.log('Found call data:', callData);

      if (callData && callData.conversation) {
        setSelectedCall(callData);

        // Fetch audio URL from Supabase bucket
        if (audioRef.current && callData.audioFiles?.merged) {
          try {
            const audioUrl = await fetchAudioFromBucket(callData.audioFiles.merged);
            console.log('Fetched audio URL:', audioUrl);
            if (audioUrl) {
              audioRef.current.src = audioUrl;
            } else {
              console.error('Failed to get audio URL');
            }
          } catch (error) {
            console.error('Error loading audio URL:', error);
          }
        }

        // Process conversation data for metrics
        const conversation = callData.conversation;
        console.log('Processing conversation data:', conversation);
        
        // Calculate metrics
        const fillerPercentage = calculateFillerWordPercentage(conversation);
        setFillerWordPercentage(fillerPercentage || 0);
        
        const wpm = calculateRepWPM(conversation);
        setRepWPM(wpm);
        
        const matchPercentage = calculateMatchPercentage(conversation);
        setScriptMatchPercentage(matchPercentage);
        
        const controlScore = calculateCallControl(conversation);
        setCallControlScore(controlScore);
        
        const motivation = calculateCustomerMotivation(conversation);
        setCustomerMotivation(motivation);
        
        const certaintyScore = calculateRepCertainty(conversation);
        setRepCertaintyScore(certaintyScore);

        // Update chat data and customer journey
        setChatData(conversation);
        const journeyData = formatCustomerJourneyData(conversation);
        setCustomerJourneyData(journeyData);
        
        // Reset visible time range
        setVisibleTimeRange([0, TWO_MINUTES]);
      }
    } catch (error) {
      console.error('Error in handleCallChange:', error);
      resetMetrics();
    } finally {
      setLoading(false);
    }
  };

  const handleDropdownOpen = async () => {
    console.log('Dropdown opened, current state:', { isDropdownOpen, availableCalls });
    if (!isDropdownOpen) {
      setIsDropdownOpen(true);
      try {
        setLoading(true);
        const calls = await fetchDecodedCalls();
        console.log('Fetched calls:', calls);
        if (Array.isArray(calls) && calls.length > 0) {
          setAvailableCalls(calls);
          console.log('Updated available calls:', calls);
        } else {
          console.log('No calls fetched or empty array received');
        }
      } catch (error) {
        console.error('Error in handleDropdownOpen:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  // Helper function to reset all metrics
  const resetMetrics = () => {
    setChatData([]);
    setCustomerJourneyData([]);
    setMaxScore(0);
    setFillerWordPercentage(0);
    setRepWPM(0);
    setScriptMatchPercentage(0);
    setCallControlScore(0);
    setCustomerMotivation({ motivationScore: 0 });
    setRepCertaintyScore(0);
  };

  // Modified refreshAvailableCalls to handle metrics update
  const refreshAvailableCalls = async () => {
    setIsRefreshing(true);
    try {
      const freshCallData = await fetchDecodedCalls();
      setAvailableCalls(freshCallData);
      
      if (selectedCall) {
        const updatedCallData = freshCallData.find(
          call => call.customer === selectedCall.customer
        );
        if (updatedCallData && updatedCallData.conversation) {
          setSelectedCall(updatedCallData);
          handleCallChange({ target: { value: updatedCallData.customer } });
        }
      }
    } catch (error) {
      console.error('Error refreshing calls:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Event handlers
  const handleScroll = (event) => {
    if (!chatData.length) return;
    
    const scrollValue = Number(event.target.value);
    setVisibleTimeRange([scrollValue, scrollValue + TWO_MINUTES]);
  };

  const handleTimestampClick = (timestamp) => {
    if (!chatData.length) return;
    
    if (audioRef.current) {
      updateAudioTimestamp(audioRef.current, timestamp);
    }
    
    const start = Math.max(0, timestamp - TWO_MINUTES / 2);
    const end = start + TWO_MINUTES;
    setVisibleTimeRange([start, end]);

    // Scroll to the message in the chat
    const messageElement = document.querySelector(`[data-timestamp="${timestamp}"]`);
    if (messageElement && chatBoxRef.current) {
      chatBoxRef.current.scrollTo({
        top: messageElement.offsetTop - chatBoxRef.current.offsetHeight / 2,
        behavior: 'smooth'
      });
    }
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleFileUpload = (event, fileNumber) => {
    const uploadedFile = event.target.files[0];
    if (!uploadedFile) return;

    // Validate file type
    if (!uploadedFile.type.startsWith('audio/')) {
      console.error('Please upload an audio file');
      return;
    }

    if (fileNumber === 1) {
      setFile1(uploadedFile);
    } else if (fileNumber === 2) {
      setFile2(uploadedFile);
    }
  };

  const handleDrop = (event, fileNumber) => {
    event.preventDefault();
    const droppedFile = event.dataTransfer.files[0];
    if (!droppedFile) return;

    // Validate file type
    if (!droppedFile.type.startsWith('audio/')) {
      console.error('Please upload an audio file');
      return;
    }

    if (fileNumber === 1) {
      setFile1(droppedFile);
    } else if (fileNumber === 2) {
      setFile2(droppedFile);
    }
  };

  useEffect(() => {
    if (file1 && file2) {
      setShowPopup(true);
    }
  }, [file1, file2]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    console.log(`Input changed: ${name} = ${value}`); // Log input changes
    setFormData((prevData) => ({ ...prevData, [name]: value }));
  };

  const handleFormSubmit = async () => {
    console.log('Form submission started');
    try {
      setLoading(true);
      setIsPolling(true);
      setPollingProgress('Uploading files...');
      
      if (!file1 || !file2) {
        console.error('Both audio files are required');
        return;
      }

      // Pass both the progress callback and a new callback for when job IDs are received
      await saveAndSend(
        formData, 
        file1, 
        file2, 
        (status) => {
          console.log(`Progress update: ${status}`);
          setPollingProgress(status);
        },
        (newCall) => {
          // This callback is called when job IDs are received
          console.log('Job IDs received, updating UI');
          
          // Update saved calls
          setSavedCalls(prevCalls => [...prevCalls, formData]);
          
          // Clear form and close popup
          setShowPopup(false);
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
          
          // Refresh the available calls list
          refreshAvailableCalls();
          
          // If we're not on the dashboard, switch to it to show the new call
          if (activeMenu !== 'Dashboard') {
            setActiveMenu('Dashboard');
          }
          
          // Select the newly added call
          setSelectedCall(newCall);
        }
      );

    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      console.log('Form submission ended');
      setLoading(false);
      setIsPolling(false);
      setPollingProgress('');
    }
  };

  // Initial data fetch
  useEffect(() => {
    refreshAvailableCalls();
  }, []);

  useEffect(() => {
    const audioElement = new Audio('/path/to/audio/file.mp3');
    setAudio(audioElement);

    return () => {
      audioElement.pause();
      audioElement.src = '';
    };
  }, []);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);

  // Add new useEffect to handle media player time updates
  useEffect(() => {
    if (audioRef.current) {
      const handleTimeUpdate = () => {
        const currentTime = audioRef.current.currentTime;
        
        // Update current time state
        setCurrentTime(currentTime);
        
        // Auto-scroll the message box to the current message
        const currentMessage = chatData.find(msg => 
          msg.timestamp <= currentTime && 
          (!chatData[chatData.indexOf(msg) + 1] || chatData[chatData.indexOf(msg) + 1].timestamp > currentTime)
        );
        
        if (currentMessage && chatBoxRef.current) {
          const messageElement = document.querySelector(`#message-${chatData.indexOf(currentMessage)}`);
          if (messageElement) {
            chatBoxRef.current.scrollTo({
              top: messageElement.offsetTop - chatBoxRef.current.offsetHeight / 2,
              behavior: 'smooth'
            });
          }
        }

        // Update visible time range for the graph
        const newStart = Math.max(0, currentTime - TWO_MINUTES / 2);
        const newEnd = newStart + TWO_MINUTES;
        setVisibleTimeRange([newStart, newEnd]);
      };

      audioRef.current.addEventListener('timeupdate', handleTimeUpdate);
      
      return () => {
        if (audioRef.current) {
          audioRef.current.removeEventListener('timeupdate', handleTimeUpdate);
        }
      };
    }
  }, [audioRef.current, chatData]);

  useEffect(() => {
    console.log('Available calls updated:', availableCalls);
  }, [availableCalls]);

  return (
    <div className="bigboom-container">
      <div className="meta-container">
        <div className={`sidebar-container ${isLoadDecodeOpen ? 'menu-open' : ''}`}>
          <Sidebar 
            activeMenu={activeMenu} 
            setActiveMenu={setActiveMenu}
            onLoadDecodeClick={() => setIsLoadDecodeOpen(!isLoadDecodeOpen)}
            isLoadDecodeOpen={isLoadDecodeOpen}
          />
        </div>
        <LoadDecodeMenu 
          isOpen={isLoadDecodeOpen}
          onClose={() => setIsLoadDecodeOpen(false)}
          onCallSelect={(call) => {
            setSelectedCall(call);
            handleCallChange({ target: { value: call.id } });
          }}
          selectedCall={selectedCall}
          setActiveMenu={setActiveMenu}
        />
        <div className={`main-content ${isLoadDecodeOpen ? 'menu-open' : ''}`}>
          {activeMenu === 'Dashboard' && (
            <Dashboard
              selectedCall={selectedCall}
              handleCallChange={handleCallChange}
              availableCalls={availableCalls}
              repCertaintyScore={repCertaintyScore}
              callControlScore={callControlScore}
              customerMotivation={customerMotivation}
              fillerWordPercentage={fillerWordPercentage}
              repWPM={repWPM}
              scriptMatchPercentage={scriptMatchPercentage}
              customerJourneyData={customerJourneyData}
              visibleTimeRange={visibleTimeRange}
              handleScroll={handleScroll}
              chatBoxRef={chatBoxRef}
              loading={loading}
              chatData={chatData}
              handleTimestampClick={handleTimestampClick}
              setVisibleTimeRange={setVisibleTimeRange}
              buttonConfigs={buttonConfigs}
              refreshAvailableCalls={refreshAvailableCalls}
              isRefreshing={isRefreshing}
              audioRef={audioRef}
              setCurrentTime={setCurrentTime}
              onDropdownOpen={handleDropdownOpen}
            />
          )}
          {activeMenu === 'Decoded Calls' && (
            <div className="calllist-container">
              <div className="upload-grid">
                <div 
                  className={`upload-container ${file1 ? 'upload-success' : ''}`}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleDrop(e, 1)}
                >
                  {file1 ? (
                    <p className="upload-success-text">Upload Success: {file1.name}</p>
                  ) : (
                    <>
                      <Upload className="upload-icon" />
                      <p className="upload-text">Drag and drop your first audio file here, or</p>
                      <input
                        type="file"
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, 1)}
                        id="file-upload-1"
                        accept="audio/*"
                        required
                      />
                      <label
                        htmlFor="file-upload-1"
                        className="upload-label"
                      >
                        Select first file
                      </label>
                    </>
                  )}
                </div>

                <div 
                  className={`upload-container ${file2 ? 'upload-success' : ''}`}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleDrop(e, 2)}
                >
                  {file2 ? (
                    <p className="upload-success-text">Upload Success: {file2.name}</p>
                  ) : (
                    <>
                      <Upload className="upload-icon" />
                      <p className="upload-text">Drag and drop your second audio file here, or</p>
                      <input
                        type="file"
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, 2)}
                        id="file-upload-2"
                        accept="audio/*"
                        required
                      />
                      <label
                        htmlFor="file-upload-2"
                        className="upload-label"
                      >
                        Select second file
                      </label>
                    </>
                  )}
                </div>
              </div>

              {showPopup && (
                <>
                  <div className="popup-overlay" onClick={() => !loading && setShowPopup(false)} />
                  <div className="popup">
                    <h3>Enter Call Details</h3>
                    <input
                      type="text"
                      name="repName"
                      placeholder="Rep Name"
                      value={formData.repName}
                      onChange={handleInputChange}
                      className="popup-input"
                      disabled={loading}
                    />
                    <input
                      type="text"
                      name="customerName"
                      placeholder="Customer Name"
                      value={formData.customerName}
                      onChange={handleInputChange}
                      className="popup-input"
                      disabled={loading}
                    />
                    <input
                      type="number"
                      name="saleAmount"
                      placeholder="Sale Amount"
                      value={formData.saleAmount}
                      onChange={handleInputChange}
                      step="0.01"
                      min="0"
                      className="popup-input"
                      disabled={loading}
                    />
                    <select
                      name="saleStatus"
                      value={formData.saleStatus}
                      onChange={handleInputChange}
                      className="popup-input"
                      disabled={loading}
                    >
                      <option value="Sale">Sold</option>
                      <option value="No Sale">No Sale</option>
                    </select>
                    <select
                      name="brand"
                      value={formData.brand}
                      onChange={handleInputChange}
                      className="popup-input"
                      disabled={loading}
                    >
                      <option value="Vitality Now">Vitality Now</option>
                      <option value="Nooro">Nooro</option>
                    </select>
                    <select
                      name="product"
                      value={formData.product}
                      onChange={handleInputChange}
                      className="popup-input"
                      disabled={loading}
                    >
                      <option value="Youthful Brain">Youthful Brain</option>
                      <option value="Nail Exodus">Nail Exodus</option>
                    </select>
                    <button 
                      onClick={handleFormSubmit}
                      disabled={loading}
                      className="popup-button"
                    >
                      {loading ? (
                        <div className="button-content">
                          <RefreshCw className="animate-spin" size={18} />
                          <span className="ml-2">Processing...</span>
                        </div>
                      ) : (
                        'Decode'
                      )}
                    </button>
                    {/* Show progress status if any */}
                    {pollingProgress && (
                      <div className="progress-status">
                        {pollingProgress}
                      </div>
                    )}
                  </div>
                </>
              )}

              <CallList availableCalls={dummyCalls} />
            </div>
          )}
          {activeMenu === 'Settings' && (
            <div className="settings-content">
              Settings Content
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
