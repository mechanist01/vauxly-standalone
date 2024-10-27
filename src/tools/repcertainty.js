import { countFillerWords } from './FillerWords'; // Import filler word counting function

// Function to measure rep certainty based on filler words, sentiment data, and silent moments
export const calculateRepCertainty = (conversationData) => {
  const allData = [...conversationData].sort((a, b) => a.timestamp - b.timestamp); // Sort all conversation by timestamp

  let totalSentiments = 0;
  let positiveSentiments = 0;
  let sentimentScoreSum = 0;
  let fillerWordCount = 0;
  let totalWords = 0;

  let silentMomentsCount = 0;
  let totalSilentDuration = 0;
  let previousTimestampEnd = null;

  // Get the first message timestamp and the last message timestamp_end for the entire call
  const firstMessageTimestamp = allData[0]?.timestamp || 0;
  const lastMessageTimestampEnd = allData[allData.length - 1]?.timestamp_end || allData[allData.length - 1]?.timestamp;

  allData.forEach(entry => {
    const timestamp = entry.timestamp;
    const timestampEnd = entry.timestamp_end || timestamp; // Use timestamp_end if it exists, fallback to timestamp

    // Calculate silent moments between this message's timestamp and the previous message's timestamp_end
    if (previousTimestampEnd !== null) {
      const timeGap = timestamp - previousTimestampEnd;

      // Define silence as any gap longer than 1 second (adjust as needed)
      if (timeGap > 1) {
        silentMomentsCount++;
        totalSilentDuration += timeGap; // Add to total silent duration
      }
    }

    previousTimestampEnd = timestampEnd; // Update the previous timestamp_end for the next iteration

    // Process only Rep's messages for filler words and sentiment analysis
    if (entry.speaker === 'Rep') {
      const words = entry.message.split(' ');
      totalWords += words.length;

      // Count filler words
      fillerWordCount += countFillerWords(entry.message);

      // Analyze top sentiments for polarity and intensity
      entry.top_sentiments.forEach(sentiment => {
        totalSentiments++;
        sentimentScoreSum += sentiment.score;

        if (sentiment.polarity === '+') {
          positiveSentiments++;
        }
      });
    }
  });

  // Calculate filler word ratio
  const fillerWordRatio = totalWords > 0 ? (fillerWordCount / totalWords) : 0;

  // Calculate positive sentiment ratio
  const positiveSentimentRatio = totalSentiments > 0 ? (positiveSentiments / totalSentiments) : 0;

  // Calculate average sentiment score
  const averageSentimentScore = totalSentiments > 0 ? (sentimentScoreSum / totalSentiments) : 0;

  // Calculate the average silent moment duration
  const averageSilentDuration = silentMomentsCount > 0 ? (totalSilentDuration / silentMomentsCount) : 0;

  // Normalize and weigh silent moments the heaviest
  const silentScore = Math.min((silentMomentsCount + averageSilentDuration * 2) / 10, 1); // Normalize to a max of 1
  const sentimentScore = Math.min((positiveSentimentRatio ** 2), 1); // Normalize to a max of 1
  const fillerWordScore = Math.min((1 - (fillerWordRatio ** 2)), 1); // Normalize to a max of 1
  const averageSentimentWeighted = Math.min(averageSentimentScore, 1); // Normalize to a max of 1

  // Calculate the normalized certainty score and cap it at 100
  const certaintyScore = Math.min(
    (silentScore * 0.6 + sentimentScore * 0.25 + fillerWordScore * 0.1 + averageSentimentWeighted * 0.05) * 100,
    100
  );

  return certaintyScore.toFixed(2);  // Return only the certainty score (normalized to a max of 100%)
};
