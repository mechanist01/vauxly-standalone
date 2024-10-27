// Function to extract top sentiments and calculate their hit counts for the Rep's messages
export const calculateSentimentHitCounts = (conversationData) => {
  // Filter the data to include only the Rep's speech
  const repConversations = conversationData.filter(item => item.speaker === 'Rep');

  // Object to store sentiment hit counts
  const sentimentHitCounts = {};

  // Loop through each conversation and count the top sentiments
  repConversations.forEach(conversation => {
    if (conversation.top_sentiments && conversation.top_sentiments.length > 0) {
      conversation.top_sentiments.forEach(sentiment => {
        const sentimentName = sentiment.name;

        // If the sentiment already exists in the count object, increment it; otherwise, set it to 1
        if (sentimentHitCounts[sentimentName]) {
          sentimentHitCounts[sentimentName]++;
        } else {
          sentimentHitCounts[sentimentName] = 1;
        }
      });
    }
  });

  return sentimentHitCounts;
};
