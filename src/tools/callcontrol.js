// Function to calculate call control based on the number of question marks in the conversation
export const calculateCallControl = (conversationData) => {
    // Initialize counters for question marks in Rep's and Customer's messages
    let repQuestionCount = 0;
    let customerQuestionCount = 0;

    // Process each conversation entry
    conversationData.forEach(conversation => {
        const message = conversation.message;

        // Count the number of question marks in the message
        const questionCount = (message.match(/\?/g) || []).length;

        // Increment the appropriate counter based on the speaker
        if (conversation.speaker === 'Rep') {
            repQuestionCount += questionCount;
        } else if (conversation.speaker === 'Customer') {
            customerQuestionCount += questionCount;
        }
    });

    // Calculate the total number of questions
    const totalQuestions = repQuestionCount + customerQuestionCount;

    // If no questions were asked by either party, return 50% (neutral control)
    if (totalQuestions === 0) return 50;

    // Calculate the percentage of questions asked by the Rep
    const repQuestionPercentage = (repQuestionCount / totalQuestions) * 100;

    return repQuestionPercentage.toFixed(2);  // Return the Rep's question percentage as a score
};
