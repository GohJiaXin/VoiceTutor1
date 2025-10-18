/**
 * VoiceTutor - Frontend Application with Bootstrap
 * Improved version with better error handling, voice commands, and compatibility
 */

class VoiceTutor {
    constructor() {
        this.isListening = false;
        this.recognition = null;
        this.sessionId = null;
        this.lastAIResponse = '';
        this.voiceCommandsActive = true;
        this.isProcessing = false;
        
        // Interactive learning state
        this.conversationState = {
            mode: 'interactive',
            waitingForResponse: false,
            currentTopic: null,
            learningLevel: 'beginner',
            lastQuestion: null
        };
        
        // DOM Elements
        this.elements = {
            startBtn: document.getElementById('startBtn'),
            stopBtn: document.getElementById('stopBtn'),
            status: document.getElementById('status'),
            conversationContainer: document.getElementById('conversationContainer'),
            sessionId: document.getElementById('sessionId'),
            clearChat: document.getElementById('clearChat'),
            languageSelect: document.getElementById('languageSelect'),
            voiceSpeedSelect: document.getElementById('voiceSpeedSelect')
        };
        
        // Voice settings
        this.voiceSpeed = 1.0;
        
        this.init();
    }

    init() {
        this.generateSessionId();
        if (this.initSpeechRecognition()) {
            this.setupEventListeners();
            this.loadConversationHistory();
            this.updateUI();
            this.startVoiceCommands();
            this.setLanguageSelector();
        }
    }
    
    setLanguageSelector() {
        if (this.elements.languageSelect) {
            this.elements.languageSelect.value = LanguageManager.currentLanguage;
        }
    }

    generateSessionId() {
        this.sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        if (this.elements.sessionId) {
            this.elements.sessionId.textContent = this.sessionId;
        }
    }

    initSpeechRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (!SpeechRecognition) {
            this.showError('Speech recognition not supported in this browser. Please use Chrome, Edge, or Safari.');
            if (this.elements.startBtn) {
                this.elements.startBtn.disabled = true;
            }
            return false;
        }

