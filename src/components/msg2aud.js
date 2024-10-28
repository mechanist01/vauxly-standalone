// msg2aud.js - Message to Audio timestamp controller
import React from 'react';

/**
 * Handles clicking a message timestamp to control audio playback
 * @param {number} timestamp - The timestamp in seconds to seek to
 * @param {Object} waveformRef - React ref to the waveform player component
 * @param {Object} chatBoxRef - React ref to the chat messages container
 * @param {Array} chatData - Array of chat messages
 * @param {Function} setVisibleTimeRange - Function to update the visible time range
 * @returns {void}
 */
export const handleMessageTimestampClick = (
  timestamp,
  waveformRef,
  chatBoxRef,
  chatData,
  setVisibleTimeRange
) => {
  const TWO_MINUTES = 120; // 2 minutes in seconds

  // Check if waveform exists and is ready
  if (waveformRef.current && waveformRef.current.isReady) {
    waveformRef.current.seekTo(timestamp);
  }

  // Update visible time range for graph
  const newStart = Math.max(0, timestamp - TWO_MINUTES / 2);
  const newEnd = newStart + TWO_MINUTES;
  setVisibleTimeRange([newStart, newEnd]);

  // Find and scroll to the corresponding message
  if (chatBoxRef.current && chatData.length) {
    const messageIndex = chatData.findIndex(msg => {
      const nextMsg = chatData[chatData.indexOf(msg) + 1];
      return msg.timestamp <= timestamp && (!nextMsg || nextMsg.timestamp > timestamp);
    });

    if (messageIndex !== -1) {
      const messageElement = document.querySelector(`#message-${messageIndex}`);
      if (messageElement) {
        const containerHeight = chatBoxRef.current.clientHeight;
        const messageTop = messageElement.offsetTop;
        const messageHeight = messageElement.offsetHeight;
        const scrollPosition = messageTop - (containerHeight / 2) + (messageHeight / 2);

        chatBoxRef.current.scrollTo({
          top: scrollPosition,
          behavior: 'smooth'
        });

        // Update visual indicators
        document.querySelectorAll('.message-wrapper').forEach(msg => {
          msg.classList.remove('message-current');
        });
        messageElement.classList.add('message-current');
      }
    }
  }
};

/**
 * Creates a clickable timestamp element
 * @param {number} timestamp - The timestamp in seconds
 * @param {Object} config - Configuration object containing refs and handlers
 * @returns {JSX.Element} Clickable timestamp span element
 */
export const ClickableTimestamp = ({ 
  timestamp, 
  waveformRef, 
  chatBoxRef, 
  chatData, 
  setVisibleTimeRange 
}) => {
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <span
      className={`message-time clickable ${(!waveformRef.current || !waveformRef.current.isReady) ? 'loading' : ''}`}
      onClick={() => handleMessageTimestampClick(
        timestamp,
        waveformRef,
        chatBoxRef,
        chatData,
        setVisibleTimeRange
      )}
      style={{ 
        cursor: (!waveformRef.current || !waveformRef.current.isReady) ? 'wait' : 'pointer'
      }}
    >
      {formatTime(timestamp)}
    </span>
  );
};