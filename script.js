/* DOM elements */
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");
const sendBtn = document.getElementById("sendBtn");

/* API settings */
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

/* System prompt for the chatbot */
const SYSTEM_PROMPT =
  "You are the L'Oréal Product Advisor chatbot. Only answer questions about L'Oréal products, beauty routines, skincare, haircare, makeup, fragrance, ingredient guidance, and personalized L'Oréal recommendations. If a question is unrelated to L'Oréal or beauty topics, politely refuse in 1-2 sentences and redirect the user to ask about L'Oréal products or routines. Keep answers practical, beginner-friendly, and concise. Do not provide medical diagnoses; for serious skin or health concerns, recommend consulting a licensed professional.";

// Start with a welcome message
chatWindow.innerHTML = "";

// Keep the chat history so the assistant remembers the conversation
const messages = [
  {
    role: "system",
    content: SYSTEM_PROMPT,
  },
];

/* Track simple conversation context */
const conversationContext = {
  userName: "",
  pastQuestions: [],
};

function extractUserName(text) {
  const namePatterns = [
    /my name is\s+([A-Za-z][A-Za-z' -]*)/i,
    /i am\s+([A-Za-z][A-Za-z' -]*)/i,
    /i'm\s+([A-Za-z][A-Za-z' -]*)/i,
  ];

  for (const pattern of namePatterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }

  return "";
}

function updateConversationContext(userText) {
  const name = extractUserName(userText);
  if (name) {
    conversationContext.userName = name;
  }

  conversationContext.pastQuestions.push(userText);
  if (conversationContext.pastQuestions.length > 10) {
    conversationContext.pastQuestions.shift();
  }
}

function buildContextMessage() {
  const contextParts = [];

  if (conversationContext.userName) {
    contextParts.push(`User name: ${conversationContext.userName}`);
  }

  if (conversationContext.pastQuestions.length > 0) {
    contextParts.push(
      `Past questions: ${conversationContext.pastQuestions.join(" | ")}`,
    );
  }

  if (contextParts.length === 0) {
    return null;
  }

  return {
    role: "system",
    content: `Conversation context: ${contextParts.join(". ")}. Use this information to answer naturally and continue the conversation.`,
  };
}

// Helper to render a message in the chat window
function addMessage(role, text) {
  const messageRow = document.createElement("div");
  messageRow.className = `message-row ${role}`;

  const messageBubble = document.createElement("p");
  messageBubble.className = `msg-bubble ${role}`;
  messageBubble.textContent = text;

  messageRow.appendChild(messageBubble);
  chatWindow.appendChild(messageRow);
  chatWindow.scrollTop = chatWindow.scrollHeight;

  return messageBubble;
}

function showLatestQuestion(questionText) {
  const existingQuestion = chatWindow.querySelector(".latest-question");
  if (existingQuestion) {
    existingQuestion.remove();
  }

  const questionElement = document.createElement("div");
  questionElement.className = "latest-question";
  questionElement.textContent = questionText;
  chatWindow.appendChild(questionElement);

  return questionElement;
}

addMessage("ai", "Hello! I can help with L'Oréal products and routines.");

/* Handle form submit */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const prompt = userInput.value.trim();
  if (!prompt) {
    return;
  }

  addMessage("user", prompt);
  userInput.value = "";
  userInput.disabled = true;
  sendBtn.disabled = true;

  showLatestQuestion(prompt);

  // Add the user's message to the conversation history
  messages.push({
    role: "user",
    content: prompt,
  });

  updateConversationContext(prompt);

  const typingMessage = addMessage("ai", "Thinking...");

  try {
    if (typeof OPENAI_API_KEY === "undefined" || !OPENAI_API_KEY) {
      typingMessage.remove();
      addMessage("ai", "Missing API key. Add OPENAI_API_KEY in secrets.js.");
      return;
    }

    const requestMessages = [messages[0]];
    const contextMessage = buildContextMessage();

    if (contextMessage) {
      requestMessages.push(contextMessage);
    }

    requestMessages.push(...messages.slice(1));

    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: requestMessages,
      }),
    });

    const data = await response.json();

    // Read assistant output using data.choices[0].message.content
    const assistantReply = data?.choices?.[0]?.message?.content;

    typingMessage.remove();

    if (!assistantReply) {
      addMessage("ai", "I received an empty response. Please ask again.");
      return;
    }

    addMessage("ai", assistantReply);

    // Add assistant reply to history for future context
    messages.push({
      role: "assistant",
      content: assistantReply,
    });
  } catch (error) {
    typingMessage.remove();
    addMessage(
      "ai",
      "Network error. Please check your connection and try again.",
    );
  } finally {
    userInput.disabled = false;
    sendBtn.disabled = false;
    userInput.focus();
  }
});
