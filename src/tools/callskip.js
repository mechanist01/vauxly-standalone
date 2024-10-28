// callskip.js
import React from 'react';

const skipToMessage = (searchText, chatData, onSkip) => {
  const lowerCaseSearchText = searchText.toLowerCase();
  const foundMessageIndex = chatData.findIndex(message => 
    message.message.toLowerCase().includes(lowerCaseSearchText)
  );

  if (foundMessageIndex !== -1 && typeof onSkip === 'function') {
    const foundMessage = chatData[foundMessageIndex];
    onSkip(foundMessage.timestamp);
  }
};

const SkipButtons = ({ chatData, buttonConfigs, onSkip }) => {
  if (!chatData || !buttonConfigs || !onSkip) {
    return null; // Don't render if we're missing required props
  }

  return (
    <div className="skip-buttons-container">
      {buttonConfigs.map((config, index) => (
        <button
          key={index}
          className="skip-button"
          onClick={() => skipToMessage(config.searchText, chatData, onSkip)}
        >
          {config.buttonText}
        </button>
      ))}
    </div>
  );
};

export default SkipButtons;