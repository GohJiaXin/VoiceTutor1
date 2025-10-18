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
        
        // DOM Elements
        this.elements = {
            startBtn: document.getElementById('startBtn'),
            stopBtn: document.getElementById('stopBtn'),
            status: document.getElementById('status'),
            conversationContainer: document.getElementById('conversationContainer'),
            sessionId: document.getElementById('sessionId'),
            clearChat: document.getElementById('clearChat'),
            languageSelect: document.getElementById('languageSelect')
        };
        
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

    startQuiz() {
        const quizQuestions = [
            {
                question: "What's the main topic we've been discussing?",
                options: ["Mathematics", "Programming", "Science", "History"],
                answer: 1
            },
            {
                question: "Which voice command shows available options?",
                options: ["repeat", "help", "example", "quiz"],
                answer: 1
            }
        ];
        
        const randomQuestion = quizQuestions[Math.floor(Math.random() * quizQuestions.length)];
        const quizText = `🎯 **Quiz Time!**\n\n**Question:** ${randomQuestion.question}\n\nOptions:\nA) ${randomQuestion.options[0]}\nB) ${randomQuestion.options[1]}\nC) ${randomQuestion.options[2]}\nD) ${randomQuestion.options[3]}\n\n*Say your answer (A, B, C, or D)!*`;
        
        this.addMessage('ai', quizText);
        this.setStatus('🤔 Waiting for your quiz answer...', 'info');
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
            // If not a command, process as regular question
            this.addMessage('user', transcript);
            const processingText = LanguageManager.getUIText('status.processing');
            this.setStatus(`🤔 ${processingText}`, 'info');
            this.isProcessing = true;

            try {
                const response = await this.sendToAI(transcript);
                this.lastAIResponse = response.response;
                this.addMessage('ai', response.response);
                await this.synthesizeSpeech(response.response);
                const successText = LanguageManager.getUIText('status.success');
                this.setStatus(`✅ ${successText}`, 'success');
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

    async sendToAI(userMessage) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    message: userMessage,
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
        utterance.rate = 0.9;
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

    addMessage(sender, text) {
        if (!this.elements.conversationContainer) return;

        // Remove welcome message if it exists
        const welcomeMsg = this.elements.conversationContainer.querySelector('.alert-light');
        if (welcomeMsg) {
            welcomeMsg.remove();
        }

        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        messageDiv.innerHTML = `
            <div class="message-sender">${sender === 'user' ? 'You' : 'Tutor'}</div>
            <div class="message-text">${this.escapeHtml(text)}</div>
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

    clearConversation() {
        if (!this.elements.conversationContainer) return;
        
        this.elements.conversationContainer.innerHTML = `
            <div class="alert alert-light border text-center">
                <i class="bi bi-lightbulb text-warning me-2"></i>
                Start by clicking "Start Learning" and ask your study question!
            </div>
        `;
        this.lastAIResponse = '';
        this.setStatus('Chat cleared. Ready to continue!', 'info');
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