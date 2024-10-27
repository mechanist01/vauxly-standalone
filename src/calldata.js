// calldata.js

// Define emotion polarity mappings
const positiveEmotions = [
    "Admiration", "Adoration", "Aesthetic Appreciation", "Amusement", "Awe", "Calmness", "Concentration",
    "Contemplation", "Contentment", "Craving", "Desire", "Determination", "Ecstasy", "Entrancement",
    "Excitement", "Interest", "Joy", "Love", "Nostalgia", "Pride", "Realization", "Relief", "Romance",
    "Satisfaction", "Surprise (positive)", "Sympathy", "Triumph"
];

const negativeEmotions = [
    "Anger", "Anxiety", "Awkwardness", "Boredom", "Confusion", "Contempt", "Disappointment",
    "Disgust", "Distress", "Doubt", "Embarrassment", "Empathic Pain", "Envy", "Fear", "Guilt",
    "Horror", "Pain", "Sadness", "Shame", "Surprise (negative)", "Tiredness"
];

const getEmotionPolarity = (emotionName) => {
    if (positiveEmotions.includes(emotionName)) {
        return "+";
    } else if (negativeEmotions.includes(emotionName)) {
        return "-";
    }
    return "neutral";
};

const getTopSentiments = (emotions) => {
    return emotions
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map(sentiment => ({
            name: sentiment.name,
            score: sentiment.score,
            polarity: getEmotionPolarity(sentiment.name)
        }));
};

const processPredictions = (predictions, speaker) => {
    console.log(`Processing predictions for ${speaker}:`, predictions);
    const processedConversation = [];

    if (!Array.isArray(predictions)) {
        console.error('Predictions is not an array:', predictions);
        return processedConversation;
    }

    predictions.forEach((result, index) => {
        console.log(`Processing result ${index}:`, result);

        // Handle nested predictions structure
        if (result.predictions) {
            result.predictions.forEach(pred => {
                if (pred.models?.prosody?.grouped_predictions) {
                    pred.models.prosody.grouped_predictions.forEach(group => {
                        group.predictions.forEach(prediction => {
                            if (prediction.text) {
                                const statement = prediction.text;
                                const emotions = prediction.emotions || [];
                                const timestamp = prediction.time?.begin || 0;
                                const timestampEnd = prediction.time?.end || 0;

                                processedConversation.push({
                                    speaker,
                                    timestamp,
                                    timestamp_end: timestampEnd,
                                    message: statement,
                                    top_sentiments: emotions.length ? getTopSentiments(emotions) : []
                                });
                            }
                        });
                    });
                }
            });
        }
        // Handle direct grouped_predictions structure
        else if (result.models?.prosody?.grouped_predictions) {
            result.models.prosody.grouped_predictions.forEach(group => {
                group.predictions.forEach(prediction => {
                    if (prediction.text) {
                        const statement = prediction.text;
                        const emotions = prediction.emotions || [];
                        const timestamp = prediction.time?.begin || 0;
                        const timestampEnd = prediction.time?.end || 0;

                        processedConversation.push({
                            speaker,
                            timestamp,
                            timestamp_end: timestampEnd,
                            message: statement,
                            top_sentiments: emotions.length ? getTopSentiments(emotions) : []
                        });
                    }
                });
            });
        }
    });

    console.log(`Processed conversation for ${speaker}:`, processedConversation);
    return processedConversation;
};

// Global state to store both responses
let responseStore = {
    response1: null,
    response2: null
};

export const parsePredictions = (predictions) => {
    console.log('Starting prediction parsing with data:', predictions);

    try {
        // Store the incoming predictions based on job completion order
        if (!responseStore.response1) {
            responseStore.response1 = predictions;
            console.log('Stored first response:', predictions);
            return null; // Don't process until we have both responses
        } else if (!responseStore.response2) {
            responseStore.response2 = predictions;
            console.log('Stored second response:', predictions);
        }

        // Only process if we have both responses
        if (responseStore.response1 && responseStore.response2) {
            let conversation = [];

            // Process customer dialogue (response1)
            console.log('Processing customer predictions:', responseStore.response1);
            const customerConversation = processPredictions(responseStore.response1, 'Customer');
            conversation = conversation.concat(customerConversation);

            // Process representative dialogue (response2)
            console.log('Processing rep predictions:', responseStore.response2);
            const repConversation = processPredictions(responseStore.response2, 'Rep');
            conversation = conversation.concat(repConversation);

            // Debug log before sorting
            console.log('Combined conversations before sorting:', conversation);

            // Sort by timestamp and ensure valid timestamps
            conversation.sort((a, b) => {
                const timeA = typeof a.timestamp === 'number' ? a.timestamp : 0;
                const timeB = typeof b.timestamp === 'number' ? b.timestamp : 0;
                return timeA - timeB;
            });

            // Create the final conversation data structure
            const conversationData = {
                conversation: conversation
            };

            // Clear the response store for the next call
            responseStore = {
                response1: null,
                response2: null
            };

            console.log('Final processed conversation data:', JSON.stringify(conversationData, null, 2));
            return conversationData;
        }

        return null;

    } catch (error) {
        console.error('Error parsing predictions:', error);
        responseStore = {
            response1: null,
            response2: null
        };
        throw error;
    }
};

export const processCallbackData = (data) => {
    console.log('Processing callback data:', data);
    
    try {
        if (data.response1 && data.response2) {
            // Extract predictions from the nested structure
            const customerPredictions = data.response1.callback_response?.predictions || [];
            const repPredictions = data.response2.callback_response?.predictions || [];

            console.log('Customer predictions:', customerPredictions);
            console.log('Rep predictions:', repPredictions);

            let conversation = [];
            
            // Process both sets of predictions
            conversation = conversation.concat(processPredictions(customerPredictions, 'Customer'));
            conversation = conversation.concat(processPredictions(repPredictions, 'Rep'));

            // Debug log before sorting
            console.log('Combined conversations before sorting:', conversation);

            // Sort by timestamp
            conversation.sort((a, b) => {
                const timeA = typeof a.timestamp === 'number' ? a.timestamp : 0;
                const timeB = typeof b.timestamp === 'number' ? b.timestamp : 0;
                return timeA - timeB;
            });

            // Create the final conversation data structure
            const conversationData = {
                conversation: conversation
            };

            console.log('Final processed conversation data:', JSON.stringify(conversationData, null, 2));
            return conversationData;
        }
        return null;
    } catch (error) {
        console.error('Error processing callback data:', error);
        throw error;
    }
};