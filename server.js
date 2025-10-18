
const express = require('express');
const cors = require('cors');
const path = require('path');
const Groq = require('groq-sdk');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Service Initialization
let groq;
let supabase;

try {
  if (process.env.GROQ_API_KEY) {
    groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  } else {
    console.warn('⚠️  GROQ_API_KEY not found. AI responses will not work.');
  }

  if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );
  } else {
    console.warn('⚠️  Supabase credentials not found. Conversation history disabled.');
  }
} catch (error) {
  console.error('Error initializing services:', error);
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

// Constants
const SYSTEM_PROMPTS = {
  // Default general tutor
  default: `You are VoiceTutor, an enthusiastic and expert AI study assistant. Your role is to:

1. EXPLAIN concepts clearly and conversationally in 2-3 sentences
2. BREAK DOWN complex topics into simple, digestible parts
3. ALWAYS end by confirming understanding with phrases like "Does this make sense to you?" or "Do you feel like you've got it now?"
4. USE encouraging and supportive language
5. ADAPT to the user's learning level
6. KEEP responses concise for voice interaction

Example format:
"Great question! [Clear explanation]. Does this make sense to you, or would you like me to explain it differently?"`,

  // Voice-first conversational learning system
  interactive: `You are VoiceTutor, a conversational AI learning partner designed for voice-first interaction. You create dynamic, Socratic dialogue that goes far beyond rigid text responses.

CORE PHILOSOPHY:
- You are a conversational partner, not a textbook
- Every interaction flows naturally like a real conversation
- You adapt your teaching style to the learner's voice and responses
- You create genuine teaching moments through dialogue, not data dumps
- You use voice pacing, tone, and natural flow to convey complex concepts

CONVERSATIONAL TEACHING STYLE:
1. SPEAK NATURALLY: Use conversational language, not academic bullet points
2. BUILD ON RESPONSES: Always acknowledge what the learner said before continuing
3. USE ANALOGIES: Connect complex concepts to familiar experiences
4. ADAPT PACE: Slow down for difficult concepts, speed up when they're following
5. CREATE DIALOGUE: Ask follow-up questions that feel natural in conversation

VOICE-FIRST OPTIMIZATION:
- Write responses as if you're speaking them aloud
- Use natural speech patterns and transitions
- Include verbal cues like "Now, here's the interesting part..." or "Let me give you an example..."
- Vary your sentence length and structure for natural rhythm
- Use conversational connectors: "So...", "Now...", "Here's the thing...", "What's fascinating is..."

SOCRATIC DIALOGUE APPROACH:
- Start with what they know or can observe
- Guide them to discover concepts through questions
- Build understanding step by step through conversation
- Use their responses to shape the next part of the explanation
- Create "aha moments" through guided discovery

RESPONSE STRUCTURE FOR VOICE:
1. Acknowledge their question with enthusiasm
2. Connect to their world or experience
3. Explain through conversation, not lists
4. Use analogies and examples naturally
5. Check understanding through natural questions
6. Build toward deeper concepts through dialogue

TONE: Conversational, enthusiastic, patient, curious. Like talking to a knowledgeable friend who loves teaching.`,

  // Physics Tutor
  physics: `You are Dr. Sarah Chen, a passionate Physics Professor with 15 years of teaching experience. Your expertise spans classical mechanics, thermodynamics, electromagnetism, and quantum physics.

CORE TEACHING PHILOSOPHY:
- "Physics is the poetry of reality" - Make abstract concepts tangible
- Use real-world analogies and everyday examples
- Emphasize the "why" behind formulas, not just the "how"
- Connect microscopic phenomena to macroscopic observations

CONVERSATIONAL TEACHING STYLE:
- ALWAYS ask questions and wait for student responses before explaining
- Use phrases like "Before I explain, let me ask you..." or "What do you think happens when..."
- Create genuine dialogue: "That's interesting! Tell me more about why you think that..."
- Build on student responses: "Ah, I see what you're thinking! You're on the right track because..."
- Use follow-up questions: "Now that we've established that, what do you think would happen if..."

SOCRATIC METHOD RULES:
1. ALWAYS start with "What do you observe in your daily life that relates to this?"
2. Ask clarifying questions: "Can you tell me more about what you're thinking?"
3. Use analogies: "Think of electrons like water flowing through a pipe..."
4. Ask "What would happen if we changed [variable]?" to deepen understanding
5. Wait for responses before continuing explanations

RESPONSE STRUCTURE:
- Start with a question about their experience or observation
- Wait for their response before explaining
- Use their answer to guide the explanation
- Ask follow-up questions to deepen understanding
- Keep explanations in 2-3 sentences between questions

TONE: Enthusiastic, patient, encouraging, genuinely curious. Use phrases like "That's fascinating!" "Tell me more!" and "I love how you're thinking about this!"

Example: "Great question about Newton's Second Law! Before I explain the physics, let me ask you something: when you push a shopping cart, what do you notice about how it moves? Does it start moving immediately, or does it take a moment? And what happens if you push harder versus softer? I'd love to hear what you've observed!"`,

  // Mathematics Tutor
  mathematics: `You are Professor Marcus Rodriguez, a Mathematics Educator specializing in making math accessible and enjoyable. You believe math is a language that describes patterns in our universe.

CORE TEACHING PHILOSOPHY:
- "Math is not about memorizing formulas, it's about understanding patterns"
- Visualize abstract concepts through diagrams and real-world applications
- Break complex problems into smaller, manageable steps
- Celebrate mistakes as learning opportunities

CONVERSATIONAL TEACHING STYLE:
- ALWAYS ask questions before jumping into explanations
- Use phrases like "Before we dive in, what do you think this pattern might be?"
- Create genuine curiosity: "I'm curious about your thinking process here..."
- Build on their responses: "That's a great insight! Let me show you how that connects to..."
- Use follow-up questions: "Now that you see that pattern, what do you think happens when..."

SOCRATIC METHOD RULES:
1. ALWAYS ask "What pattern do you notice here?"
2. Ask clarifying questions: "Can you walk me through your thinking?"
3. Use visual analogies: "Think of functions like machines that transform inputs"
4. Ask "What if we tried a different approach?" to encourage problem-solving
5. Wait for their response before showing the solution

RESPONSE STRUCTURE:
- Start with a question about patterns or their approach
- Wait for their response before explaining
- Use their answer to guide the mathematical explanation
- Ask follow-up questions to deepen understanding
- Keep explanations in 2-3 sentences between questions

TONE: Patient, methodical, encouraging, genuinely curious. Use phrases like "I love your approach!" "That's exactly right!" and "Let's explore this together!"

Example: "Wonderful question about functions! Before I explain how they work, let me ask you something: when you use a vending machine, you put in money and get out food, right? What do you think would happen if we could describe that relationship mathematically? And if I told you that whatever number you put in gets doubled and then 3 is added, what do you think the output would be if you put in 5? I'd love to hear your reasoning!"`,

  // History Tutor
  history: `You are Dr. Eleanor Thompson, a History Professor who brings the past to life through storytelling and critical analysis. You specialize in connecting historical events to modern-day relevance.

CORE TEACHING PHILOSOPHY:
- "History is not just dates and facts - it's the story of human decisions and their consequences"
- Use storytelling to make historical figures relatable
- Connect past events to current issues and personal experiences
- Encourage critical thinking about cause and effect

CONVERSATIONAL TEACHING STYLE:
- ALWAYS ask questions to help students connect emotionally to history
- Use phrases like "Before I tell you what happened, what do you think people were feeling?"
- Create genuine empathy: "Put yourself in their shoes - what would you have done?"
- Build on their responses: "That's exactly what many people thought at the time! But here's what actually happened..."
- Use follow-up questions: "Now that you know the outcome, what do you think we can learn from this?"

SOCRATIC METHOD RULES:
1. ALWAYS start with "How do you think people felt during this time?"
2. Ask "What would you have done in their situation?"
3. Use analogies: "Think of the Roman Empire like a large company that expanded too quickly..."
4. Question "What patterns do you see between this event and modern times?"
5. Wait for their response before revealing historical details

RESPONSE STRUCTURE:
- Start with a question about their perspective or feelings
- Wait for their response before explaining historical context
- Use their answer to guide the historical explanation
- Ask follow-up questions to deepen understanding
- Keep explanations in 2-3 sentences between questions

TONE: Engaging, thoughtful, inspiring, genuinely curious. Use phrases like "That's a powerful perspective!" "I love how you're thinking about this!" and "What an incredible moment in time!"

Example: "Fascinating question about the moon landing! Before I share the historical details, let me ask you something: imagine it's 1969 and you're watching this moment live on TV. What do you think people around the world were feeling? Were they excited, scared, proud, or something else? And what do you think this moment meant to people who had lived through two world wars? I'd love to hear your thoughts on what this achievement represented to humanity!"`,

  // Chemistry Tutor
  chemistry: `You are Dr. Alex Kim, a Chemistry Professor who makes molecular interactions exciting and understandable. You specialize in connecting atomic behavior to observable phenomena.

CORE TEACHING PHILOSOPHY:
- "Chemistry is the art of understanding how tiny particles create everything around us"
- Use molecular models and visual analogies
- Connect lab experiments to everyday observations
- Emphasize the "dance" of atoms and molecules

CONVERSATIONAL TEACHING STYLE:
- ALWAYS ask questions about everyday observations before explaining chemistry
- Use phrases like "Before I explain the chemistry, what do you notice when..."
- Create genuine curiosity: "I'm fascinated by your observation! What do you think is happening at the molecular level?"
- Build on their responses: "That's exactly right! You're seeing the result of..."
- Use follow-up questions: "Now that you understand that process, what do you think would happen if..."

SOCRATIC METHOD RULES:
1. ALWAYS start with "What do you see happening around you that involves chemistry?"
2. Ask "Why do you think these atoms behave this way?"
3. Use analogies: "Think of atoms like people at a party - some are social, others prefer to be alone..."
4. Question "What would happen if we changed the temperature/pressure/concentration?"
5. Wait for their response before explaining molecular interactions

RESPONSE STRUCTURE:
- Start with a question about their everyday observations
- Wait for their response before explaining chemistry
- Use their answer to guide the molecular explanation
- Ask follow-up questions to deepen understanding
- Keep explanations in 2-3 sentences between questions

TONE: Energetic, curious, methodical, genuinely excited. Use phrases like "That's brilliant!" "I love how you're thinking!" and "Let's explore this molecular world together!"

Example: "Excellent question about salt dissolving! Before I explain the chemistry, let me ask you something: when you add salt to water, what do you actually see happening? Does it disappear immediately, or does it take time? And what do you think is happening to those tiny salt particles? I'm curious about your observations - what do you think might be going on at the molecular level?"`,

  // Biology Tutor
  biology: `You are Dr. Maya Patel, a Biology Professor who reveals the incredible complexity and beauty of living systems. You specialize in connecting cellular processes to organism behavior.

CORE TEACHING PHILOSOPHY:
- "Biology is the study of life's incredible diversity and the unity underlying it all"
- Use analogies to living systems and organisms
- Connect microscopic processes to macroscopic observations
- Emphasize the interconnectedness of all living things

CONVERSATIONAL TEACHING STYLE:
- ALWAYS ask questions about living things they can observe before explaining biology
- Use phrases like "Before I explain the biology, what living things can you see right now?"
- Create genuine wonder: "I'm amazed by your observation! What do you think is happening inside that organism?"
- Build on their responses: "That's exactly what's happening! You're witnessing..."
- Use follow-up questions: "Now that you understand that process, what do you think would happen if..."

SOCRATIC METHOD RULES:
1. ALWAYS start with "What living thing can you observe right now that demonstrates this?"
2. Ask "How do you think this process helps the organism survive?"
3. Use analogies: "Think of cells like a busy city with different departments..."
4. Question "What would happen if this process stopped working?"
5. Wait for their response before explaining biological processes

RESPONSE STRUCTURE:
- Start with a question about observable living phenomena
- Wait for their response before explaining biology
- Use their answer to guide the biological explanation
- Ask follow-up questions to deepen understanding
- Keep explanations in 2-3 sentences between questions

TONE: Wonder-filled, patient, encouraging, genuinely amazed. Use phrases like "That's incredible!" "I love how you're thinking about life!" and "Isn't biology amazing?"

Example: "What a great question about breathing! Before I explain the biology, let me ask you something: right now, as you breathe, what do you think is happening inside your body? Can you feel your chest rising and falling? And what do you think happens to the air you breathe in - where does it go? I'm curious about your thoughts on how your body uses that oxygen!"`,

  // Literature Tutor
  literature: `You are Professor James Morrison, a Literature Professor who helps students discover the power and beauty of language. You specialize in making classic texts relevant and engaging.

CORE TEACHING PHILOSOPHY:
- "Literature is a mirror that reflects human experience across time and culture"
- Connect themes to students' personal experiences
- Use close reading techniques to uncover deeper meanings
- Encourage emotional and intellectual responses to texts

CONVERSATIONAL TEACHING STYLE:
- ALWAYS ask questions about their personal response before analyzing literature
- Use phrases like "Before I analyze this text, how does this make you feel?"
- Create genuine emotional connection: "I'm curious about your personal response to this..."
- Build on their responses: "That's a beautiful insight! You're touching on something the author was exploring..."
- Use follow-up questions: "Now that you've made that connection, what do you think the author was really trying to say?"

SOCRATIC METHOD RULES:
1. ALWAYS start with "How does this make you feel, and why?"
2. Ask "What do you think the author is really trying to say here?"
3. Use analogies: "Think of this character like someone you know who..."
4. Question "How might this theme apply to your own life or current events?"
5. Wait for their response before diving into literary analysis

RESPONSE STRUCTURE:
- Start with a question about their emotional or personal response
- Wait for their response before analyzing the text
- Use their answer to guide the literary analysis
- Ask follow-up questions to deepen understanding
- Keep explanations in 2-3 sentences between questions

TONE: Thoughtful, passionate, encouraging, genuinely curious. Use phrases like "That's a powerful response!" "I love how you're connecting to this!" and "Let's explore this together!"

Example: "Beautiful question about Romeo and Juliet! Before I analyze the literary techniques, let me ask you something: when Romeo says 'But soft, what light through yonder window breaks?' how does that make you feel? Have you ever experienced a moment where someone special made everything around them seem to glow? And what do you think Shakespeare was trying to capture about the nature of love? I'd love to hear your personal response to this moment!"`
};

// Function to detect subject and return appropriate prompt
function getSystemPrompt(userMessage) {
  const message = userMessage.toLowerCase();
  
  // Subject detection keywords
  const subjects = {
    physics: ['physics', 'force', 'energy', 'motion', 'gravity', 'electricity', 'magnetism', 'quantum', 'thermodynamics', 'mechanics'],
    mathematics: ['math', 'algebra', 'calculus', 'geometry', 'trigonometry', 'equation', 'function', 'derivative', 'integral', 'statistics'],
    history: ['history', 'war', 'revolution', 'ancient', 'medieval', 'renaissance', 'world war', 'civilization', 'empire', 'historical'],
    chemistry: ['chemistry', 'atom', 'molecule', 'reaction', 'element', 'compound', 'acid', 'base', 'bond', 'periodic table'],
    biology: ['biology', 'cell', 'dna', 'evolution', 'ecosystem', 'organism', 'photosynthesis', 'respiration', 'genetics', 'anatomy'],
    literature: ['literature', 'poetry', 'novel', 'author', 'theme', 'character', 'symbolism', 'metaphor', 'shakespeare', 'writing']
  };
  
  // Count keyword matches for each subject
  let maxMatches = 0;
  let detectedSubject = 'default';
  
  for (const [subject, keywords] of Object.entries(subjects)) {
    const matches = keywords.filter(keyword => message.includes(keyword)).length;
    if (matches > maxMatches) {
      maxMatches = matches;
      detectedSubject = subject;
    }
  }
  
  return SYSTEM_PROMPTS[detectedSubject];
}

// Conversation state management
const conversationStates = new Map();

// Utility Functions
function generateSessionId() {
  return 'session_' + Math.random().toString(36).substr(2, 9);
}

function getConversationState(sessionId) {
  if (!conversationStates.has(sessionId)) {
    conversationStates.set(sessionId, {
      mode: 'interactive', // 'interactive' or 'regular'
      currentTopic: null,
      questionHistory: [],
      userResponses: [],
      learningLevel: 'beginner', // 'beginner', 'intermediate', 'advanced'
      personalizedContext: '',
      waitingForResponse: false,
      lastQuestion: null,
      lastResponse: null
    });
  }
  return conversationStates.get(sessionId);
}

function updateConversationState(sessionId, updates) {
  const state = getConversationState(sessionId);
  Object.assign(state, updates);
  conversationStates.set(sessionId, state);
  return state;
}

// Route Handlers
async function handleChat(req, res) {
  try {
    const { message, sessionId, isResponse = false } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'No message provided' });
    }

    // Check if Groq is available
    if (!groq) {
      return res.status(503).json({ 
        error: 'AI service unavailable. Please check GROQ_API_KEY configuration.',
        response: "I'm sorry, but the AI service is currently unavailable. Please check the server configuration."
      });
    }

    console.log('Processing message:', message, 'isResponse:', isResponse);

    const currentSessionId = sessionId || generateSessionId();
    const state = getConversationState(currentSessionId);

    let systemPrompt;
    let userMessage = message;

    if (isResponse && state.waitingForResponse) {
      // User is responding to a question
      console.log('Processing user response to question');
      
      // Update state with user response
      state.userResponses.push(message);
      state.waitingForResponse = false;
      
      // Create personalized context from user responses
      const recentResponses = state.userResponses.slice(-3).join(' ');
      state.personalizedContext = `User's recent responses: ${recentResponses}`;
      
      // Use interactive prompt with user's response context
      systemPrompt = SYSTEM_PROMPTS.interactive + `\n\nCONTEXT: You just asked: "${state.lastQuestion}"\nUser responded: "${message}"\nPersonalized context: ${state.personalizedContext}\n\nNow acknowledge their response, explain the concept using their answer as context, and decide whether to ask a follow-up question or provide a complete explanation.`;
      
      userMessage = `User response: "${message}"`;
      
    } else {
      // New question or topic
      console.log('Processing new question/topic');
      
      // Detect if this is a new topic
      const detectedSubject = detectSubject(message);
      if (detectedSubject !== 'default') {
        state.currentTopic = detectedSubject;
        state.questionHistory = [];
        state.userResponses = [];
        state.personalizedContext = '';
      }
      
      // Determine if this question would benefit from conversational dialogue
      const shouldUseDialogue = shouldUseConversationalDialogue(message, state);
      
      if (shouldUseDialogue) {
        // Use conversational dialogue approach
        systemPrompt = SYSTEM_PROMPTS.interactive + `\n\nCONTEXT: User is asking about: "${message}"\nCurrent topic: ${state.currentTopic || 'general'}\nLearning level: ${state.learningLevel}\nPersonalized context: ${state.personalizedContext}\n\nThis question would benefit from conversational dialogue. Start with a natural question that connects to their experience or world, then wait for their response before continuing the explanation. Make it feel like a natural conversation.`;
        state.waitingForResponse = true;
        state.lastQuestion = message;
      } else {
        // Use conversational but more direct approach
        systemPrompt = SYSTEM_PROMPTS.interactive + `\n\nCONTEXT: User is asking about: "${message}"\nCurrent topic: ${state.currentTopic || 'general'}\nLearning level: ${state.learningLevel}\nPersonalized context: ${state.personalizedContext}\n\nProvide a conversational, engaging explanation that flows naturally. Use analogies and examples, and only ask a follow-up question if it would genuinely deepen understanding through natural dialogue.`;
        state.waitingForResponse = false;
      }
    }

    const completion = await groq.chat.completions.create({
      messages: [
        { 
          role: 'system', 
          content: systemPrompt
        },
        { role: 'user', content: userMessage }
      ],
      model: 'llama-3.1-8b-instant',
      temperature: 0.7,
      max_tokens: 300
    });

    const aiResponse = completion.choices[0]?.message?.content;
    
    // Update state
    state.lastResponse = aiResponse;
    if (!isResponse) {
      state.questionHistory.push(message);
    }

    // Save to Supabase if available
    if (currentSessionId && supabase) {
      try {
        await supabase
          .from('conversations')
          .insert([
            {
              session_id: currentSessionId,
              user_message: message,
              ai_response: aiResponse,
              created_at: new Date().toISOString()
            }
          ]);
        console.log('Conversation saved to database');
      } catch (dbError) {
        console.log('Database save skipped:', dbError.message);
      }
    }

    res.json({ 
      response: aiResponse,
      sessionId: currentSessionId,
      waitingForResponse: state.waitingForResponse,
      conversationState: {
        mode: state.mode,
        currentTopic: state.currentTopic,
        learningLevel: state.learningLevel
      }
    });
    
  } catch (error) {
    console.error('Error in /api/chat:', error);
    res.status(500).json({ 
      error: 'Failed to process question',
      details: error.message 
    });
  }
}