        try {
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = false;
            this.recognition.interimResults = false;
            this.recognition.lang = LanguageManager.currentLanguage;
            this.recognition.maxAlternatives = 1;

            this.setupRecognitionEvents();
            return true;
        } catch (error) {
            console.error('Failed to initialize speech recognition:', error);
            this.showError('Failed to initialize speech recognition. Please refresh the page.');
            return false;
        }
    }

    setupRecognitionEvents() {
        this.recognition.onstart = () => this.onRecognitionStart();
        this.recognition.onresult = (event) => this.onRecognitionResult(event);
        this.recognition.onerror = (event) => this.onRecognitionError(event);
        this.recognition.onend = () => this.onRecognitionEnd();
    }

    setupEventListeners() {
        if (!this.elements.startBtn || !this.elements.stopBtn) {
            console.error('Required DOM elements not found');
            return;
        }

        this.elements.startBtn.addEventListener('click', () => this.startListening());
        this.elements.stopBtn.addEventListener('click', () => this.stopListening());
        
        if (this.elements.clearChat) {
            this.elements.clearChat.addEventListener('click', () => this.clearConversation());
        }
        
        if (this.elements.languageSelect) {
            this.elements.languageSelect.addEventListener('change', (e) => this.changeLanguage(e.target.value));
        }
        
        if (this.elements.voiceSpeedSelect) {
            this.elements.voiceSpeedSelect.addEventListener('change', (e) => this.changeVoiceSpeed(e.target.value));
        }

        // Keyboard shortcut: Space bar to toggle listening
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && !e.target.matches('input, textarea, select, button') && !this.isProcessing) {
                e.preventDefault();
                this.toggleListening();
            }
        });
    }

    startVoiceCommands() {
        const readyText = LanguageManager.getUIText('status.ready');
        this.setStatus(`🎤 ${readyText}`, 'info');
        console.log('Voice commands activated. Say "help" for available commands.');
    }
    
    changeLanguage(langCode) {
        if (LanguageManager.setLanguage(langCode)) {
            // Reinitialize speech recognition with new language
            if (this.recognition) {
                this.recognition.lang = langCode;
            }
            
            // Update status message
            const readyText = LanguageManager.getUIText('status.ready');
            this.setStatus(`🌍 Language changed! ${readyText}`, 'success');
            
            // Update voice commands help if it's currently displayed
            this.updateVoiceCommandsHelp();
        }
    }
    
    changeVoiceSpeed(speed) {
        this.voiceSpeed = parseFloat(speed);
        this.setStatus(`🎵 Voice speed set to ${speed}x`, 'success');
    }
    
    updateVoiceCommandsHelp() {
        // Update the help display if it's currently shown
        const helpElement = this.elements.conversationContainer?.querySelector('.message.ai-message');
        if (helpElement && helpElement.textContent.includes('Voice Commands Available')) {
            this.showVoiceCommandsHelp();
        }
    }

    getVoiceCommands() {
        // Get voice commands from language manager
        const commands = LanguageManager.getVoiceCommands();
        const commandMap = {};
        
        // Convert language-specific commands to action mapping
        Object.entries(commands).forEach(([command, description]) => {
            commandMap[command] = {
                action: this.getActionFromCommand(command),
                description: description
            };
        });
        
        return commandMap;
    }
    
    getActionFromCommand(command) {
        // Map language-specific commands to actions
        const actionMap = {
            // English
            'help': 'showHelp',
            'repeat': 'repeatLast',
            'explain differently': 'rephrase',
            'give me an example': 'provideExample',
            'quiz me': 'startQuiz',
            'clear chat': 'clearChat',
            'stop listening': 'stopListening',
            'start learning': 'startLearning',
            'pause': 'pauseSpeech',
            'resume': 'resumeSpeech',
            
            // Spanish
            'ayuda': 'showHelp',
            'repetir': 'repeatLast',
            'explica diferente': 'rephrase',
            'dame un ejemplo': 'provideExample',
            'hazme un quiz': 'startQuiz',
            'limpiar chat': 'clearChat',
            'dejar de escuchar': 'stopListening',
            'empezar a aprender': 'startLearning',
            'pausar': 'pauseSpeech',
            'reanudar': 'resumeSpeech',
            
            // French
            'aide': 'showHelp',
            'répète': 'repeatLast',
            'explique différemment': 'rephrase',
            'donne-moi un exemple': 'provideExample',
            'fais-moi un quiz': 'startQuiz',
            'effacer le chat': 'clearChat',
            'arrêter d\'écouter': 'stopListening',
            'commencer à apprendre': 'startLearning',
            'pause': 'pauseSpeech',
            'reprendre': 'resumeSpeech',
            
            // German
            'hilfe': 'showHelp',
            'wiederholen': 'repeatLast',
            'anders erklären': 'rephrase',
            'gib mir ein beispiel': 'provideExample',
            'quiz mich': 'startQuiz',
            'chat löschen': 'clearChat',
            'hör auf zuzuhören': 'stopListening',
            'lernen beginnen': 'startLearning',
            'pausieren': 'pauseSpeech',
            'fortsetzen': 'resumeSpeech',
            
            // Chinese
            '帮助': 'showHelp',
            '重复': 'repeatLast',
            '换个方式解释': 'rephrase',
            '给我一个例子': 'provideExample',
            '给我出题': 'startQuiz',
            '清空聊天': 'clearChat',
            '停止监听': 'stopListening',
            '开始学习': 'startLearning',
            '暂停': 'pauseSpeech',
            '继续': 'resumeSpeech'
        };
        
        return actionMap[command] || 'showHelp';
    }

    processVoiceCommand(transcript) {
        if (!this.voiceCommandsActive) return false;

        const commands = this.getVoiceCommands();
        const lowerTranscript = transcript.toLowerCase().trim();
        
        // Exact match first, then partial match
        for (const [command, config] of Object.entries(commands)) {
            if (lowerTranscript === command.toLowerCase() || lowerTranscript.includes(command.toLowerCase())) {
                console.log(`Voice command detected: "${command}"`);
                return this.executeVoiceCommand(config.action, transcript);
            }
        }
        
        return false;
    }

    executeVoiceCommand(action, originalTranscript) {
        if (this.isProcessing) {
            console.log('Command ignored: system is processing previous request');
            return true;
        }

        switch (action) {
            case 'showHelp':
                this.showVoiceCommandsHelp();
                return true;
                
            case 'repeatLast':
                if (this.lastAIResponse) {
                    this.addMessage('user', 'Repeat that');
                    this.addMessage('ai', this.lastAIResponse);
                    this.synthesizeSpeech(this.lastAIResponse);
                    this.setStatus('🔁 Repeating last explanation...', 'info');
                } else {
                    this.addMessage('user', 'Repeat that');
                    this.addMessage('ai', "I don't have anything to repeat yet. Please ask me a question first!");
                    this.setStatus('Nothing to repeat yet. Ask a question first!', 'info');
                }
                return true;
                
            case 'rephrase':
                this.addMessage('user', 'Explain that differently');
                this.setStatus('🔄 Rephrasing last explanation...', 'info');
                this.sendRephraseRequest();
                return true;
                
            case 'provideExample':
                this.addMessage('user', 'Give me an example');
                this.setStatus('📚 Getting practical example...', 'info');
                this.sendExampleRequest();
                return true;
                
            case 'startQuiz':
                this.addMessage('user', 'Quiz me');
                this.setStatus('🎯 Starting quiz...', 'info');
                this.startQuiz();
                return true;
                
            case 'clearChat':
                this.clearConversation();
                this.setStatus('🗑️ Chat cleared!', 'success');
                return true;
                
            case 'stopListening':
                this.stopListening();
                this.setStatus('⏹️ Voice recognition stopped', 'info');
                return true;
                
            case 'startLearning':
                this.startListening();
                return true;
                
            case 'pauseSpeech':
                this.pauseSpeech();
                return true;
                
            case 'resumeSpeech':
                this.resumeSpeech();
                return true;
                
            case 'checkMemory':
                this.checkMemoryStatus();
                return true;
        }
        return false;
    }

    showVoiceCommandsHelp() {
        const commands = this.getVoiceCommands();
        let helpText = "🎤 **Voice Commands Available:**\n\n";
        
        Object.entries(commands).forEach(([command, config]) => {
            helpText += `• **"${command}"** - ${config.description}\n`;
        });
        
        helpText += "\n💡 *Just say any of these phrases during conversation!*";
        
        this.addMessage('ai', helpText);
        this.setStatus('✅ Voice commands help displayed', 'success');
    }

    pauseSpeech() {
        if ('speechSynthesis' in window) {
            speechSynthesis.pause();
            this.setStatus('⏸️ Speech paused', 'info');
        }
    }

    resumeSpeech() {
        if ('speechSynthesis' in window) {
            speechSynthesis.resume();
            this.setStatus('▶️ Speech resumed', 'info');
        }
    }

    async sendRephraseRequest() {
        this.isProcessing = true;
        try {
            const response = await fetch('/api/rephrase', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    lastResponse: this.lastAIResponse,
                    sessionId: this.sessionId 
                })
            });

            if (response.ok) {
                const data = await response.json();
                this.lastAIResponse = data.response;
                this.addMessage('ai', data.response);
                await this.synthesizeSpeech(data.response);
            } else {
                throw new Error('Rephrase request failed');
            }
        } catch (error) {
            console.error('Rephrase error:', error);
            this.addMessage('ai', "I couldn't rephrase that. Please try asking your question again.");
            this.setStatus('❌ Error rephrasing response', 'error');
        } finally {
            this.isProcessing = false;
        }
    }

    async sendExampleRequest() {
        this.isProcessing = true;
        try {
            const response = await fetch('/api/example', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    lastResponse: this.lastAIResponse,
                    sessionId: this.sessionId 
                })
            });

            if (response.ok) {
                const data = await response.json();
                this.lastAIResponse = data.response;
                this.addMessage('ai', data.response);
                await this.synthesizeSpeech(data.response);
            } else {
                throw new Error('Example request failed');
            }
        } catch (error) {
            console.error('Example error:', error);
            this.addMessage('ai', "I couldn't find an example. Please try asking your question again.");
            this.setStatus('❌ Error getting example', 'error');
        } finally {
            this.isProcessing = false;
        }
    }

    async startQuiz() {
        // Get the current topic or ask user for a topic
        const topic = this.conversationState.currentTopic || 'general knowledge';
        
        this.addMessage('user', `Start a quiz about ${topic}`);
        this.setStatus('🎯 Starting interactive quiz...', 'info');
        
        try {
            const response = await fetch('/api/start-quiz', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    topic: topic,
                    sessionId: this.sessionId 
                })
            });

            if (response.ok) {
                const data = await response.json();
                this.lastAIResponse = data.response;
                this.addMessage('ai', data.response);
                
                // Update conversation state
                this.conversationState.waitingForResponse = data.waitingForResponse;
                this.conversationState.quizMode = data.quizMode;
                
                await this.synthesizeSpeech(data.response);
                
                if (this.conversationState.waitingForResponse) {
                    this.setStatus('🎤 Quiz question - please respond!', 'info');
                }
            } else {
                throw new Error('Quiz request failed');
            }
        } catch (error) {
            console.error('Quiz error:', error);
            this.addMessage('ai', "I couldn't start a quiz right now. Please try asking your question again.");
            this.setStatus('❌ Error starting quiz', 'error');
        }
    }

    onRecognitionStart() {
        this.isListening = true;
        this.updateUI('listening');
        const listeningText = LanguageManager.getUIText('status.listening');
        this.setStatus(`🎤 ${listeningText}`, 'listening');
    }

    onRecognitionResult(event) {
        if (!event.results || !event.results[0] || !event.results[0][0]) {
            this.setStatus('No speech detected. Please try again.', 'error');
            return;
        }

        const transcript = event.results[0][0].transcript;
        this.processUserInput(transcript);
    }

    onRecognitionError(event) {
        console.error('Speech recognition error:', event.error);
        
        const errorMessages = {
            'no-speech': 'No speech detected. Please try speaking again.',
            'audio-capture': 'No microphone found. Please check your microphone connection.',
            'not-allowed': 'Microphone access denied. Please allow microphone permissions.',
            'network': 'Network error. Please check your internet connection.',
            'aborted': 'Speech input was aborted.',
            'service-not-allowed': 'Speech recognition service not available.',
            'bad-grammar': 'Speech grammar error.',
            'language-not-supported': 'Language not supported.'
        };
        
        const userMessage = errorMessages[event.error] || `Error: ${event.error}. Please try again.`;
        this.setStatus(userMessage, 'error');
        this.resetInterface();
    }

    onRecognitionEnd() {
        this.resetInterface();
    }

    async processUserInput(transcript) {
        if (!this.validateInput(transcript)) {
            return;
        }

        // First, check if it's a voice command
        const isCommand = this.processVoiceCommand(transcript);
        
        if (!isCommand) {
            // If not a command, process as regular question or response
            this.addMessage('user', transcript);
            
            // Determine if this is a response to a question or a new question
            const isResponse = this.conversationState.waitingForResponse;
            
            if (isResponse) {
                this.setStatus('🤔 Processing your response...', 'info');
            } else {
                this.setStatus('🤔 Processing your question...', 'info');
            }
            
            this.isProcessing = true;

            try {
                let response;
                
                // Check if we're in quiz mode
                if (this.conversationState.quizMode && isResponse) {
                    response = await this.processQuizResponse(transcript);
                } else {
                    response = await this.sendToAI(transcript, isResponse);
                }
                
                this.lastAIResponse = response.response;
                console.log('Received response from backend:', response);
                console.log('Image URL received:', response.imageUrl);
                this.addMessage('ai', response.response, response.imageUrl);
                
                // Update conversation state
                if (response.conversationState) {
                    this.conversationState = { ...this.conversationState, ...response.conversationState };
                }
                
                // Update waiting for response status
                this.conversationState.waitingForResponse = response.waitingForResponse || false;
                this.conversationState.quizMode = response.quizMode || false;
                
                await this.synthesizeSpeech(response.response);
                
                // Update status based on conversation state
                if (this.conversationState.waitingForResponse) {
                    if (this.conversationState.quizMode) {
                        this.setStatus('🎤 Quiz question - please respond!', 'info');
                    } else {
                        this.setStatus('🎤 I asked you a question - please respond!', 'info');
                    }
                } else {
                    this.setStatus('✅ Ready for your next question!', 'success');
                }
                
            } catch (error) {
                console.error('Error:', error);
                this.handleProcessError(error);
            } finally {
                this.isProcessing = false;
            }
        }
    }

    validateInput(transcript) {
        if (!transcript || transcript.trim().length === 0) {
            this.setStatus('No speech detected. Please try again.', 'error');
            return false;
        }
        
        if (transcript.trim().length < 2) {
            this.setStatus('Input too short. Please speak clearly.', 'error');
            return false;
        }
        
        if (transcript.length > 1000) {
            this.setStatus('Input too long. Please keep questions under 1000 characters.', 'error');
            return false;
        }
        
        return true;
    }

    handleProcessError(error) {
        if (error.message.includes('Network') || error.message.includes('fetch')) {
            this.setStatus('❌ Network error. Please check your internet connection.', 'error');
            this.addMessage('ai', "I'm having trouble connecting. Please check your internet connection and try again.");
        } else if (error.message.includes('500') || error.message.includes('server')) {
            this.setStatus('❌ Server error. Please try again in a moment.', 'error');
            this.addMessage('ai', "I'm experiencing some technical difficulties. Please try again in a moment.");
        } else {
            this.setStatus('❌ Error processing request. Please try again.', 'error');
            this.addMessage('ai', "I encountered an error processing your request. Please try again.");
        }
    }

    async sendToAI(userMessage, isResponse = false) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    message: userMessage,
                    sessionId: this.sessionId,
                    isResponse: isResponse
                }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error('Request timeout. Please try again.');
            }
            throw error;
        }
    }

    async processQuizResponse(userResponse) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        try {
            const response = await fetch('/api/quiz-response', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    response: userResponse,
                    sessionId: this.sessionId
                }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error('Request timeout. Please try again.');
            }
            throw error;
        }
    }

    async synthesizeSpeech(text) {
        if (!text || text.trim().length === 0) return;

        try {
            // Try backend TTS first
            const response = await fetch('/api/synthesize-speech', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.audioContent) {
                    await this.playAudio(data.audioContent, data.mimeType || 'audio/mpeg');
                    return;
                }
            }
            
            // Fallback to browser TTS
            this.fallbackTTS(text);
            
        } catch (error) {
            console.error('Speech synthesis error:', error);
            this.fallbackTTS(text);
        }
    }

    async playAudio(audioBase64, mimeType) {
        return new Promise((resolve) => {
            try {
                const audio = new Audio(`data:${mimeType};base64,${audioBase64}`);
                audio.onended = resolve;
                audio.onerror = () => {
                    console.log('Audio playback failed, using TTS fallback');
                    resolve();
                };
                audio.play().catch(error => {
                    console.log('Audio play failed:', error);
                    resolve();
                });
            } catch (error) {
                console.error('Audio playback error:', error);
                resolve();
            }
        });
    }

    fallbackTTS(text) {
        if (!('speechSynthesis' in window)) {
            console.warn('Browser TTS not supported');
            return;
        }

        // Cancel any ongoing speech
        speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = this.voiceSpeed;
        utterance.pitch = 1;
        utterance.volume = 0.8;
        
        utterance.onerror = (event) => {
            console.error('TTS Error:', event);
        };
        
        utterance.onend = () => {
            console.log('TTS completed');
        };
        
        speechSynthesis.speak(utterance);
    }

    addMessage(sender, text, imageUrl = null) {
        if (!this.elements.conversationContainer) return;

        // Remove welcome message if it exists
        const welcomeMsg = this.elements.conversationContainer.querySelector('.alert-light');
        if (welcomeMsg) {
            welcomeMsg.remove();
        }

        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        
        let imageHtml = '';
        if (imageUrl && sender === 'ai') {
            console.log('Adding image to message:', imageUrl);
            imageHtml = `<div class="message-image mt-2"><img src="${imageUrl}" alt="Visual aid" class="img-fluid rounded" style="max-width: 300px; max-height: 300px;" onerror="console.error('Image failed to load:', this.src)"></div>`;
        }
        
        messageDiv.innerHTML = `
            <div class="message-sender">${sender === 'user' ? 'You' : 'Tutor'}</div>
            <div class="message-text">${this.escapeHtml(text)}</div>
            ${imageHtml}
            <div class="message-time">${new Date().toLocaleTimeString()}</div>
        `;
        
        this.elements.conversationContainer.appendChild(messageDiv);
        this.scrollToBottom();
    }

    setStatus(message, type = 'info') {
        if (!this.elements.status) return;
        
        this.elements.status.textContent = message;
        this.elements.status.className = `alert alert-${this.getStatusClass(type)}`;
    }

    getStatusClass(type) {
        const statusMap = {
            'info': 'info',
            'success': 'success',
            'error': 'danger',
            'listening': 'info status-listening'
        };
        return statusMap[type] || 'info';
    }

    updateUI(state = 'ready') {
        if (!this.elements.startBtn || !this.elements.stopBtn) return;

        const states = {
            listening: { 
                startDisabled: true, 
                stopDisabled: false,
                startText: '<span class="loading-spinner me-2"></span> Listening...',
                startClass: 'listening'
            },
            ready: { 
                startDisabled: false, 
                stopDisabled: true,
                startText: '<i class="bi bi-mic-fill me-2"></i>Start Learning',
                startClass: ''
            }
        };
        
        const config = states[state] || states.ready;
        
        this.elements.startBtn.disabled = config.startDisabled;
        this.elements.stopBtn.disabled = config.stopDisabled;
        this.elements.startBtn.innerHTML = config.startText;
        this.elements.startBtn.className = `btn btn-success btn-lg px-4 py-3 ${config.startClass}`;
    }

    scrollToBottom() {
        if (!this.elements.conversationContainer) return;
        
        this.elements.conversationContainer.scrollTop = this.elements.conversationContainer.scrollHeight;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    async loadConversationHistory() {
        if (!this.sessionId) return;

        try {
            const response = await fetch(`/api/conversations/${this.sessionId}`);
            if (!response.ok) return;
            
            const data = await response.json();
            
            if (data.conversations && data.conversations.length > 0) {
                // Remove welcome message
                const welcomeMsg = this.elements.conversationContainer?.querySelector('.alert-light');
                if (welcomeMsg) welcomeMsg.remove();
                
                data.conversations.forEach(conv => {
                    this.addMessage('user', conv.user_message);
                    this.addMessage('ai', conv.ai_response);
                    this.lastAIResponse = conv.ai_response;
                });
            }
        } catch (error) {
            console.error('Error loading conversation history:', error);
        }
    }

    async clearConversation() {
        if (!this.elements.conversationContainer) return;
        
        // Clear Mem0 memory
        try {
            await fetch('/api/memory/clear', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId: this.sessionId })
            });
        } catch (error) {
            console.error('Error clearing memory:', error);
        }
        
        this.elements.conversationContainer.innerHTML = `
            <div class="alert alert-light border text-center">
                <i class="bi bi-lightbulb text-warning me-2"></i>
                Start by clicking "Start Learning" and ask your study question!<br>
                <small class="text-muted">VoiceTutor: Conversational AI that goes beyond rigid text responses!</small>
            </div>
        `;
        this.lastAIResponse = '';
        
        // Reset conversation state
        this.conversationState = {
            mode: 'interactive',
            waitingForResponse: false,
            currentTopic: null,
            learningLevel: 'beginner',
            lastQuestion: null
        };
        
        this.setStatus('🧠 Chat and memory cleared. Interactive learning ready!', 'info');
    }

    async checkMemoryStatus() {
        try {
            const response = await fetch(`/api/memory/status/${this.sessionId}`);
            if (response.ok) {
                const data = await response.json();
                const memoryInfo = `🧠 Memory Status: ${data.memory_count} stored memories`;
                this.addMessage('ai', memoryInfo);
                this.setStatus('Memory status checked', 'success');
            } else {
                this.addMessage('ai', '🧠 Memory service not available');
            }
        } catch (error) {
            console.error('Memory check error:', error);
            this.addMessage('ai', '🧠 Error checking memory status');
        }
    }

    // NEW: Get conversation state from server
    async getConversationState() {
        try {
            const response = await fetch(`/api/conversation-state/${this.sessionId}`);
            if (response.ok) {
                const data = await response.json();
                this.conversationState = { ...this.conversationState, ...data.state };
                return data.state;
            }
        } catch (error) {
            console.error('Error getting conversation state:', error);
        }
        return null;
    }

    // NEW: Update learning mode
    async updateLearningMode(mode, learningLevel) {
        try {
            const response = await fetch('/api/update-learning-mode', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId: this.sessionId,
                    mode: mode,
                    learningLevel: learningLevel
                })
            });

            if (response.ok) {
                const data = await response.json();
                this.conversationState = { ...this.conversationState, ...data.state };
                this.setStatus(`Learning mode updated to ${mode} (${learningLevel})`, 'success');
                return data.state;
            }
        } catch (error) {
            console.error('Error updating learning mode:', error);
            this.setStatus('Error updating learning mode', 'error');
        }
        return null;
    }

    // NEW: Reset conversation state
    async resetConversationState() {
        try {
            const response = await fetch('/api/reset-conversation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId: this.sessionId
                })
            });

            if (response.ok) {
                const data = await response.json();
                this.conversationState = data.state;
                this.setStatus('Conversation state reset successfully', 'success');
                return data.state;
            }
        } catch (error) {
            console.error('Error resetting conversation state:', error);
            this.setStatus('Error resetting conversation state', 'error');
        }
        return null;
    }

    startListening() {
        if (!this.recognition || this.isListening || this.isProcessing) return;

        try {
            this.recognition.start();
        } catch (error) {
            console.error('Error starting recognition:', error);
            this.setStatus('Error starting voice recognition. Please try again.', 'error');
        }
    }

    stopListening() {
        if (this.recognition && this.isListening) {
            this.recognition.stop();
        }
    }

    toggleListening() {
        if (this.isListening) {
            this.stopListening();
        } else {
            this.startListening();
        }
    }

    resetInterface() {
        this.isListening = false;
        this.updateUI('ready');
        const readyText = LanguageManager.getUIText('status.ready');
        this.setStatus(`🎯 ${readyText}`, 'info');
    }

    showError(message) {
        this.setStatus(message, 'error');
    }

    // Cleanup method for when the application is destroyed
    destroy() {
        this.stopListening();
        
        if (this.recognition) {
            this.recognition.onstart = null;
            this.recognition.onresult = null;
            this.recognition.onerror = null;
            this.recognition.onend = null;
        }
        
        if ('speechSynthesis' in window) {
            speechSynthesis.cancel();
        }
        
        this.voiceCommandsActive = false;
        this.isProcessing = false;
    }
}

// Initialize the application with error handling
document.addEventListener('DOMContentLoaded', () => {
    try {
        window.voiceTutor = new VoiceTutor();
    } catch (error) {
        console.error('Failed to initialize VoiceTutor:', error);
        // Show user-friendly error message
        const statusElement = document.getElementById('status');
        if (statusElement) {
            statusElement.textContent = 'Failed to initialize application. Please refresh the page.';
            statusElement.className = 'alert alert-danger';
        }
    }
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (window.voiceTutor) {
        window.voiceTutor.destroy();
    }
});