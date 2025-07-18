# app.py
from flask import Flask, request, jsonify, render_template
import openai

app = Flask(__name__)

openai.api_key = os.getenv("OPENAI_API_KEY")
# Replace with your actual key

messages = [{"role": "system", "content": "You are a helpful assistant."}]

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/chat", methods=["POST"])
def chat():
    user_input = request.json["message"]
    messages.append({"role": "user", "content": user_input})

    response = openai.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=messages
    )

    reply = response.choices[0].message.content
    messages.append({"role": "assistant", "content": reply})
    return jsonify({"reply": reply})

if __name__ == "__main__":
    app.run(debug=True, port=5002)