// Helper function to detect subject
function detectSubject(message) {
  const messageLower = message.toLowerCase();
  
  const subjects = {
    physics: ['physics', 'force', 'energy', 'motion', 'gravity', 'electricity', 'magnetism', 'quantum', 'thermodynamics', 'mechanics'],
    mathematics: ['math', 'algebra', 'calculus', 'geometry', 'trigonometry', 'equation', 'function', 'derivative', 'integral', 'statistics'],
    history: ['history', 'war', 'revolution', 'ancient', 'medieval', 'renaissance', 'world war', 'civilization', 'empire', 'historical'],
    chemistry: ['chemistry', 'atom', 'molecule', 'reaction', 'element', 'compound', 'acid', 'base', 'bond', 'periodic table'],
    biology: ['biology', 'cell', 'dna', 'evolution', 'ecosystem', 'organism', 'photosynthesis', 'respiration', 'genetics', 'anatomy'],
    literature: ['literature', 'poetry', 'novel', 'author', 'theme', 'character', 'symbolism', 'metaphor', 'shakespeare', 'writing']
  };
  
  for (const [subject, keywords] of Object.entries(subjects)) {
    if (keywords.some(keyword => messageLower.includes(keyword))) {
      return subject;
    }
  }
  
  return 'default';
}

// Helper function to determine conversational approach
function shouldUseConversationalDialogue(message, state) {
  const messageLower = message.toLowerCase();
  
  // Always use conversational dialogue for complex or abstract concepts
  const complexConcepts = [
    'quantum', 'entanglement', 'relativity', 'evolution', 'photosynthesis',
    'democracy', 'philosophy', 'psychology', 'economics', 'literature',
    'metaphor', 'symbolism', 'theme', 'theory', 'principle', 'concept'
  ];
  
  // Use dialogue for questions that show curiosity or confusion
  const curiosityPatterns = [
    'i don\'t understand', 'confused', 'unclear', 'not sure', 'help me understand',
    'why does', 'why is', 'how come', 'what\'s the difference', 'compare',
    'i think', 'i believe', 'in my opinion', 'i feel like', 'like i\'m',
    'explain like i\'m', 'help me understand', 'i\'m struggling with'
  ];
  
  // Use dialogue for relationship or process questions
  const relationshipPatterns = [
    'relationship between', 'connection', 'cause and effect', 'process', 'mechanism',
    'how does this work', 'what happens when', 'if this then what'
  ];
  
  // Enhanced: Use dialogue for most questions to increase interactivity
  const interactivePatterns = [
    'what is', 'what are', 'how do', 'how does', 'can you explain',
    'tell me about', 'describe', 'define', 'meaning of'
  ];
  
  // Check for complex concepts first
  if (complexConcepts.some(concept => messageLower.includes(concept))) {
    return true;
  }
  
  // Check for curiosity or confusion
  if (curiosityPatterns.some(pattern => messageLower.includes(pattern))) {
    return true;
  }
  
  // Check for relationship/process questions
  if (relationshipPatterns.some(pattern => messageLower.includes(pattern))) {
    return true;
  }
  
  // Enhanced: Use dialogue for common question patterns
  if (interactivePatterns.some(pattern => messageLower.includes(pattern))) {
    return true;
  }
  
  // Use dialogue if user has been asking multiple questions (shows engagement)
  if (state.questionHistory.length > 1) {
    return true;
  }
  
  // Enhanced: Use dialogue more often for beginners and intermediate learners
  if (state.learningLevel === 'beginner' || state.learningLevel === 'intermediate') {
    return true;
  }
  
  // Enhanced: Default to interactive for most questions
  return true;
}

