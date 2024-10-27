import React from 'react';

const TestEnv = () => {
  return (
    <div>
      <p>Hume API Key: {process.env.REACT_APP_HUME_API_KEY}</p>
    </div>
  );
};

export default TestEnv;