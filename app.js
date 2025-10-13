// Configuration
const GOOGLE_CLIENT_ID = '37355855536-n1pdonbkg3lb3s6psq938jk81hgjnebe.apps.googleusercontent.com';
const API_BASE_URL = 'https://musical-suitably-woodcock.ngrok-free.app';

// State
let currentUser = null;
let sessionToken = null;
let chatHistoryData = [];
let currentPage = 1;
let currentMode = 'search';
let currentAnswerText = '';
let currentChatId = null;
let searchStartTime = null;

// Voice Recognition State
let recognition = null;
let isRecording = false;
let selectedLanguage = 'en-US';

// Text-to-Speech State
let speechSynthesis = window.speechSynthesis;
let currentUtterance = null;
let isSpeaking = false;
let availableVoices = [];

// Enhanced Voice Preferences for Native Speakers
const VOICE_PREFERENCES = {
    'en-US': ['Google US English', 'Microsoft David', 'Alex', 'Samantha'],
    'hi-IN': ['Google हिन्दी', 'Microsoft Hemant', 'Lekha', 'Swara Hindi'],
    'ta-IN': ['Google தமிழ்', 'Microsoft Heera', 'Veena Tamil', 'Google Tamil'],
    'te-IN': ['Google తెలుగు', 'Microsoft Chitra', 'Swara Telugu'],
    'kn-IN': ['Google ಕನ್ನಡ', 'Microsoft Hemant', 'Swara Kannada'],
    'ml-IN': ['Google മലയാളം', 'Microsoft Heera', 'Veena Malayalam'],
    'mr-IN': ['Google मराठी', 'Microsoft Hemant', 'Swara Marathi'],
    'gu-IN': ['Google ગુજરાતી', 'Microsoft Hemant', 'Swara Gujarati'],
    'bn-IN': ['Google বাংলা', 'Microsoft Hemant', 'Swara Bengali'],
    'pa-IN': ['Google ਪੰਜਾਬੀ', 'Microsoft Hemant', 'Swara Punjabi'],
    'es-ES': ['Google español', 'Monica', 'Diego'],
    'fr-FR': ['Google français', 'Thomas', 'Amelie'],
    'de-DE': ['Google Deutsch', 'Anna', 'Stefan'],
    'ja-JP': ['Google 日本語', 'Kyoko', 'Otoya'],
    'zh-CN': ['Google 普通话', 'Ting-Ting', 'Sin-Ji'],
    'ar-SA': ['Google العربية', 'Tarik', 'Maged']
};

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Content Loaded');
    console.log('Google API available?', typeof google !== 'undefined');
    
    // Check if elements exist
    console.log('google-signin-button exists?', document.getElementById('google-signin-button') !== null);
    console.log('google-signin-container exists?', document.getElementById('google-signin-container') !== null);
    
    setupEventListeners();
    initializeVoiceRecognition();
    loadVoices();
    
    // Initialize Google Sign-In with delay to ensure script is loaded
    setTimeout(function() {
        initializeGoogleSignIn();
    }, 500);
    
    if (typeof marked !== 'undefined') {
        marked.setOptions({
            breaks: true,
            gfm: true,
            headerIds: false,
            mangle: false
        });
    }
});

function setupEventListeners() {
    document.getElementById('sign-out-btn').addEventListener('click', signOut);
    document.getElementById('refresh-history-btn').addEventListener('click', refreshChatHistory);
    document.getElementById('search-button').addEventListener('click', performSearch);
    document.getElementById('question-input').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') performSearch();
    });
    document.getElementById('department-select').addEventListener('change', function() {
        updateSubjectOptions();
        checkCourseSelection();
    });
    document.getElementById('semester-select').addEventListener('change', checkCourseSelection);
    document.getElementById('subject-select').addEventListener('change', checkCourseSelection);
    document.getElementById('load-more-history-btn').addEventListener('click', function() {
        loadChatMessages(currentPage + 1, true);
    });
    
    // Voice button
    document.getElementById('voice-btn').addEventListener('click', toggleVoiceRecognition);
    
    // Language selector
    document.getElementById('language-select').addEventListener('change', function(e) {
        selectedLanguage = e.target.value;
        if (recognition) {
            recognition.lang = selectedLanguage;
        }
        showNotification('Language changed to ' + e.target.options[e.target.selectedIndex].text, 'success', 2000);
    });
}

// ==================== VOICE LOADING ====================
function loadVoices() {
    if (speechSynthesis) {
        // Load immediately if available
        availableVoices = speechSynthesis.getVoices();
        if (availableVoices.length > 0) {
            console.log('✅ Voices loaded:', availableVoices.length, 'voices available');
            logAvailableVoices();
        }
        
        // Also listen for voices changed event
        speechSynthesis.onvoiceschanged = function() {
            availableVoices = speechSynthesis.getVoices();
            console.log('✅ Voices updated:', availableVoices.length, 'voices available');
            logAvailableVoices();
        };
    }
}