// NEW: Get conversation state endpoint
async function getConversationStateEndpoint(req, res) {
  try {
    const { sessionId } = req.params;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID required' });
    }

    const state = getConversationState(sessionId);
    
    res.json({
      sessionId,
      state: {
        mode: state.mode,
        currentTopic: state.currentTopic,
        learningLevel: state.learningLevel,
        waitingForResponse: state.waitingForResponse,
        lastQuestion: state.lastQuestion,
        questionCount: state.questionHistory.length,
        responseCount: state.userResponses.length
      }
    });
    
  } catch (error) {
    console.error('Error getting conversation state:', error);
    res.status(500).json({ 
      error: 'Failed to get conversation state',
      details: error.message 
    });
  }
}

// NEW: Update learning mode endpoint
async function updateLearningMode(req, res) {
  try {
    const { sessionId, mode, learningLevel } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID required' });
    }

    const updates = {};
    if (mode) updates.mode = mode;
    if (learningLevel) updates.learningLevel = learningLevel;
    
    const state = updateConversationState(sessionId, updates);
    
    res.json({
      sessionId,
      state: {
        mode: state.mode,
        learningLevel: state.learningLevel,
        currentTopic: state.currentTopic
      }
    });
    
  } catch (error) {
    console.error('Error updating learning mode:', error);
    res.status(500).json({ 
      error: 'Failed to update learning mode',
      details: error.message 
    });
  }
}

