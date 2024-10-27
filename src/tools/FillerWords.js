// List of hardcoded filler words
const fillerWords = ['like', 'uh', 'um', 'you know', 'kinda', 'kind of', 'sorta', 'sort of'];

// Function to count filler words in a message
export const countFillerWords = (message) => {
    // Check if message is valid and is a string
    if (!message || typeof message !== 'string') {
        return 0;
    }

    let count = 0;
    fillerWords.forEach(filler => {
        const regex = new RegExp(`\\b${filler}\\b`, 'gi');
        const matches = message.match(regex);
        if (matches) {
            count += matches.length;
        }
    });
    return count;
};

// Function to calculate filler word percentage for all rep messages
export const calculateFillerWordPercentage = (conversationData) => {
    // Check if conversationData is valid and is an array
    if (!Array.isArray(conversationData)) {
        console.error('Invalid conversation data provided');
        return 0;
    }

    const repConversations = conversationData.filter(item => item.speaker === 'Rep');
    let totalWords = 0;
    let fillerWordCount = 0;

    repConversations.forEach(conversation => {
        // Ensure message property exists and is a string
        if (conversation && conversation.message && typeof conversation.message === 'string') {
            const words = conversation.message.split(' ');
            totalWords += words.length;
            fillerWordCount += countFillerWords(conversation.message);
        }
    });

    if (totalWords === 0) return 0; // Avoid division by zero
    return (fillerWordCount / totalWords) * 100;
};