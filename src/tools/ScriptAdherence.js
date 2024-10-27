// Import a similarity library (for this example, we'll define our own simple similarity function)
const levenshteinDistance = (a, b) => {
  const matrix = [];

  // Increment along the first column of each row
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  // Increment each column in the first row
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  // Fill in the rest of the matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // Substitution
          Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1) // Insertion, deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
};

// Function to calculate similarity score (based on Levenshtein distance)
const similarity = (word1, word2) => {
  const distance = levenshteinDistance(word1, word2);
  const maxLen = Math.max(word1.length, word2.length);
  return (maxLen - distance) / maxLen;
};

// Hardcoded script to match against
const hardcodedScript = `Hi {customer name}, this is ____ from Vitality Now with Dr. Sam calling you on a recorded line, how are you today?
That's wonderful to hear _____. I am Dr Sam’s Protocol Review Specialist and he said that we are shipping you the {product # }, is that correct?
Excellent, you are going to love it! It looks like we are shipping it to {customers address}, is that correct?
Perfect! It is on the way! Dr. Sam wanted me to walk you through the protocol on exactly how to use the {product # } to see the best results, OK?
What have you been experiencing that prompted you to buy Youthful Brain? Brain fog, lack of focus, mental energy. What’s been going on [customer’s name]?
Okay, so we’re dealing with {pain point # }. How long has this been going on?
How is your short term memory? For instance, remembering what you need while at the grocery store or recalling what someone just said during a conversation?
And what about your long term memory? Things like remembering significant dates or specific facts like historical events or capital cities?
Okay, thanks for letting me know. Do you have any injuries, allergies or medical conditions that I need to be aware of?
Okay. If you have questions specific to any condition please make sure that you speak directly to your doctor, OK?
Is there anything else that you want to optimize about your health?
Okay. Thanks for sharing that with me {customer name}, you are definitely on the right path. I just want to take a moment to talk you through the Brain Health Protocol so that you see some relief from {Pain Point # }, OK?
The First Part of the Brain Health Protocol is Nutrition. Do you eat healthy or what is available?
The Second Part of the Brain Health Protocol is Hydration. On average how many glasses of water do you drink daily?
Great / No Worries.. I want you to be sure to drink at least 8-10 glasses of water daily, or more if engaging in strenuous activity. Adequate hydration ensures that the brain’s neural cells are well-supplied with nutrients and oxygen, for cognitive functions like attention and memory retention. Can you drink 8-10 glasses of water per day?
The Third Part of the Brain Health Protocol is Movement. Are you active throughout the day or more sedentary?

Great / No Worries We want you to Engage in 30-45 minutes of moderate aerobic exercise at least 5 days a week. Exercises like brisk walking, cycling, swimming, or even High-intensity interval training (HIIT) and resistance training. Can you commit to incorporating 30 minutes of exercise at least 5 days per week?
The Fourth Part of the Brain Health Protocol is sleep. On average, how many hours of sleep do you get per night?

Great / No Worries. I want you to Prioritize getting 7-9 hours of quality sleep each night. Sleep allows for the removal of waste products from the brain through the glymphatic system, which helps prevent neurotoxic buildup. During sleep, the brain undergoes memory consolidation, a process critical for converting short-term memories into long-term storage. This will help improve cognitive function and learning capacity. Can you ensure that you are getting at least 7-9 hours of sleep each night?
The Fifth Part of the Brain Health Protocol is to Aim for at least 15-30 minutes of sunlight exposure daily, particularly in the morning, to help regulate your body’s circadian rhythm. Are you getting that much sunlight per day?

Great / No Worries. Exposure to natural light influences the production of serotonin, a neurotransmitter that affects mood, memory, and cognitive function, and supports the regulation of the sleep-wake cycle. Sunlight triggers the synthesis of vitamin D in the skin, which is crucial for brain health, as low levels of vitamin D have been associated with cognitive impairment and mood disorders. Can you commit to getting at least 15-30 minutes of sunlight each day?
That’s fantastic! And of course, the most important part of your protocol is to stay consistent with the supplement you ordered. The Youthful Brain is designed to help eliminate brain fog, enhance memory, and boost mental performance. It contains Huperzine-A and other ingredients from natural sources, which will help curb the degradation of acetylcholine and support the replacement of old and broken cell membranes with new tissue. So, once per day, no later than 4 pm, take 2 tablets with 8 ounces of water. Can you do that for me?
Awesome [customer’s name]. Based on what you told me, since you are experiencing [pain point], there are a couple supplements I’m going to send you that Dr. Sam formulated to help with that, OK?

Awesome [customer’s name]. Based on what you told me, since you are experiencing [pain point], there are a couple supplements I’m going to send you that Dr. Sam formulated to help with that, OK?
Yes, if you wanted me to send you extra supplements that would be a separate charge… but the good news is I get to send them out to you in a bundle so you get the best price per bottle. Based on what you told me, these supplements would help you tremendously.
I would like to tell you what this is and why it is so important. And then if it makes sense, I can send it to you, OK?
That’s a great question, and it’s completely up to you. The good news is I get to send these supplements out to you in a bundle, which gives you the best price per bottle. Based on what you told me, these supplements would help you tremendously.
I would like to tell you what this is and why it is so important. And then if it makes sense, I can send it to you, OK?
You are going to see great results with what you already ordered. Based on what you told me, these supplements would help you tremendously.
I would like to tell you what this is and why it is so important. And then if it makes sense, I can send it to you, OK?
The first supplement is Stem Cell Renew. Are you familiar with why that is important?
The Stem Cell Renew is designed to help boost longevity, enhance your overall health, and help you look and feel younger. It contains CoQ10 and BioVin from natural sources that work together to protect your brain from damage caused by stress, which helps to clear brain fog and improve memory. CoQ10 gives your brain more energy, and BioVin helps with better blood flow, which are both important for keeping your brain healthy. Together, they boost brain power, making it easier to think clearly and remember things. Just take two capsules in the morning. Can you do that?
The final supplement in Dr Sam’s Brain Health Bundle is the Youthful Sleep. The Youthful Sleep is designed to help improve sleep quality and next-day function. It contains Ashwagandha from natural sources, to lower stress cortisol, improve focus, and reduce fatigue. This will help convert short term memory into long term storage while improving mood, concentration, and reaction time. So, 1 hour before bed, take 2 capsules with 8 ounces of water. Can you do that for me?
Great! Now that you are a member, I can send these to you in a VIP bundle. That way you get the best price per bottle, OK?
That’s a smart move [customer’s name]. The 12 Month Supply of the [product names] is just the one-time additional charge of $_____, and this way you have everything that you need, OK?
Okay, Let’s not do the 12 month. I’ll just send you out the first 6 months, that way you have plenty of time to start seeing results. This way you have 6 bottles of {product # } and 6 bottles of {product # } and 6 bottles of {product # }. That’s just the one-time charge of $_____ and you will have everything you need for 6 months, OK?
Okay, let’s not do the 6 months. I’ll just send you out the first 90 days, that way you have plenty of time to start seeing results. Once you’re feeling better, you can text me and I can send you more when you’re running low. This way you have 3 bottles of {product} and 3 bottles of {product # } and 3 bottles of {product # }. That’s just the one-time charge of $_____ and you will have everything you need for 3 months, OK?
Not a problem at all. It sounds like you want to make sure this is a good fit, right?
Ok well let’s not do that then…We will hold off on any large bundle. For now, we will get you started with just the first month of your {Pain Point} Bundle. This way it’s just 1 bottle of your {product # } and 1 bottle of your {product # } and 1 bottle of your {product # } and it’s just a one-time charge of $_____ and you will have everything you need for 30 days, OK?
Great! Do you want to use the same card you used online?
Perfect {customer name}, I just need to verify the 3 Digit CVC on the back of the card ending in 1234.
Great (customer name). For verbal authorization, this will be the one-time separate Charge of $____ on the same card you used online. Do I have your authorization for that?
Congratulations {customer name}, that order went through! You will receive an email with the details of your order soon and you should receive your {Pain Point} Bundle within 5-7 business days. I know we covered quite a bit, so if you have any questions or need any support please reach out to us at vitalitynow.com. Do you have any further questions for me?
A few parting reminders before we go…
Be sure to incorporate Omega 3 from foods like salmon, sardines, flax seeds and chia seeds, antioxidants from berries and leafy greens, and vitamin B12 from animal protein.
Drink at least 8-10 glasses of water per day
Do 30-45 minutes of moderate exercise at least 5 days per week. This can be as simple as walking.
Aim to get 7-9 hours of quality sleep each night.
Try to get 15-30 minutes of sunlight per day, especially morning light.
For your supplements, follow the serving size directions on the back of the bottle.
Of course, if you have any questions, you can reach out to us at vitalitynowshop.com or call me on my direct line at [insert number], OK?
Wonderful! You are all set, HAVE A GREAT DAY!
Okay, no worries [customer’s name]. We can hold off on incorporating any more supplements. For now, let’s stay focused on your [initial product].
I also want to remind you of some of the key things we’ve discussed together:
Be sure to incorporate Omega 3 from foods like salmon, sardines, flax seeds and chia seeds, antioxidants from berries and leafy greens, and vitamin B12 from animal protein.
Drink at least 8-10 glasses of water per day
Do 30-45 minutes of moderate exercise at least 5 days per week. This can be as simple as walking.
Aim to get 7-9 hours of quality sleep each night.
Try to get 15-30 minutes of sunlight per day, especially morning light.
For your supplements, follow the serving size directions on the back of the bottle.
Of course, if you have any questions, you can reach out to us at vitalitynowshop.com, OK?
Wonderful! You are all set, HAVE A GREAT DAY!
`;

// Function to calculate the percentage match based on similarity
export const calculateMatchPercentage = (conversationData, threshold = 0.7) => {
  // Filter the data to include only the Rep's speech
  const repConversations = conversationData.filter(item => item.speaker === 'Rep');

  // Concatenate all the rep's messages into one string for comparison
  const repScript = repConversations.map(conversation => conversation.message).join(' ');

  const wordsInRepScript = repScript.split(/\s+/).filter(word => word.length > 0); // Split by spaces
  const wordsInHardcodedScript = hardcodedScript.split(/\s+/).filter(word => word.length > 0);

  let matchCount = 0;
  let totalWords = wordsInRepScript.length;

  wordsInRepScript.forEach(repWord => {
    let foundMatch = false;
    for (let scriptWord of wordsInHardcodedScript) {
      const similarityScore = similarity(repWord.toLowerCase(), scriptWord.toLowerCase());
      if (similarityScore >= threshold) {
        matchCount++;
        foundMatch = true;
        break; // Move to the next word once a match is found
      }
    }
  });

  const matchPercentage = (matchCount / totalWords) * 100;
  return matchPercentage;
};