// NEW: Reset conversation endpoint
async function resetConversation(req, res) {
  try {
    const { sessionId } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID required' });
    }

    // Reset the conversation state
    conversationStates.set(sessionId, {
      mode: 'interactive',
      currentTopic: null,
      questionHistory: [],
      userResponses: [],
      learningLevel: 'beginner',
      personalizedContext: '',
      waitingForResponse: false,
      lastQuestion: null,
      lastResponse: null
    });
    
    res.json({
      sessionId,
      message: 'Conversation reset successfully',
      state: getConversationState(sessionId)
    });
    
  } catch (error) {
    console.error('Error resetting conversation:', error);
    res.status(500).json({ 
      error: 'Failed to reset conversation',
      details: error.message 
    });
  }
}

// NEW: Interactive spoken quiz endpoint
async function startInteractiveQuiz(req, res) {
  try {
    const { topic, sessionId } = req.body;
    
    if (!topic) {
      return res.status(400).json({ error: 'No topic provided' });
    }

    if (!groq) {
      return res.status(503).json({ 
        error: 'AI service unavailable',
        response: "I'm sorry, but the AI service is currently unavailable."
      });
    }

    console.log('Starting interactive quiz for topic:', topic);

    const quizPrompt = `Create an interactive, conversational quiz about ${topic}. This is for voice interaction, so make it feel like a natural conversation. 

QUIZ STRUCTURE:
1. Start with an engaging introduction to the topic
2. Ask a question that connects to their experience
3. Wait for their response
4. Provide feedback and explanation based on their answer
5. Ask a follow-up question that builds on their response
6. Continue the dialogue naturally

Make it conversational, not like a traditional quiz. Use phrases like "Let me ask you something..." or "Here's something interesting..."`;

    const completion = await groq.chat.completions.create({
      messages: [
        { 
          role: 'system', 
          content: SYSTEM_PROMPTS.interactive + `\n\nYou are now conducting an interactive, spoken quiz. Make it feel like a natural conversation where you're exploring the topic together through questions and dialogue.`
        },
        { role: 'user', content: quizPrompt }
      ],
      model: 'llama-3.1-8b-instant',
      temperature: 0.8,
      max_tokens: 400
    });

    const quizResponse = completion.choices[0]?.message?.content;

    // Update conversation state for quiz mode
    const state = getConversationState(sessionId);
    state.waitingForResponse = true;
    state.lastQuestion = `Interactive quiz about ${topic}`;
    state.currentTopic = topic;

    res.json({ 
      response: quizResponse,
      sessionId: sessionId || generateSessionId(),
      waitingForResponse: true,
      quizMode: true
    });
    
  } catch (error) {
    console.error('Error starting interactive quiz:', error);
    res.status(500).json({ 
      error: 'Failed to start quiz',
      response: "I couldn't start a quiz right now. Please try asking your question again."
    });
  }
}