function logAvailableVoices() {
    console.log('\n=== Available Voices by Language ===');
    const voicesByLang = {};
    
    availableVoices.forEach(voice => {
        if (!response.ok) {
            throw new Error('Failed to submit feedback');
        }

        const result = await response.json();
        
        let message = 'Thank you for your feedback!';
        if (feedbackType === 'like') {
            message = '👍 Thanks! Glad we could help!';
        } else if (feedbackType === 'dislike') {
            message = '👎 Feedback noted. We\'ll improve!';
        } else if (feedbackType === 'report') {
            message = '🚩 Issue reported. We\'ll review it!';
        }
        
        showNotification(message, 'success', 2000);
    } catch (error) {
        console.error('Feedback error:', error);
        showNotification('Failed to submit feedback', 'error');
        
        likeBtn.classList.remove('active-like');
        dislikeBtn.classList.remove('active-dislike');
        reportBtn.classList.remove('active-report');
    } finally {
        likeBtn.disabled = false;
        dislikeBtn.disabled = false;
        reportBtn.disabled = false;
    }
}

// ==================== UI HELPERS ====================
function showNotification(message, type, duration) {
    type = type || 'info';
    duration = duration || 3000;
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = 'notification ' + type;
    notification.classList.add('show');
    setTimeout(function() {
        notification.classList.remove('show');
    }, duration);
}

function showUserProfile(user) {
    document.getElementById('user-profile').classList.add('show');
    document.getElementById('user-avatar').src = user.picture;
    document.getElementById('user-name').textContent = user.name;
    document.getElementById('user-email').textContent = user.email;
    document.getElementById('search-count').textContent = user.searchCount || 0;
    
    const signInContainer = document.getElementById('google-signin-container');
    if (signInContainer) {
        signInContainer.style.display = 'none';
    }
}

function showSearchSection() {
    document.getElementById('auth-required').style.display = 'none';
    document.getElementById('main-layout').style.display = 'flex';
}

async function signOut() {
    try {
        showNotification('Signing out...', 'info');
        if (sessionToken) {
            await fetch(API_BASE_URL + '/auth/logout', {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + sessionToken,
                    'ngrok-skip-browser-warning': 'true'
                }
            });
        }
        clearUserSession();
        showNotification('Signed out', 'success');
    } catch (error) {
        console.error('Sign out error:', error);
        clearUserSession();
    }
}

