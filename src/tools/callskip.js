import React from 'react';

// Function to handle skipping to a specific part of the conversation
const skipToMessage = (searchText, chatData, setVisibleTimeRange, chatBoxRef) => {
  const lowerCaseSearchText = searchText.toLowerCase();
  const foundMessageIndex = chatData.findIndex(message => 
    message.message.toLowerCase().includes(lowerCaseSearchText)
  );

  if (foundMessageIndex !== -1) {
    const foundMessage = chatData[foundMessageIndex];

    // Set the time range to the found message's timestamp
    setVisibleTimeRange([foundMessage.timestamp, foundMessage.timestamp + 120]);

    // Scroll the chat box to the corresponding message
    const messageElement = document.getElementById(`message-${foundMessageIndex}`);
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
};

// Skip buttons component
const SkipButtons = ({ chatData, setVisibleTimeRange, buttonConfigs, chatBoxRef }) => {
  return (
    <div className="skip-buttons-container">
      {buttonConfigs.map((config, index) => (
        <button
          key={index}
          className="skip-button"
          onClick={() => skipToMessage(config.searchText, chatData, setVisibleTimeRange, chatBoxRef)}
        >
          {config.buttonText}
        </button>
      ))}
    </div>
  );
};

export default SkipButtons;