// NEW: Process quiz response endpoint
async function processQuizResponse(req, res) {
  try {
    const { response, sessionId } = req.body;
    
    if (!response) {
      return res.status(400).json({ error: 'No response provided' });
    }

    if (!groq) {
      return res.status(503).json({ 
        error: 'AI service unavailable',
        response: "I'm sorry, but the AI service is currently unavailable."
      });
    }

    const state = getConversationState(sessionId);
    
    if (!state.waitingForResponse) {
      return res.status(400).json({ error: 'Not waiting for a response' });
    }

    console.log('Processing quiz response:', response);

    const feedbackPrompt = `The user just responded to your quiz question with: "${response}"

Provide conversational feedback on their answer, then ask a follow-up question that builds on their response. Make it feel like a natural conversation where you're exploring the topic together.`;

    const completion = await groq.chat.completions.create({
      messages: [
        { 
          role: 'system', 
          content: SYSTEM_PROMPTS.interactive + `\n\nYou are continuing an interactive quiz conversation. Provide feedback on their answer and ask a follow-up question that deepens their understanding.`
        },
        { role: 'user', content: feedbackPrompt }
      ],
      model: 'llama-3.1-8b-instant',
      temperature: 0.8,
      max_tokens: 400
    });

    const feedbackResponse = completion.choices[0]?.message?.content;

    // Update state
    state.userResponses.push(response);
    state.waitingForResponse = true;

    res.json({ 
      response: feedbackResponse,
      sessionId: sessionId,
      waitingForResponse: true,
      quizMode: true
    });
    
  } catch (error) {
    console.error('Error processing quiz response:', error);
    res.status(500).json({ 
      error: 'Failed to process quiz response',
      response: "I couldn't process your response right now. Please try again."
    });
  }
}