function clearUserSession() {
    currentUser = null;
    sessionToken = null;
    currentAnswerText = '';
    localStorage.removeItem('currentUser');
    localStorage.removeItem('sessionToken');
    document.getElementById('user-profile').classList.remove('show');
    document.getElementById('auth-required').style.display = 'block';
    document.getElementById('main-layout').style.display = 'none';
    
    const signInContainer = document.getElementById('google-signin-container');
    if (signInContainer) {
        signInContainer.style.display = 'flex';
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ==================== CHAT HISTORY ====================
async function loadChatHistory() {
    if (!currentUser) return;
    await loadChatMessages();
}

async function loadChatMessages(page, append) {
    page = page || 1;
    append = append || false;
    try {
        const response = await fetch(API_BASE_URL + '/user/chat-history?page=' + page + '&limit=20', {
            headers: {
                'Authorization': 'Bearer ' + sessionToken,
                'ngrok-skip-browser-warning': 'true'
            }
        });
        if (!response.ok) return;
        const data = await response.json();
        if (!append) {
            chatHistoryData = data.chatHistory || [];
        } else {
            chatHistoryData = chatHistoryData.concat(data.chatHistory || []);
        }
        displayChatHistory();
    } catch (error) {
        console.error('Chat history error:', error);
    }
}

function displayChatHistory() {
    const historyGrid = document.getElementById('chat-history-grid');
    if (chatHistoryData.length === 0) {
        historyGrid.innerHTML = '<div class="no-chat-history"><p>No history yet</p></div>';
        return;
    }
    const historyHTML = chatHistoryData.map(function(msg) {
        return '<div class="chat-message-item" onclick="rerunSearch(\'' + escapeHtml(msg.question) + '\')">' +
            '<div class="chat-question">' + escapeHtml(msg.question) + '</div>' +
            '<div class="chat-answer">' + escapeHtml(msg.answer.substring(0, 100)) + '...</div>' +
            '<div class="chat-message-meta"><span>' + new Date(msg.timestamp).toLocaleDateString() + '</span></div>' +
        '</div>';
    }).join('');
    historyGrid.innerHTML = historyHTML;
}

async function refreshChatHistory() {
    await loadChatHistory();
    showNotification('Refreshed', 'success', 1500);
}

function rerunSearch(question) {
    document.getElementById('question-input').value = question;
    performSearch();
}

// ==================== QUESTION BANK ====================
function checkCourseSelection() {
    const department = document.getElementById('department-select').value;
    const semester = document.getElementById('semester-select').value;
    const subject = document.getElementById('subject-select').value;
    if (department && semester && subject) {
        displayUnitsSection(department, semester, subject);
    }
}

function updateSubjectOptions() {
    const department = document.getElementById('department-select').value;
    const subjectSelect = document.getElementById('subject-select');
    subjectSelect.innerHTML = '<option value="">Select Subject</option>';
    if (department === 'computer-science') {
        subjectSelect.innerHTML += '<option value="intro-programming">Introduction to Programming</option><option value="data-structures">Data Structures</option>';
    } else if (department === 'mathematics') {
        subjectSelect.innerHTML += '<option value="calculus-1">Calculus I</option>';
    } else if (department === 'chemistry') {
        subjectSelect.innerHTML += '<option value="organic-chem">Organic Chemistry</option>';
    }
}

function displayUnitsSection(department, semester, subject) {
    const unitsGrid = document.getElementById('units-grid');
    const courseInfo = document.getElementById('selected-course');
    
    courseInfo.textContent = department.replace(/-/g, ' ').toUpperCase() + ' - Semester ' + semester + ' - ' + subject.replace(/-/g, ' ').toUpperCase();
    
    // Sample question bank data
    const questionBankData = {
        'computer-science': {
            'intro-programming': [
                {
                    unit: 'Introduction to Programming',
                    icon: '💻',
                    sections: [
                        {
                            type: '2 Mark Questions',
                            questions: [
                                { 
                                    text: 'What is a variable in programming?', 
                                    marks: 2,
                                    answer: 'A variable is a named storage location in memory that holds a value. It has a name (identifier) and a data type that determines what kind of data it can store. Variables can be modified during program execution.<br><br><strong>Example:</strong><div class="code-block-wrapper"><div class="code-block-header">💻 Python</div><pre><code>age = 25          # Integer variable\nname = "John"     # String variable\nheight = 5.8      # Float variable</code></pre></div>'
                                },
                                { 
                                    text: 'Explain the difference between int and float data types', 
                                    marks: 2,
                                    answer: '<strong>int (Integer):</strong> Stores whole numbers without decimal points (e.g., 5, -10, 100).<br><br><strong>float (Floating-point):</strong> Stores numbers with decimal points (e.g., 3.14, -0.5, 2.0).<br><br>Integers take less memory and operations are faster, while floats provide precision for decimal calculations.<br><br><strong>Example:</strong><div class="code-block-wrapper"><div class="code-block-header">💻 Python</div><pre><code>count = 42        # int\nprice = 19.99     # float\ntemp = -5         # int\npi = 3.14159      # float</code></pre></div>'
                                },
                                { 
                                    text: 'Write a program to implement a simple calculator', 
                                    marks: 10,
                                    answer: '<strong>Simple Calculator Program:</strong><br><br>This program asks for two numbers and an operator, then calculates the answer. It prevents division by zero errors.<div class="code-block-wrapper"><div class="code-block-header">💻 Python - Simple Calculator</div><pre><code>print("Simple Calculator")\n\n# Get user inputs\na = float(input("Enter first number: "))\nop = input("Choose operator (+, -, *, /): ").strip()\nb = float(input("Enter second number: "))\n\n# Perform calculation\nif op == \'+\':\n    result = a + b\nelif op == \'-\':\n    result = a - b\nelif op == \'*\':\n    result = a * b\nelif op == \'/\':\n    if b == 0:\n        print("Error: Cannot divide by zero")\n        result = None\n    else:\n        result = a / b\nelse:\n    print("Invalid operator")\n    result = None\n\n# Display result\nif result is not None:\n    print(f"Result: {result}")</code></pre></div><br><strong>Features:</strong><ul><li>Takes two numbers as input</li><li>Performs basic arithmetic operations (+, -, *, /)</li><li>Handles division by zero error</li><li>Validates operator input</li><li>Displays formatted result</li></ul><br><strong>Example Usage:</strong><br>Input: a=12, b=3, operator="/" → Output: Result: 4.0'
                                }
                            ]
                        }
                    ]
                }
            ]
        },
        'mathematics': {
            'calculus-1': [
                {
                    unit: 'Limits & Continuity',
                    icon: '∞',
                    sections: [
                        {
                            type: '2 Mark Questions',
                            questions: [
                                { 
                                    text: 'Define limit of a function', 
                                    marks: 2,
                                    answer: 'A limit describes the value that a function approaches as the input approaches some value. Mathematically: lim(x→a) f(x) = L means as x gets closer to a, f(x) gets closer to L.'
                                }
                            ]
                        }
                    ]
                }
            ]
        },
        'chemistry': {
            'organic-chem': [
                {
                    unit: 'Basic Concepts',
                    icon: '🧪',
                    sections: [
                        {
                            type: '2 Mark Questions',
                            questions: [
                                { 
                                    text: 'What is organic chemistry?', 
                                    marks: 2,
                                    answer: 'Organic chemistry is the branch of chemistry that studies carbon-containing compounds and their properties, structure, composition, reactions, and synthesis.'
                                }
                            ]
                        }
                    ]
                }
            ]
        }
    };
    
    const units = questionBankData[department]?.[subject] || [];
    
    if (units.length === 0) {
        unitsGrid.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--gray);"><p>📚 No questions available yet for this course.</p></div>';
        return;
    }
    
    let unitsHTML = '';
    units.forEach((unit, unitIndex) => {
        const unitId = 'unit-' + unitIndex;
        unitsHTML += '<div class="unit-card">';
        unitsHTML += '<div class="unit-header" id="header-' + unitId + '" onclick="toggleUnit(\'' + unitId + '\')">';
        unitsHTML += '<h3 class="unit-title"><span class="unit-icon">' + unit.icon + '</span>' + unit.unit + '</h3>';
        unitsHTML += '<button class="unit-toggle" id="toggle-' + unitId + '">+</button>';
        unitsHTML += '</div>';
        unitsHTML += '<div class="unit-content" id="' + unitId + '">';
        
        unit.sections.forEach((section, sectionIndex) => {
            unitsHTML += '<div class="question-section">';
            unitsHTML += '<div class="question-section-header">';
            unitsHTML += '<span class="question-type-title">' + section.type + '</span>';
            unitsHTML += '<span class="question-count">' + section.questions.length + ' Questions</span>';
            unitsHTML += '</div>';
            unitsHTML += '<div class="questions-list">';
            
            section.questions.forEach((q, qIndex) => {
                const questionId = 'q-' + unitIndex + '-' + sectionIndex + '-' + qIndex;
                unitsHTML += '<div class="question-item">';
                unitsHTML += '<div class="question-header" id="header-' + questionId + '" onclick="toggleQuestion(\'' + questionId + '\')">';
                unitsHTML += '<div class="question-left">';
                unitsHTML += '<span class="question-number">' + (qIndex + 1) + '</span>';
                unitsHTML += '<div class="question-text">' + q.text + '</div>';
                unitsHTML += '</div>';
                unitsHTML += '<div class="question-right">';
                unitsHTML += '<span class="mark-badge">' + q.marks + ' Marks</span>';
                unitsHTML += '<button class="question-toggle" id="toggle-' + questionId + '">+</button>';
                unitsHTML += '</div>';
                unitsHTML += '</div>';
                
                unitsHTML += '<div class="question-answer" id="' + questionId + '">';
                unitsHTML += '<div class="answer-content">';
                unitsHTML += '<div class="answer-label">📝 Answer:</div>';
                unitsHTML += '<div class="answer-text">' + q.answer + '</div>';
                unitsHTML += '</div>';
                unitsHTML += '</div>';
                
                unitsHTML += '</div>';
            });
            
            unitsHTML += '</div>';
            unitsHTML += '</div>';
        });
        
        unitsHTML += '</div>';
        unitsHTML += '</div>';
    });
    
    unitsGrid.innerHTML = unitsHTML;
}

function toggleUnit(unitId) {
    const unitContent = document.getElementById(unitId);
    const unitHeader = document.getElementById('header-' + unitId);
    const toggleBtn = document.getElementById('toggle-' + unitId);
    
    if (unitContent.classList.contains('show')) {
        unitContent.classList.remove('show');
        unitHeader.classList.remove('active');
        toggleBtn.textContent = '+';
    } else {
        unitContent.classList.add('show');
        unitHeader.classList.add('active');
        toggleBtn.textContent = '−';
    }
}

function toggleQuestion(questionId) {
    const questionAnswer = document.getElementById(questionId);
    const questionHeader = document.getElementById('header-' + questionId);
    const toggleBtn = document.getElementById('toggle-' + questionId);
    
    if (questionAnswer.classList.contains('show')) {
        questionAnswer.classList.remove('show');
        questionHeader.classList.remove('active');
        toggleBtn.textContent = '+';
    } else {
        questionAnswer.classList.add('show');
        questionHeader.classList.add('active');
        toggleBtn.textContent = '−';
    }
}

// Make functions globally accessible
window.switchMode = switchMode;
window.copyCurrentAnswer = copyCurrentAnswer;
window.submitFeedback = submitFeedback;
window.rerunSearch = rerunSearch;
window.toggleUnit = toggleUnit;
window.toggleQuestion = toggleQuestion;
window.speakText = speakText;voicesByLang[voice.lang]) {
            voicesByLang[voice.lang] = [];
        }
        voicesByLang[voice.lang].push(voice.name);
    });
    
    // Log Indian languages specifically
    ['hi-IN', 'ta-IN', 'te-IN', 'kn-IN', 'ml-IN', 'mr-IN', 'gu-IN', 'bn-IN', 'pa-IN'].forEach(lang => {
        if (voicesByLang[lang]) {
            console.log(`${lang}: ${voicesByLang[lang].join(', ')}`);
        }
    });
    console.log('=====================================\n');
}

