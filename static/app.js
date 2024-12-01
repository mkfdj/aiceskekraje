document.addEventListener('DOMContentLoaded', () => {
    const chatContainer = document.getElementById('chat-container');
    const chatMessages = document.getElementById('chat-messages');
    const chatInput = document.getElementById('chat-input');
    const chatForm = document.getElementById('chat-form');
    const sendButton = document.getElementById('send-button');
    const expandChatButton = document.getElementById('expand-chat');
    const closeChatButton = document.getElementById('close-chat');
    let lastMessage = '';
    
    // Generate a random access code for each session
    const generateRandomCode = () => Math.random().toString(36).substr(2, 10);
    let userCode = sessionStorage.getItem('user_code') || generateRandomCode();
    sessionStorage.setItem('user_code', userCode); // Store in sessionStorage

    expandChatButton.addEventListener('click', () => {
        chatContainer.classList.add('expanded');
        expandChatButton.classList.add('hidden');
    });

    closeChatButton.addEventListener('click', () => {
        chatContainer.classList.remove('expanded');
        expandChatButton.classList.remove('hidden');
    });

    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('copy-button')) {
            const codeSnippet = e.target.closest('.code-snippet');
            const codeElement = codeSnippet.querySelector('code');
            
            if (codeElement) {
                const code = codeElement.textContent; // Get the text
                navigator.clipboard.writeText(code).then(() => {
                    alert('Code copied to clipboard!');
                }).catch(() => {
                    alert('Failed to copy code to clipboard.');
                });
            } else {
                console.error('Code element not found!');
            }
        }
    });
    
    sendButton.addEventListener('click', async () => {
        const message = chatInput.value.trim();
        if (message) {
            lastMessage = message;
            addMessageToChat('user', message);
            chatInput.value = '';
            addTypingAnimation();
    
            const MAX_RETRIES = 3; // Maximum number of retries
            let retryCount = 0; // Retry counter
            let timeoutReached = false;
    
            const showRetryButtons = () => {
                removeTypingAnimation();
                const messageElement = document.createElement('div');
                messageElement.className = 'message bot';
                messageElement.innerHTML = `
                    <p>Čas vypršel. Zkusit znovu nebo smazat chat?</p>
                    <button id="retry-button">Zkusit znovu</button>
                    <button id="clear-button">Smazat</button>
                `;
                chatMessages.appendChild(messageElement);
                chatMessages.scrollTop = chatMessages.scrollHeight;
    
                document.getElementById('retry-button').addEventListener('click', () => {
                    messageElement.remove();
                    retryMessage();
                });
                document.getElementById('clear-button').addEventListener('click', () => {
                    chatMessages.innerHTML = '';
                });
            };
    
            const timeoutId = setTimeout(() => {
                timeoutReached = true;
                showRetryButtons();
            }, 20000);
    
            const warningTimeoutId = setTimeout(() => {
                if (!timeoutReached) {
                    addMessageToChat('bot', 'Prosím počkejte, generace zprávy zabrala déle než obvykle.');
                }
            }, 15000);
    
            while (retryCount < MAX_RETRIES) {
                try {
                    const response = await fetch('https://aiceskekraje.vercel.app/chat', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ message, user_code: userCode }),
                    });
    
                    if (timeoutReached) return;
    
                    clearTimeout(timeoutId);
                    clearTimeout(warningTimeoutId);
                    removeTypingAnimation();
    
                    if (response.ok) {
                        const data = await response.json();
                        addMessageToChat('bot', data.response);
                        return; // Exit on success
                    } else {
                        console.warn(`Retrying... Attempt ${retryCount + 1}`);
                        retryCount++;
                    }
                } catch (error) {
                    console.error(`Error sending message: ${error}`);
                    retryCount++;
                    if (retryCount >= MAX_RETRIES) {
                        removeTypingAnimation();
                        addMessageToChat(
                            'bot',
                            'Došlo k chybě při odesílání zprávy. Prosím zkuste to znovu.'
                        );
                    }
                }
            }
        }
    });
    
    function addMessageToChat(role, content) {
        const messageElement = document.createElement('div');
        messageElement.className = `message ${role}`;
    
        const parsedContent = parseMessageContent(content);
        messageElement.appendChild(parsedContent);
    
        chatMessages.appendChild(messageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    function parseMessageContent(content) {
        const messageFragment = document.createDocumentFragment();
    
        // Regex patterns
        const codePattern = /```([\s\S]*?)```/g; // Matches ```...```
        const headerPattern = /##(.+?)##/g; // Matches ###...###
        const boldPattern = /\*\*(.+?)\*\*/g; // Matches ***...***
    
        let lastIndex = 0;
    
        // Replace code blocks
        let match;
        while ((match = codePattern.exec(content)) !== null) {
            // Append preceding text
            if (lastIndex < match.index) {
                const text = content.substring(lastIndex, match.index);
                messageFragment.appendChild(document.createTextNode(text));
            }
    
            // Create a code snippet
            const codeSnippet = document.getElementById('code-snippet-template').content.cloneNode(true);
            codeSnippet.querySelector('code').textContent = match[1]; // Add code content
            messageFragment.appendChild(codeSnippet);
            lastIndex = codePattern.lastIndex;
        }
    
        // Append remaining content after code blocks
        if (lastIndex < content.length) {
            content = content.substring(lastIndex);
    
            // Replace headers
            content = content.replace(headerPattern, (_, headerText) => {
                const headerElement = document.getElementById('header-template').content.cloneNode(true);
                headerElement.querySelector('.header').textContent = headerText.trim();
                messageFragment.appendChild(headerElement);
                return '';
            });
    
            // Replace bold-black text
            content = content.replace(boldPattern, (_, boldText) => {
                const boldElement = document.getElementById('bold-black-template').content.cloneNode(true);
                boldElement.querySelector('.bold-black').textContent = boldText.trim();
                messageFragment.appendChild(boldElement);
                return '';
            });
    
            // Add any remaining plain text
            if (content.trim()) {
                messageFragment.appendChild(document.createTextNode(content));
            }
        }
    
        return messageFragment;
    }

    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async function addTypingAnimation() {
        const typingElement = document.createElement('div');
        typingElement.className = 'message bot typing';
        chatMessages.appendChild(typingElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        let keepTyping = true;

        const animateTyping = async () => {
            while (keepTyping) {
                typingElement.textContent = '.';
                await delay(500);
                typingElement.textContent = '..';
                await delay(500);
                typingElement.textContent = '...';
                await delay(500);
            }
        };

        animateTyping();

        typingElement.cleanup = () => {
            keepTyping = false;
            typingElement.remove();
        };
    }

    function removeTypingAnimation() {
        const typingElement = chatMessages.querySelector('.typing');
        if (typingElement && typeof typingElement.cleanup === 'function') {
            typingElement.cleanup();
        }
    }

    function retryMessage() {
        chatInput.value = lastMessage;
        sendButton.click();
    }
});