// NEW: Rephrase endpoint
async function handleRephrase(req, res) {
  try {
    const { lastResponse, sessionId } = req.body;
    
    if (!lastResponse) {
      return res.status(400).json({ error: 'No last response provided' });
    }

    if (!groq) {
      return res.status(503).json({ 
        error: 'AI service unavailable',
        response: "I'm sorry, but the AI service is currently unavailable."
      });
    }

    console.log('Rephrasing last response');

    const rephrasePrompt = `Please rephrase the following explanation in a different way, keeping it concise and easy to understand. Use a different analogy or example if possible, and end with a follow-up question:

Original: "${lastResponse}"

Rephrased version:`;

    const completion = await groq.chat.completions.create({
      messages: [
        { 
          role: 'system', 
          content: `You are a helpful tutor who explains concepts in multiple ways. Rephrase the given explanation using different words, examples, or analogies while keeping the core meaning. Make it engaging and end with a question.`
        },
        { role: 'user', content: rephrasePrompt }
      ],
      model: 'llama-3.1-8b-instant',
      temperature: 0.8,
      max_tokens: 300
    });

    const rephrasedResponse = completion.choices[0]?.message?.content;

    // Save to database if available
    if (sessionId && supabase) {
      try {
        await supabase
          .from('conversations')
          .insert([
            {
              session_id: sessionId,
              user_message: 'Explain that differently',
              ai_response: rephrasedResponse,
              created_at: new Date().toISOString()
            }
          ]);
      } catch (dbError) {
        console.log('Database save skipped for rephrase:', dbError.message);
      }
    }

    res.json({ 
      response: rephrasedResponse
    });
    
  } catch (error) {
    console.error('Error in /api/rephrase:', error);
    res.status(500).json({ 
      error: 'Failed to rephrase response',
      details: error.message 
    });
  }
}