// ==================== VOICE RECOGNITION ====================
function initializeVoiceRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
        console.warn('Speech recognition not supported in this browser');
        document.getElementById('voice-btn').disabled = true;
        document.getElementById('voice-btn').title = 'Voice input not supported in this browser';
        return;
    }
    
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = selectedLanguage;
    recognition.maxAlternatives = 1;
    
    recognition.onstart = function() {
        isRecording = true;
        document.getElementById('voice-btn').classList.add('recording');
        showVoiceStatus('Listening... Speak now', 'listening');
    };
    
    recognition.onresult = function(event) {
        let interimTranscript = '';
        let finalTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
                finalTranscript += transcript;
            } else {
                interimTranscript += transcript;
            }
        }
        
        if (interimTranscript) {
            document.getElementById('question-input').value = finalTranscript + interimTranscript;
        }
        
        if (finalTranscript) {
            document.getElementById('question-input').value = finalTranscript;
            showVoiceStatus('Voice input received!', 'processing');
            setTimeout(hideVoiceStatus, 2000);
        }
    };
    
    recognition.onerror = function(event) {
        console.error('Speech recognition error:', event.error);
        isRecording = false;
        document.getElementById('voice-btn').classList.remove('recording');
        
        let errorMessage = 'Voice input error';
        switch(event.error) {
            case 'no-speech':
                errorMessage = 'No speech detected. Please try again.';
                break;
            case 'audio-capture':
                errorMessage = 'Microphone not found or not accessible.';
                break;
            case 'not-allowed':
                errorMessage = 'Microphone permission denied.';
                break;
            case 'network':
                errorMessage = 'Network error. Please check your connection.';
                break;
            default:
                errorMessage = 'Voice input error: ' + event.error;
        }
        
        showNotification(errorMessage, 'error');
        hideVoiceStatus();
    };
    
    recognition.onend = function() {
        isRecording = false;
        document.getElementById('voice-btn').classList.remove('recording');
        hideVoiceStatus();
    };
}

