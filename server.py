from flask import Flask, request, jsonify
import os

app = Flask(__name__)

@app.route('/detect', methods=['POST'])
def detect_food():
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400
        
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
        
    # Save the file temporarily
    filename = os.path.join('uploads', file.filename)
    file.save(filename)
    
    # Here you would normally call your food detection model
    # For now we'll just return a mock response
    return jsonify({
        'food_items': [
            {'name': 'Apple', 'calories': 52, 'confidence': 0.92},
            {'name': 'Chapathi', 'calories': 68, 'confidence': 0.85},
            {'name': 'Chicken Gravy', 'calories': 150, 'confidence': 0.88},
            {'name': 'Fries', 'calories': 312, 'confidence': 0.90},
            {'name': 'Idli', 'calories': 58, 'confidence': 0.87},
            {'name': 'Pizza', 'calories': 285, 'confidence': 0.91},
            {'name': 'Rice', 'calories': 130, 'confidence': 0.89},
            {'name': 'Soda', 'calories': 140, 'confidence': 0.93},
            {'name': 'Tomato', 'calories': 18, 'confidence': 0.86},
            {'name': 'Vada', 'calories': 133, 'confidence': 0.84},
            {'name': 'Banana', 'calories': 89, 'confidence': 0.87},
            {'name': 'Burger', 'calories': 295, 'confidence': 0.90}
        ],
        'image_url': filename
    })

if __name__ == '__main__':
    os.makedirs('uploads', exist_ok=True)
    app.run(port=5000, debug=True)