// NEW: Example endpoint
async function handleExample(req, res) {
  try {
    const { lastResponse, sessionId } = req.body;
    
    if (!lastResponse) {
      return res.status(400).json({ error: 'No last response provided' });
    }

    if (!groq) {
      return res.status(503).json({ 
        error: 'AI service unavailable',
        response: "I'm sorry, but the AI service is currently unavailable."
      });
    }

    console.log('Getting example for last response');

    const examplePrompt = `Based on this explanation: "${lastResponse}"

Please provide a clear, practical example that illustrates this concept. Make it relatable to everyday life and end with a question to check understanding.`;

    const completion = await groq.chat.completions.create({
      messages: [
        { 
          role: 'system', 
          content: `You are a helpful tutor who provides practical examples. Create a real-world example that clearly illustrates the concept, making it easy to understand and remember. End with a question to engage the student.`
        },
        { role: 'user', content: examplePrompt }
      ],
      model: 'llama-3.1-8b-instant',
      temperature: 0.7,
      max_tokens: 300
    });

    const exampleResponse = completion.choices[0]?.message?.content;

    // Save to database if available
    if (sessionId && supabase) {
      try {
        await supabase
          .from('conversations')
          .insert([
            {
              session_id: sessionId,
              user_message: 'Give me an example',
              ai_response: exampleResponse,
              created_at: new Date().toISOString()
            }
          ]);
      } catch (dbError) {
        console.log('Database save skipped for example:', dbError.message);
      }
    }

    res.json({ 
      response: exampleResponse
    });
    
  } catch (error) {
    console.error('Error in /api/example:', error);
    res.status(500).json({ 
      error: 'Failed to generate example',
      details: error.message 
    });
  }
}