function toggleVoiceRecognition() {
    if (!recognition) {
        showNotification('Voice recognition not supported', 'error');
        return;
    }
    
    if (isRecording) {
        recognition.stop();
        isRecording = false;
        document.getElementById('voice-btn').classList.remove('recording');
        hideVoiceStatus();
    } else {
        recognition.lang = selectedLanguage;
        
        try {
            recognition.start();
        } catch (error) {
            console.error('Error starting recognition:', error);
            showNotification('Could not start voice input', 'error');
        }
    }
}

function showVoiceStatus(text, type) {
    const voiceStatus = document.getElementById('voice-status');
    const voiceStatusText = document.getElementById('voice-status-text');
    
    voiceStatusText.textContent = text;
    voiceStatus.className = 'voice-status show ' + type;
}

function hideVoiceStatus() {
    const voiceStatus = document.getElementById('voice-status');
    voiceStatus.classList.remove('show');
}

// ==================== ENHANCED TEXT-TO-SPEECH WITH NATIVE VOICES ====================
function speakText(text) {
    if (isSpeaking) {
        stopSpeaking();
        return;
    }
    
    if (!speechSynthesis) {
        showNotification('Text-to-speech not supported in this browser', 'error');
        return;
    }
    
    // Ensure voices are loaded
    if (availableVoices.length === 0) {
        availableVoices = speechSynthesis.getVoices();
    }
    
    let cleanText = cleanTextForSpeech(text, selectedLanguage);
    
    if (!cleanText) {
        showNotification('No text to read', 'error');
        return;
    }
    
    currentUtterance = new SpeechSynthesisUtterance(cleanText);
    currentUtterance.lang = selectedLanguage;
    
    // Find best native voice
    const selectedVoice = findBestNativeVoice(availableVoices, selectedLanguage);
    if (selectedVoice) {
        currentUtterance.voice = selectedVoice;
        console.log('🔊 Using voice:', selectedVoice.name, 'for language:', selectedLanguage);
    } else {
        console.warn('⚠️ No native voice found for:', selectedLanguage);
        showNotification('Using default voice for ' + getLanguageName(selectedLanguage), 'info', 3000);
    }
    
    // Adjust speech properties for better naturalness
    currentUtterance.rate = 0.85;  // Slightly slower for clarity
    currentUtterance.pitch = 1.0;
    currentUtterance.volume = 1.0;
    
    currentUtterance.onstart = function() {
        isSpeaking = true;
        const speakerBtn = document.getElementById('speaker-btn');
        if (speakerBtn) {
            speakerBtn.classList.add('speaking');
            speakerBtn.innerHTML = '⏸️ Stop';
        }
        showNotification('Reading in ' + getLanguageName(selectedLanguage), 'info', 2000);
    };
    
    currentUtterance.onend = function() {
        isSpeaking = false;
        const speakerBtn = document.getElementById('speaker-btn');
        if (speakerBtn) {
            speakerBtn.classList.remove('speaking');
            speakerBtn.innerHTML = '🔊 Read Aloud';
        }
    };
    
    currentUtterance.onerror = function(event) {
        console.error('Speech synthesis error:', event);
        isSpeaking = false;
        const speakerBtn = document.getElementById('speaker-btn');
        if (speakerBtn) {
            speakerBtn.classList.remove('speaking');
            speakerBtn.innerHTML = '🔊 Read Aloud';
        }
        
        let errorMsg = 'Error reading text';
        if (event.error === 'language-not-supported') {
            errorMsg = 'Language not supported: ' + getLanguageName(selectedLanguage);
        }
        showNotification(errorMsg, 'error');
    };
    
    speechSynthesis.speak(currentUtterance);
}

function findBestNativeVoice(voices, targetLang) {
    if (!voices || voices.length === 0) return null;
    
    console.log(`🔍 Searching for voice for: ${targetLang}`);
    
    const targetLangBase = targetLang.split('-')[0];
    const preferences = VOICE_PREFERENCES[targetLang] || [];
    
    // Strategy 1: Try preferred voices by name (prioritize Google and native voices)
    for (let prefName of preferences) {
        const voice = voices.find(v => 
            v.name.includes(prefName) && 
            (v.lang === targetLang || v.lang.startsWith(targetLangBase))
        );
        if (voice) {
            console.log(`✅ Found preferred voice: ${voice.name}`);
            return voice;
        }
    }
    
    // Strategy 2: Find any Google voice for the language
    const googleVoice = voices.find(v => 
        v.name.toLowerCase().includes('google') && 
        (v.lang === targetLang || v.lang.startsWith(targetLangBase))
    );
    if (googleVoice) {
        console.log(`✅ Found Google voice: ${googleVoice.name}`);
        return googleVoice;
    }
    
    // Strategy 3: Exact language match
    const exactMatch = voices.find(v => v.lang === targetLang);
    if (exactMatch) {
        console.log(`✅ Found exact match: ${exactMatch.name}`);
        return exactMatch;
    }
    
    // Strategy 4: Base language match (e.g., 'ta' matches 'ta-IN')
    const baseMatch = voices.find(v => {
        const voiceLangBase = v.lang.split('-')[0];
        return voiceLangBase === targetLangBase;
    });
    if (baseMatch) {
        console.log(`✅ Found base language match: ${baseMatch.name}`);
        return baseMatch;
    }
    
    // Strategy 5: Search by language name in voice name
    const langName = getLanguageName(targetLang).toLowerCase();
    const nameMatch = voices.find(v => 
        v.name.toLowerCase().includes(langName) ||
        v.name.toLowerCase().includes(targetLangBase)
    );
    if (nameMatch) {
        console.log(`✅ Found name match: ${nameMatch.name}`);
        return nameMatch;
    }
    
    console.log(`⚠️ No suitable voice found, using default`);
    return voices[0];
}

