/* DOM elements */
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");
const sendBtn = document.getElementById("sendBtn");

/* Cloudflare Worker endpoint */
const WORKER_URL = "https://your-worker-name.your-subdomain.workers.dev";

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

// Helper to render a message in the chat window
function addMessage(role, text) {
  const messageElement = document.createElement("p");
  messageElement.className = `msg ${role}`;

  const label = role === "user" ? "You" : "L'Oreal Advisor";
  messageElement.textContent = `${label}: ${text}`;

  chatWindow.appendChild(messageElement);
  chatWindow.scrollTop = chatWindow.scrollHeight;

  return messageElement;
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

  // Add the user's message to the conversation history
  messages.push({
    role: "user",
    content: prompt,
  });

  const typingMessage = addMessage("ai", "Thinking...");

  try {
    if (!WORKER_URL.includes("workers.dev")) {
      typingMessage.remove();
      addMessage("ai", "Add your deployed Cloudflare Worker URL in script.js.");
      return;
    }

    const response = await fetch(WORKER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: messages,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      typingMessage.remove();

      const apiError = data?.error?.message;
      if (apiError) {
        addMessage("ai", `API error: ${apiError}`);
      } else {
        addMessage(
          "ai",
          "I couldn't get a response right now. Please try again.",
        );
      }

      return;
    }

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
