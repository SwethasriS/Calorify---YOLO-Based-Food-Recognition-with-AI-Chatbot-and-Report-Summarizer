from flask import Flask, request, jsonify, render_template, send_file
import openai
import tempfile
import os
from web_app.model import FoodDetectionModel

app = Flask(__name__)

# ===== Chat Configuration =====
openai.api_key = "your-api-key-here"  # Replace with actual key
chat_messages = [{"role": "system", "content": "You are a helpful assistant."}]

# ===== Food Detection Configuration =====
food_model = FoodDetectionModel()

# Temporary storage for processed images
temp_image_path = None

# ===== Routes =====
@app.route("/")
def welcome():
    return render_template("welcome.html")

@app.route("/chat", methods=["POST"])
def chat():
    user_input = request.json["message"]
    chat_messages.append({"role": "user", "content": user_input})

    response = openai.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=chat_messages
    )

    reply = response.choices[0].message.content
    chat_messages.append({"role": "assistant", "content": reply})
    return jsonify({"reply": reply})

@app.route("/detect", methods=["POST"])
def detect_food():
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400
        
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
        
    try:
        # Process image using FoodDetectionModel
        global temp_image_path
        _, upload_path = tempfile.mkstemp(suffix=".jpg")
        file.save(upload_path)
        
        temp_image_path, detected_foods = food_model.detect_foods(upload_path)
        os.unlink(upload_path)
        
        # Format results for API response
        food_items = [{'name': food, 'confidence': 1.0} for food in detected_foods]
        return jsonify({'food_items': food_items})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route("/processed_image")
def serve_image():
    if temp_image_path and os.path.exists(temp_image_path):
        return send_file(temp_image_path, mimetype="image/jpeg")
    return "No image processed yet", 404

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=8000, debug=True)