function cleanTextForSpeech(text, language) {
    if (!text) return '';
    
    let cleanText = text;
    
    // Remove math expressions
    cleanText = cleanText.replace(/\\\[[\s\S]*?\\\]/g, '');
    cleanText = cleanText.replace(/\\\([\s\S]*?\\\)/g, '');
    
    // Remove HTML tags but keep content
    cleanText = cleanText.replace(/<[^>]*>/g, ' ');
    
    // Remove markdown symbols
    cleanText = cleanText.replace(/[#*_`~]/g, '');
    
    // Remove code blocks
    cleanText = cleanText.replace(/```[\s\S]*?```/g, ' ');
    cleanText = cleanText.replace(/`[^`]*`/g, ' ');
    
    // Remove URLs
    cleanText = cleanText.replace(/https?:\/\/[^\s]+/g, '');
    
    // Normalize whitespace
    cleanText = cleanText.replace(/\n+/g, ' ');
    cleanText = cleanText.replace(/\s+/g, ' ');
    
    // For Indian languages, preserve special characters
    const indianLangs = ['hi-IN', 'ta-IN', 'te-IN', 'kn-IN', 'ml-IN', 'mr-IN', 'gu-IN', 'bn-IN', 'pa-IN'];
    if (indianLangs.includes(language)) {
        // Keep Indian script characters (Devanagari, Tamil, Telugu, etc.)
        cleanText = cleanText.replace(/[^\u0900-\u097F\u0980-\u09FF\u0A00-\u0A7F\u0A80-\u0AFF\u0B00-\u0B7F\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\u0D80-\u0DFF\u0E00-\u0E7F\w\s.,!?;:()-]/g, '');
    } else {
        cleanText = cleanText.replace(/[^\w\s.,!?;:()-]/g, '');
    }
    
    return cleanText.trim();
}

function stopSpeaking() {
    if (speechSynthesis) {
        speechSynthesis.cancel();
    }
    isSpeaking = false;
    const speakerBtn = document.getElementById('speaker-btn');
    if (speakerBtn) {
        speakerBtn.classList.remove('speaking');
        speakerBtn.innerHTML = '🔊 Read Aloud';
    }
}

function getLanguageName(langCode) {
    const languageNames = {
        'en-US': 'English',
        'hi-IN': 'Hindi',
        'ta-IN': 'Tamil',
        'te-IN': 'Telugu',
        'kn-IN': 'Kannada',
        'ml-IN': 'Malayalam',
        'mr-IN': 'Marathi',
        'gu-IN': 'Gujarati',
        'bn-IN': 'Bengali',
        'pa-IN': 'Punjabi',
        'es-ES': 'Spanish',
        'fr-FR': 'French',
        'de-DE': 'German',
        'ja-JP': 'Japanese',
        'zh-CN': 'Chinese',
        'ar-SA': 'Arabic'
    };
    return languageNames[langCode] || langCode;
}

// ==================== MODE SWITCHING ====================
function switchMode(mode) {
    currentMode = mode;
    document.getElementById('ai-search-mode').classList.toggle('active', mode === 'search');
    document.getElementById('question-bank-mode').classList.toggle('active', mode === 'questions');
    document.getElementById('search-section').classList.toggle('show', mode === 'search');
    document.getElementById('units-container').classList.toggle('show', mode === 'questions');
    document.getElementById('course-selection-panel').classList.toggle('show', mode === 'questions');
    showNotification((mode === 'search' ? 'AI Search' : 'Question Bank') + ' mode activated', 'success');
    if (mode === 'questions') checkCourseSelection();
}

// ==================== GOOGLE SIGN-IN ====================
function initializeGoogleSignIn() {
    console.log('🔄 Initializing Google Sign-In...');
    console.log('Google object available?', typeof google !== 'undefined');
    
    if (typeof google === 'undefined') {
        console.log('⏳ Google API not loaded yet, retrying in 200ms...');
        setTimeout(initializeGoogleSignIn, 200);
        return;
    }

    console.log('✅ Google API loaded');
    
    try {
        // Check if button element exists
        const signInButton = document.getElementById("google-signin-button");
        const signInContainer = document.getElementById("google-signin-container");
        
        console.log('Button element:', signInButton);
        console.log('Container element:', signInContainer);
        
        if (!signInButton) {
            console.error('❌ google-signin-button element not found in DOM');
            return;
        }

        console.log('🔧 Initializing Google Identity Services...');
        
        google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleCredentialResponse,
            auto_select: false,
            cancel_on_tap_outside: true
        });

        console.log('🎨 Rendering sign-in button...');
        
        google.accounts.id.renderButton(
            signInButton,
            { 
                theme: "outline", 
                size: "large",
                text: "signin_with",
                shape: "rectangular",
                logo_alignment: "left"
            }
        );
        
        console.log('✅ Google Sign-In button rendered successfully');

        // Check for saved session
        const savedToken = localStorage.getItem('sessionToken');
        const savedUser = localStorage.getItem('currentUser');
        
        if (savedToken && savedUser) {
            console.log('🔐 Found saved session, auto-signing in...');
            sessionToken = savedToken;
            currentUser = JSON.parse(savedUser);
            showUserProfile(currentUser);
            showSearchSection();
            loadChatHistory();
        } else {
            console.log('📝 No saved session found - user needs to sign in');
        }
    } catch (error) {
        console.error('❌ Error initializing Google Sign-In:', error);
        console.error('Error details:', error.message);
        console.error('Error stack:', error.stack);
    }
}

async function handleCredentialResponse(response) {
    try {
        showNotification('Signing you in...', 'info');
        const userInfo = parseJwt(response.credential);
        const authResult = await authenticateWithBackend({
            id: userInfo.sub,
            email: userInfo.email,
            name: userInfo.name,
            picture: userInfo.picture
        });
        
        currentUser = authResult.user;
        sessionToken = authResult.sessionToken;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        localStorage.setItem('sessionToken', sessionToken);
        showUserProfile(currentUser);
        showSearchSection();
        loadChatHistory();
        showNotification('Welcome ' + currentUser.name + '!', 'success');
    } catch (error) {
        console.error('Sign-in error:', error);
        showNotification('Failed to sign in', 'error');
    }
}

function parseJwt(token) {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => 
        '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
    ).join(''));
    return JSON.parse(jsonPayload);
}

async function authenticateWithBackend(googleUserData) {
    const response = await fetch(API_BASE_URL + '/auth/google', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({ googleUserData })
    });
    if (!response.ok) throw new Error('Auth failed');
    return await response.json();
}

// ==================== SEARCH ====================
async function performSearch() {
    if (!currentUser) {
        showNotification('Please sign in first', 'error');
        return;
    }
    
    const question = document.getElementById('question-input').value.trim();
    if (!question) {
        showNotification('Please enter a question', 'error');
        return;
    }
    
    const resultsContainer = document.getElementById('results-container');
    const resultsContent = document.getElementById('results-content');
    const searchBtn = document.getElementById('search-button');
    
    resultsContainer.classList.add('show');
    resultsContent.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
    searchBtn.disabled = true;
    searchBtn.textContent = 'Searching...';
    
    searchStartTime = Date.now();
    
    try {
        const response = await fetch(API_BASE_URL + '/rag', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json', 
                'ngrok-skip-browser-warning': 'true',
                'Authorization': 'Bearer ' + sessionToken
            },
            body: JSON.stringify({ question: question, limit: 5, threshold: 0.75 })
        });
        
        if (!response.ok) throw new Error('API error');
        
        const data = await response.json();
        
        const responseTime = ((Date.now() - searchStartTime) / 1000).toFixed(2);
        
        currentChatId = data.chatId || null;
        
        displayResults(data, responseTime);
        
        if (currentUser) {
            currentUser.searchCount = (currentUser.searchCount || 0) + 1;
            document.getElementById('search-count').textContent = currentUser.searchCount;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
        }
        
        await refreshChatHistory();
        document.getElementById('question-input').value = '';
    } catch (error) {
        console.error('Error:', error);
        resultsContent.innerHTML = '<div class="no-results"><p>Error: ' + error.message + '</p></div>';
        showNotification('Search failed', 'error');
    } finally {
        searchBtn.disabled = false;
        searchBtn.textContent = 'Search';
    }
}

function displayResults(data, responseTime) {
    const resultsContent = document.getElementById('results-content');
    const resultsCount = document.getElementById('results-count');
    
    if (!data.answer) {
        resultsContent.innerHTML = '<div class="no-results"><p>No information found</p></div>';
        resultsCount.textContent = '';
        return;
    }
    
    currentAnswerText = data.answer;
    
    const originalQuestion = document.getElementById('question-input').value || 'Your question';
    
    let confidenceClass = 'confidence-low';
    let confidenceText = 'Low';
    if (data.confidence >= 0.8) {
        confidenceClass = 'confidence-high';
        confidenceText = 'High';
    } else if (data.confidence >= 0.5) {
        confidenceClass = 'confidence-medium';
        confidenceText = 'Medium';
    }
    
    const cacheIndicator = data.cached ? 
        '<span class="cache-indicator cache-hit">Cached</span>' : 
        '<span class="cache-indicator">Live</span>';
    
    const responseTimeDisplay = responseTime ? 
        '<span class="response-time">⏱️ ' + responseTime + 's</span>' : '';
    
    const formattedAnswer = formatMarkdownContent(data.answer);
    
    const resultHtml = '<div class="result-card">' +
        '<div class="result-question">' +
            '<div class="result-question-label">Question</div>' +
            '<div class="result-question-text">' + escapeHtml(originalQuestion) + '</div>' +
        '</div>' +
        '<h3 class="result-title">AI Answer</h3>' +
        '<div class="result-meta">' +
            '<span class="confidence-badge ' + confidenceClass + '">' + confidenceText + ' (' + (data.confidence * 100).toFixed(1) + '%)</span>' +
            cacheIndicator +
            responseTimeDisplay +
        '</div>' +
        '<div class="formatted-content">' + formattedAnswer + '</div>' +
        '<div class="result-actions">' +
            '<button class="speaker-btn" id="speaker-btn" onclick="speakText(currentAnswerText)">🔊 Read Aloud</button>' +
            '<button class="action-btn" onclick="copyCurrentAnswer()">📋 Copy</button>' +
            '<button class="feedback-btn" id="like-btn" onclick="submitFeedback(\'like\')">👍 Like</button>' +
            '<button class="feedback-btn" id="dislike-btn" onclick="submitFeedback(\'dislike\')">👎 Dislike</button>' +
            '<button class="feedback-btn" id="report-btn" onclick="submitFeedback(\'report\')">🚩 Report</button>' +
        '</div>' +
    '</div>';
    
    resultsContent.innerHTML = resultHtml;
    resultsCount.textContent = '1 result';
    
    renderMathJax(resultsContent);
}

function renderMathJax(element) {
    console.log('Starting MathJax render attempt...');
    
    function tryRender(attempts) {
        if (attempts > 100) {
            console.error('❌ MathJax not loaded after 10 seconds');
            return;
        }
        
        if (window.MathJax && window.MathJax.typesetPromise) {
            console.log('✅ MathJax found! Starting typeset...');
            
            MathJax.typesetPromise([element]).then(function() {
                console.log('✅ MathJax equations rendered successfully!');
            }).catch(function(err) {
                console.error('❌ MathJax rendering error:', err);
            });
        } else {
            if (attempts % 10 === 0) {
                console.log('Waiting for MathJax... attempt', attempts);
            }
            setTimeout(function() {
                tryRender(attempts + 1);
            }, 100);
        }
    }
    
    tryRender(0);
}

function formatMarkdownContent(markdown) {
    if (!markdown) return '';
    
    let html = markdown;
    
    html = html.replace(/\\\[\s*([\s\S]*?)\s*\\\]/g, function(match, content) {
        return '<div class="math-display">\\[' + content + '\\]</div>';
    });
    
    html = html.replace(/^\\\[$/gm, '<div class="math-display">\\[');
    html = html.replace(/^\\\]$/gm, '\\]</div>');
    
    html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
    
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*([^*]+?)\*/g, '<em>$1</em>');
    
    let lines = html.split('\n');
    let inList = false;
    let processedLines = [];
    
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        
        if (line.match(/^[\s]*[-*]\s+/) && !line.includes('math-display')) {
            if (!inList) {
                processedLines.push('<ul>');
                inList = true;
            }
            line = '<li>' + line.replace(/^[\s]*[-*]\s+/, '') + '</li>';
        } else {
            if (inList) {
                processedLines.push('</ul>');
                inList = false;
            }
        }
        
        processedLines.push(line);
    }
    
    if (inList) {
        processedLines.push('</ul>');
    }
    
    html = processedLines.join('\n');
    
    let parts = html.split(/<div class="math-display">[\s\S]*?<\/div>/g);
    let mathBlocks = html.match(/<div class="math-display">[\s\S]*?<\/div>/g) || [];
    
    let result = [];
    for (let i = 0; i < parts.length; i++) {
        let part = parts[i];
        part = part.replace(/\n\n+/g, '</p><p>');
        part = '<p>' + part + '</p>';
        part = part.replace(/\n/g, '<br>');
        part = part.replace(/<p><\/p>/g, '');
        part = part.replace(/<p><br>/g, '<p>');
        result.push(part);
        
        if (mathBlocks[i]) {
            result.push(mathBlocks[i]);
        }
    }
    
    html = result.join('');
    
    return html;
}

function copyCurrentAnswer() {
    if (!currentAnswerText) {
        showNotification('No answer to copy', 'error');
        return;
    }
    navigator.clipboard.writeText(currentAnswerText).then(function() {
        showNotification('Copied!', 'success', 2000);
    }).catch(function() {
        showNotification('Copy failed', 'error');
    });
}

async function submitFeedback(feedbackType) {
    if (!currentChatId) {
        showNotification('No chat session found', 'error');
        return;
    }

    if (!sessionToken) {
        showNotification('Please sign in to submit feedback', 'error');
        return;
    }

    const likeBtn = document.getElementById('like-btn');
    const dislikeBtn = document.getElementById('dislike-btn');
    const reportBtn = document.getElementById('report-btn');

    likeBtn.classList.remove('active-like');
    dislikeBtn.classList.remove('active-dislike');
    reportBtn.classList.remove('active-report');

    if (feedbackType === 'like') {
        likeBtn.classList.add('active-like');
    } else if (feedbackType === 'dislike') {
        dislikeBtn.classList.add('active-dislike');
    } else if (feedbackType === 'report') {
        reportBtn.classList.add('active-report');
    }

    likeBtn.disabled = true;
    dislikeBtn.disabled = true;
    reportBtn.disabled = true;

    try {
        const response = await fetch(API_BASE_URL + '/feedback', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + sessionToken,
                'ngrok-skip-browser-warning': 'true'
            },
            body: JSON.stringify({
                chatId: currentChatId,
                feedbackType: feedbackType,
                timestamp: new Date().toISOString()
            })
        });

        if (!