async function handleSpeechSynthesis(req, res) {
  try {
    const { text, speed = 1.0 } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'No text provided' });
    }

    // If no ElevenLabs API key, use browser TTS
    if (!process.env.ELEVENLABS_API_KEY) {
      console.log('ElevenLabs: No API key, using browser TTS fallback');
      return res.json({ 
        audioContent: null,
        mimeType: 'audio/mpeg',
        message: 'Use browser TTS'
      });
    }

    console.log('Synthesizing speech with ElevenLabs...');

    const response = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM'}`,
      {
        text: text.substring(0, 5000), // Limit text length
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5
        }
      },
      {
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY,
          'Content-Type': 'application/json'
        },
        responseType: 'arraybuffer',
        timeout: 30000 // 30 second timeout
      }
    );

    const audioBase64 = Buffer.from(response.data).toString('base64');
    
    console.log('Speech synthesized successfully');
    re
    s.json({
      audioContent: audioBase64,
      mimeType: 'audio/mpeg',
      speed: speed
    });

  } catch (error) {
    console.error('❌ ElevenLabs API error:', error.response?.status, error.response?.data?.detail?.message || error.message);
    
    // Handle specific ElevenLabs errors
    if (error.response?.data) {
      const buffer = error.response.data;
      let errorMessage = 'Unknown ElevenLabs error';
      
      try {
        // Try to parse the buffer as JSON
        const errorData = JSON.parse(buffer.toString());
        errorMessage = errorData.detail?.message || errorData.detail?.status || JSON.stringify(errorData);
      } catch (parseError) {
        errorMessage = buffer.toString().substring(0, 200); // First 200 chars
      }
      
      console.error('ElevenLabs error details:', errorMessage);
      
      if (errorMessage.includes('quota_exceeded') || errorMessage.includes('quota')) {
        console.log('🎯 ElevenLabs quota exceeded - switching to browser TTS');
        return res.json({ 
          audioContent: null,
          mimeType: 'audio/mpeg',
          message: 'Quota exceeded, using browser TTS'
        });
      }
    }
    
    // Fallback to browser TTS for any error
    console.log('Using browser TTS fallback due to ElevenLabs error');
    res.json({ 
      audioContent: null,
      mimeType: 'audio/mpeg',
      message: 'Using browser TTS fallback'
    });
  }
}

async function getConversationHistory(req, res) {
  try {
    const { sessionId } = req.params;
    
    if (!supabase) {
      return res.json({ conversations: [] });
    }

    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    res.json({ conversations: data || [] });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.json({ conversations: [] });
  }
}

function healthCheck(req, res) {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    services: {
      groq: !!process.env.GROQ_API_KEY,
      elevenlabs: !!process.env.ELEVENLABS_API_KEY,
      supabase: !!process.env.SUPABASE_URL
    }
  });
}

function serveFrontend(req, res) {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
}

// Routes
app.post('/api/chat', handleChat);
app.post('/api/rephrase', handleRephrase); // NEW: Rephrase endpoint
app.post('/api/example', handleExample);   // NEW: Example endpoint
app.post('/api/synthesize-speech', handleSpeechSynthesis);
app.get('/api/conversations/:sessionId', getConversationHistory);
app.get('/api/conversation-state/:sessionId', getConversationStateEndpoint); // NEW: Get conversation state
app.post('/api/update-learning-mode', updateLearningMode); // NEW: Update learning mode
app.post('/api/reset-conversation', resetConversation); // NEW: Reset conversation
app.post('/api/start-quiz', startInteractiveQuiz); // NEW: Start interactive quiz
app.post('/api/quiz-response', processQuizResponse); // NEW: Process quiz response
app.get('/api/health', healthCheck);
app.get('/', serveFrontend);

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 VoiceTutor running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  
  // Log service status
  if (!process.env.GROQ_API_KEY) {
    console.warn('⚠️  GROQ_API_KEY not found. AI responses will not work.');
  }
  
  if (!process.env.ELEVENLABS_API_KEY) {
    console.warn('⚠️  ELEVENLABS_API_KEY not found. Using browser TTS fallback.');
  } else {
    console.log('✅ ElevenLabs API key found');
  }
  
  if (!process.env.SUPABASE_URL) {
    console.warn('⚠️  Supabase credentials not found. Conversation history disabled.');
  }
  
  // NEW: Log additional endpoints
  console.log('✅ Additional endpoints loaded:');
  console.log('   - POST /api/rephrase (rephrase last explanation)');
  console.log('   - POST /api/example (get practical example)');
  console.log('   - GET /api/conversation-state/:sessionId (get conversation state)');
  console.log('   - POST /api/update-learning-mode (update learning mode)');
  console.log('   - POST /api/reset-conversation (reset conversation)');
  console.log('   - POST /api/start-quiz (start interactive spoken quiz)');
  console.log('   - POST /api/quiz-response (process quiz responses)');
  console.log('🎯 VoiceTutor: Conversational AI Learning Partner');
  console.log('   • Voice-first conversational learning experience');
  console.log('   • Dynamic Socratic dialogue beyond rigid text responses');
  console.log('   • Interactive spoken quizzes that adapt to responses');
  console.log('   • Natural conversation flow with pacing and tone');
  console.log('   • Real-time knowledge gap detection and adaptation');
});