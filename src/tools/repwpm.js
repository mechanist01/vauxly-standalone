// Function to calculate Words Per Minute (WPM) for the Rep
export const calculateRepWPM = (conversationData) => {
    // Filter the data to include only the Rep's speech
    const repConversations = conversationData.filter(item => item.speaker === 'Rep');
  
    // Return 0 if no rep conversations exist
    if (repConversations.length === 0) return 0;
  
    // Calculate total words spoken by the Rep
    const totalWords = repConversations.reduce((acc, conversation) => {
      const wordCount = conversation.message.split(' ').length;
      return acc + wordCount;
    }, 0);
  
    // Calculate the total duration by summing the duration of each message
    const totalDurationInSeconds = repConversations.reduce((acc, conversation) => {
      const startTimestamp = conversation.timestamp;
      const endTimestamp = conversation.timestamp_end;

      if (startTimestamp !== null && endTimestamp !== null) {
        return acc + (endTimestamp - startTimestamp);  // Add duration of the message
      }
      return acc;
    }, 0);
  
    // Convert duration to minutes
    const totalDurationInMinutes = totalDurationInSeconds / 60;
  
    // Calculate the average words per minute (WPM)
    if (totalDurationInMinutes > 0) {
      return totalWords / totalDurationInMinutes;
    }
    return 0; // Avoid division by zero if total duration is 0
};
