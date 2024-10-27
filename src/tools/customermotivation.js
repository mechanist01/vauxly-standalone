import { countFillerWords } from './FillerWords'; // Adjust the path as necessary

// Export the function from the file
export const calculateCustomerMotivation = (conversationData) => {
    const customerData = conversationData.filter(item => item.speaker === 'Customer');
  
    let totalSentiments = 0;
    let positiveSentiments = 0;
    let sentimentScoreSum = 0;
    let fillerWordCount = 0;
    let totalWords = 0;
  
    customerData.forEach(entry => {
      const message = entry.message;
      const words = message.split(' ');
      totalWords += words.length;
  
      // Count filler words
      fillerWordCount += countFillerWords(message);
  
      // Analyze top sentiments for polarity and intensity
      entry.top_sentiments.forEach(sentiment => {
        totalSentiments++;
        sentimentScoreSum += sentiment.score;
  
        if (sentiment.polarity === '+') {
          positiveSentiments++;
        }
      });
    });
  
    // Calculate filler word ratio
    const fillerWordRatio = totalWords > 0 ? (fillerWordCount / totalWords) : 0;
  
    // Calculate positive sentiment ratio
    const positiveSentimentRatio = totalSentiments > 0 ? (positiveSentiments / totalSentiments) : 0;
  
    // Calculate average sentiment score
    const averageSentimentScore = totalSentiments > 0 ? (sentimentScoreSum / totalSentiments) : 0;
  
    // Calculate motivation score based on positive sentiment ratio and filler word ratio
    const motivationScore = (positiveSentimentRatio * averageSentimentScore * (1 - fillerWordRatio)) * 100;
  
    return {
      motivationScore: motivationScore.toFixed(2),  // Scaled from 0 to 100
      fillerWordRatio: fillerWordRatio.toFixed(2),
      positiveSentimentRatio: positiveSentimentRatio.toFixed(2),
      averageSentimentScore: averageSentimentScore.toFixed(2),
    };
};
