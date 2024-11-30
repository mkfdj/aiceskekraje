from flask import Flask, request, jsonify, send_from_directory, session
from flask_cors import CORS
from g4f.client import Client
import uuid
import time

# Flask app setup
app = Flask(__name__, static_url_path='', static_folder='static')
app.secret_key = "your_secret_key"  # Required for session handling
CORS(app)  # Enable CORS for development/testing

# Initialize g4f client
client = Client()

# In-memory storage for chat history
user_histories = {}

# Maximum token limit for context
MAX_TOKENS = 3000

# Predefined expert-level context to guide the assistant in Czech
EXPERT_CONTEXT = """
Jste odborný asistent zaměřený na Českou republiku a její kraje. Poskytujete formální a odborné odpovědi o českých krajích, jejich historii, geografii a správním členění. Vaše odpovědi by měly být informativní, jasné a strukturované. Když mluvím o konkrétních krajích, popište jejich hlavní města, významné geografické body, ekonomiku a kulturní dědictví.
"""

@app.route('/')
def index():
    return send_from_directory('static', 'index.html')

def trim_history_for_tokens(history, max_tokens):
    """
    Trims the chat history to fit within the token limit.
    Assumes each message is approximately 75 tokens on average.
    """
    token_count = sum(len(msg["content"].split()) for msg in history)
    while token_count > max_tokens:
        history.pop(0)
        token_count = sum(len(msg["content"].split()) for msg in history)
    return history

@app.route('/chat', methods=['POST'])
def chat():
    try:
        # Ensure the user has a unique session ID
        if 'user_id' not in session:
            session['user_id'] = str(uuid.uuid4())

        user_id = session['user_id']
        user_message = request.json.get('message')

        if not user_message:
            return jsonify({"error": "Please send a valid message."}), 400

        # Retrieve or initialize user's chat history
        history = user_histories.setdefault(user_id, [])
        history.append({"role": "user", "content": user_message})

        # Prepend expert context to the history
        history.insert(0, {"role": "system", "content": EXPERT_CONTEXT})

        # Tokenize and trim history if necessary
        history = trim_history_for_tokens(history, MAX_TOKENS)

        # Simulate "thinking" cursor
        time.sleep(0.1)

        # Send request to g4f with user's history
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=history
        )

        if hasattr(response, 'choices') and len(response.choices) > 0:
            bot_message = response.choices[0].message.content
            history.append({"role": "assistant", "content": bot_message})  # Save bot response
            return jsonify({"response": bot_message}), 200
        else:
            # Simulate a retry mechanism after 5 seconds
            time.sleep(0)
            return jsonify({"error": "Timeout. Please try again."}), 408

    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"error": "Internal server error."}), 500

@app.route('/history', methods=['GET'])
def get_history():
    """Fetch the user's chat history."""
    if 'user_id' not in session:
        return jsonify({"error": "No history available."}), 400

    user_id = session['user_id']
    history = user_histories.get(user_id, [])
    return jsonify({"history": history}), 200

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('static', path)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
