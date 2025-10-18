/**
 * Multi-language support for VoiceTutor
 * Language configuration and translations
 */

const LANGUAGES = {
    'en-US': {
        name: 'English (US)',
        flag: '🇺🇸',
        voiceCommands: {
            'help': 'Show available voice commands',
            'repeat': 'Repeat the last explanation',
            'explain differently': 'Rephrase the concept',
            'give me an example': 'Get practical examples',
            'quiz me': 'Start interactive quiz',
            'clear chat': 'Clear conversation history',
            'stop listening': 'Stop voice recognition',
            'start learning': 'Begin new learning session',
            'pause': 'Pause current speech',
            'resume': 'Resume paused speech'
        },
        ui: {
            title: 'VoiceTutor - AI Learning Assistant',
            startLearning: 'Start Learning',
            stop: 'Stop',
            clearChat: 'Clear Chat',
            status: {
                ready: 'Ready to help you learn!',
                listening: 'Listening... Speak now!',
                processing: 'Processing your question...',
                success: 'Ready for your next question!',
                error: 'Error processing request. Please try again.'
            },
            commands: {
                title: 'Voice Commands',
                available: 'Available Commands:',
                tips: 'Tips:',
                tip1: 'Speak clearly and at a normal pace',
                tip2: 'Ask specific questions for better answers',
                tip3: 'Use voice commands for quick actions',
                tip4: 'Works best in Chrome browser'
            }
        }
    },
    'es-ES': {
        name: 'Español (España)',
        flag: '🇪🇸',
        voiceCommands: {
            'ayuda': 'Mostrar comandos de voz disponibles',
            'repetir': 'Repetir la última explicación',
            'explica diferente': 'Reformular el concepto',
            'dame un ejemplo': 'Obtener ejemplos prácticos',
            'hazme un quiz': 'Iniciar quiz interactivo',
            'limpiar chat': 'Limpiar historial de conversación',
            'dejar de escuchar': 'Detener reconocimiento de voz',
            'empezar a aprender': 'Comenzar nueva sesión de aprendizaje',
            'pausar': 'Pausar el discurso actual',
            'reanudar': 'Reanudar discurso pausado'
        },
        ui: {
            title: 'VoiceTutor - Asistente de Aprendizaje IA',
            startLearning: 'Comenzar Aprendizaje',
            stop: 'Detener',
            clearChat: 'Limpiar Chat',
            status: {
                ready: '¡Listo para ayudarte a aprender!',
                listening: 'Escuchando... ¡Habla ahora!',
                processing: 'Procesando tu pregunta...',
                success: '¡Listo para tu siguiente pregunta!',
                error: 'Error procesando la solicitud. Por favor intenta de nuevo.'
            },
            commands: {
                title: 'Comandos de Voz',
                available: 'Comandos Disponibles:',
                tips: 'Consejos:',
                tip1: 'Habla claramente y a un ritmo normal',
                tip2: 'Haz preguntas específicas para mejores respuestas',
                tip3: 'Usa comandos de voz para acciones rápidas',
                tip4: 'Funciona mejor en Chrome'
            }
        }
    },
    'fr-FR': {
        name: 'Français (France)',
        flag: '🇫🇷',
        voiceCommands: {
            'aide': 'Afficher les commandes vocales disponibles',
            'répète': 'Répéter la dernière explication',
            'explique différemment': 'Reformuler le concept',
            'donne-moi un exemple': 'Obtenir des exemples pratiques',
            'fais-moi un quiz': 'Commencer un quiz interactif',
            'effacer le chat': 'Effacer l\'historique de conversation',
            'arrêter d\'écouter': 'Arrêter la reconnaissance vocale',
            'commencer à apprendre': 'Commencer une nouvelle session d\'apprentissage',
            'pause': 'Mettre en pause le discours actuel',
            'reprendre': 'Reprendre le discours en pause'
        },
        ui: {
            title: 'VoiceTutor - Assistant d\'Apprentissage IA',
            startLearning: 'Commencer l\'Apprentissage',
            stop: 'Arrêter',
            clearChat: 'Effacer le Chat',
            status: {
                ready: 'Prêt à vous aider à apprendre !',
                listening: 'Écoute... Parlez maintenant !',
                processing: 'Traitement de votre question...',
                success: 'Prêt pour votre prochaine question !',
                error: 'Erreur lors du traitement. Veuillez réessayer.'
            },
            commands: {
                title: 'Commandes Vocales',
                available: 'Commandes Disponibles :',
                tips: 'Conseils :',
                tip1: 'Parlez clairement et à un rythme normal',
                tip2: 'Posez des questions spécifiques pour de meilleures réponses',
                tip3: 'Utilisez les commandes vocales pour des actions rapides',
                tip4: 'Fonctionne mieux avec Chrome'
            }
        }
    },
    'de-DE': {
        name: 'Deutsch (Deutschland)',
        flag: '🇩🇪',
        voiceCommands: {
            'hilfe': 'Verfügbare Sprachbefehle anzeigen',
            'wiederholen': 'Letzte Erklärung wiederholen',
            'anders erklären': 'Konzept umformulieren',
            'gib mir ein beispiel': 'Praktische Beispiele erhalten',
            'quiz mich': 'Interaktives Quiz starten',
            'chat löschen': 'Gesprächsverlauf löschen',
            'hör auf zuzuhören': 'Spracherkennung stoppen',
            'lernen beginnen': 'Neue Lernsession beginnen',
            'pausieren': 'Aktuelle Sprache pausieren',
            'fortsetzen': 'Pausierte Sprache fortsetzen'
        },
        ui: {
            title: 'VoiceTutor - KI-Lernassistent',
            startLearning: 'Lernen Starten',
            stop: 'Stoppen',
            clearChat: 'Chat Löschen',
            status: {
                ready: 'Bereit, Ihnen beim Lernen zu helfen!',
                listening: 'Höre zu... Sprechen Sie jetzt!',
                processing: 'Verarbeite Ihre Frage...',
                success: 'Bereit für Ihre nächste Frage!',
                error: 'Fehler bei der Verarbeitung. Bitte versuchen Sie es erneut.'
            },
            commands: {
                title: 'Sprachbefehle',
                available: 'Verfügbare Befehle:',
                tips: 'Tipps:',
                tip1: 'Sprechen Sie klar und in normalem Tempo',
                tip2: 'Stellen Sie spezifische Fragen für bessere Antworten',
                tip3: 'Verwenden Sie Sprachbefehle für schnelle Aktionen',
                tip4: 'Funktioniert am besten mit Chrome'
            }
        }
    },
    'zh-CN': {
        name: '中文 (简体)',
        flag: '🇨🇳',
        voiceCommands: {
            '帮助': '显示可用的语音命令',
            '重复': '重复最后的解释',
            '换个方式解释': '重新表述概念',
            '给我一个例子': '获取实际例子',
            '给我出题': '开始互动测验',
            '清空聊天': '清除对话历史',
            '停止监听': '停止语音识别',
            '开始学习': '开始新的学习会话',
            '暂停': '暂停当前语音',
            '继续': '恢复暂停的语音'
        },
        ui: {
            title: 'VoiceTutor - AI学习助手',
            startLearning: '开始学习',
            stop: '停止',
            clearChat: '清空聊天',
            status: {
                ready: '准备帮助您学习！',
                listening: '正在聆听...请现在说话！',
                processing: '正在处理您的问题...',
                success: '准备回答您的下一个问题！',
                error: '处理请求时出错。请重试。'
            },
            commands: {
                title: '语音命令',
                available: '可用命令：',
                tips: '提示：',
                tip1: '清晰且以正常语速说话',
                tip2: '提出具体问题以获得更好的答案',
                tip3: '使用语音命令进行快速操作',
                tip4: '在Chrome浏览器中效果最佳'
            }
        }
    }
};

