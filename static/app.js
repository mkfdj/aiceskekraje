
document.addEventListener('DOMContentLoaded', () => {
    const chatContainer = document.getElementById('chat-container');
    const chatMessages = document.getElementById('chat-messages');
    const chatInput = document.getElementById('chat-input');
    const chatForm = document.getElementById('chat-form');
    const sendButton = document.getElementById('send-button');
    const expandChatButton = document.getElementById('expand-chat');
    const closeChatButton = document.getElementById('close-chat');
    let lastMessage = '';
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
                    addMessageToChat('bot', 'Prosím počkejte generace zprávy zabrala déle než obvykle');
                }
            }, 15000);

            try {
                const response = await fetch('/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message }),
                });

                if (timeoutReached) return; //Ted to zkusit znovu ais

                clearTimeout(timeoutId);
                clearTimeout(warningTimeoutId); 
                removeTypingAnimation();

                if (response.ok) {
                    const data = await response.json();
                    addMessageToChat('bot', data.response);
                } else {
                    addMessageToChat('bot', 'Omlouvám se ale při generaci odpovědi se objevila chyba prosím zkuste to znovu');
                }
            } catch (error) {
                console.error('Error sending message:', error);
                removeTypingAnimation();
                addMessageToChat('bot', 'Došlo k chybě při odesílání zprávy.');
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
            
            // Attach copy functionality to the new snippet
          //  setTimeout(() => attachCopyFunctionality(), 0); // Ensure DOM updates before attaching            
    
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