// Language utility functions
const LanguageManager = {
    currentLanguage: 'en-US',
    
    setLanguage(langCode) {
        if (LANGUAGES[langCode]) {
            this.currentLanguage = langCode;
            localStorage.setItem('voiceTutorLanguage', langCode);
            this.updateUI();
            return true;
        }
        return false;
    },
    
    getCurrentLanguage() {
        return LANGUAGES[this.currentLanguage];
    },
    
    getSupportedLanguages() {
        return Object.keys(LANGUAGES).map(code => ({
            code,
            ...LANGUAGES[code]
        }));
    },
    
    getVoiceCommands() {
        return this.getCurrentLanguage().voiceCommands;
    },
    
    getUIText(key) {
        const lang = this.getCurrentLanguage();
        const keys = key.split('.');
        let value = lang.ui;
        
        for (const k of keys) {
            value = value?.[k];
        }
        
        return value || key;
    },
    
    updateUI() {
        // Update page title
        document.title = this.getUIText('title');
        
        // Update main elements
        const elements = {
            startBtn: document.getElementById('startBtn'),
            stopBtn: document.getElementById('stopBtn'),
            clearChat: document.getElementById('clearChat'),
            status: document.getElementById('status'),
            commandsTitle: document.querySelector('.card h6'),
            commandsList: document.querySelector('.list-unstyled'),
            tipsTitle: document.querySelectorAll('.card h6')[1],
            tipsList: document.querySelectorAll('.card ul')[1]
        };
        
        if (elements.startBtn) {
            elements.startBtn.innerHTML = `<i class="bi bi-mic-fill me-2"></i>${this.getUIText('startLearning')}`;
        }
        
        if (elements.stopBtn) {
            elements.stopBtn.innerHTML = `<i class="bi bi-stop-fill me-2"></i>${this.getUIText('stop')}`;
        }
        
        if (elements.clearChat) {
            elements.clearChat.innerHTML = `<i class="bi bi-trash me-2"></i>${this.getUIText('clearChat')}`;
        }
        
        if (elements.status) {
            elements.status.textContent = this.getUIText('status.ready');
        }
        
        // Update voice commands section
        if (elements.commandsTitle) {
            elements.commandsTitle.textContent = this.getUIText('commands.title');
        }
        
        if (elements.commandsList) {
            const commands = this.getVoiceCommands();
            elements.commandsList.innerHTML = Object.entries(commands)
                .map(([cmd, desc]) => `<li><kbd>"${cmd}"</kbd> - ${desc}</li>`)
                .join('');
        }
        
        // Update tips section
        if (elements.tipsTitle) {
            elements.tipsTitle.textContent = this.getUIText('commands.tips');
        }
        
        if (elements.tipsList) {
            elements.tipsList.innerHTML = `
                <li>${this.getUIText('commands.tip1')}</li>
                <li>${this.getUIText('commands.tip2')}</li>
                <li>${this.getUIText('commands.tip3')}</li>
                <li>${this.getUIText('commands.tip4')}</li>
            `;
        }
    },
    
    initialize() {
        // Load saved language or default to browser language
        const savedLang = localStorage.getItem('voiceTutorLanguage');
        const browserLang = navigator.language || navigator.languages[0];
        
        if (savedLang && LANGUAGES[savedLang]) {
            this.setLanguage(savedLang);
        } else if (LANGUAGES[browserLang]) {
            this.setLanguage(browserLang);
        } else {
            // Fallback to English
            this.setLanguage('en-US');
        }
    }
};

// Initialize language manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    LanguageManager.initialize();
});
