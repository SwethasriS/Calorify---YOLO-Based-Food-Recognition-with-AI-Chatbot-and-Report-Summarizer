import os
import cv2
import tempfile
from flask import Flask, render_template, request, send_file, jsonify, url_for
from flask_cors import CORS
from ultralytics import YOLO
import logging

app = Flask(__name__)

# Create a logger
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# Create a file handler and a stream handler
file_handler = logging.FileHandler('app.log')
stream_handler = logging.StreamHandler()

# Create a formatter and add it to the handlers
formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
file_handler.setFormatter(formatter)
stream_handler.setFormatter(formatter)

# Add the handlers to the logger
logger.addHandler(file_handler)
logger.addHandler(stream_handler)

# Load YOLO model with error handling
try:
    model_path = "D:/success/model/best.pt"
    if not os.path.exists(model_path):
        raise FileNotFoundError(f"Model file not found at {model_path}")
    model = YOLO(model_path)
    logger.info("YOLO model loaded successfully")
except Exception as e:
    logger.error(f"Error loading YOLO model: {str(e)}")
    model = None


# Base calorie information (per standard portion)
calorie_info = {
    'Apple': {'calories': 52, 'default_weight': 100},        # per 100g
    'Chapathi': {'calories': 68, 'default_weight': 100},     # per piece
    'Chicken Gravy': {'calories': 150, 'default_weight': 100}, # per 100g
    'Fries': {'calories': 312, 'default_weight': 100},       # per 100g
    'Idli': {'calories': 58, 'default_weight': 100},         # per piece
    'Pizza': {'calories': 285, 'default_weight': 100},       # per slice
    'Rice': {'calories': 130, 'default_weight': 100},        # per 100g
    'Soda': {'calories': 140, 'default_weight': 330},        # per can (330ml)
    'Tomato': {'calories': 18, 'default_weight': 100},       # per 100g
    'Vada': {'calories': 133, 'default_weight': 100},        # per piece
    'banana': {'calories': 89, 'default_weight': 100},       # per 100g
    'burger': {'calories': 295, 'default_weight': 100}       # per piece
}

# Extended calorie database
extended_calorie_info = {
    # Fruits
    
    # --- Indian Dishes ---
    'Biryani': {'calories': 290, 'default_weight': 100},
    'Butter Chicken': {'calories': 290, 'default_weight': 100},
    'Paneer Butter Masala': {'calories': 260, 'default_weight': 100},
    'Chole Bhature': {'calories': 450, 'default_weight': 100},
    'Rajma': {'calories': 120, 'default_weight': 100},
    'Aloo Paratha': {'calories': 250, 'default_weight': 100},
    'Palak Paneer': {'calories': 180, 'default_weight': 100},
    'Dosa': {'calories': 165, 'default_weight': 100},
    'Idli': {'calories': 58, 'default_weight': 100},
    'Samosa': {'calories': 262, 'default_weight': 100},
    'Pav Bhaji': {'calories': 240, 'default_weight': 100},
    'Dal Tadka': {'calories': 140, 'default_weight': 100},
    'Kofta Curry': {'calories': 210, 'default_weight': 100},
    'Tandoori Chicken': {'calories': 195, 'default_weight': 100},
    'Vegetable Pulao': {'calories': 130, 'default_weight': 100},
    'Masala Dosa': {'calories': 210, 'default_weight': 100},
    'Kadhi': {'calories': 120, 'default_weight': 100},
    'Mutter Paneer': {'calories': 220, 'default_weight': 100},
    'Naan': {'calories': 270, 'default_weight': 100},
    'Poori': {'calories': 300, 'default_weight': 100},
    'Rasgulla': {'calories': 186, 'default_weight': 100},
    'Gulab Jamun': {'calories': 316, 'default_weight': 100},
    'Kheer': {'calories': 150, 'default_weight': 100},
    'Halwa': {'calories': 250, 'default_weight': 100},
    'Bhindi Fry': {'calories': 110, 'default_weight': 100},
    'Aloo Gobi': {'calories': 120, 'default_weight': 100},
    'Upma': {'calories': 110, 'default_weight': 100},
    'Pesarattu': {'calories': 120, 'default_weight': 100},
    'Baingan Bharta': {'calories': 140, 'default_weight': 100},
    'Chicken Curry': {'calories': 240, 'default_weight': 100},

    # --- Tamil Nadu Dishes ---
    'Sambar': {'calories': 80, 'default_weight': 100},
    'Rasam': {'calories': 30, 'default_weight': 100},
    'Kootu': {'calories': 120, 'default_weight': 100},
    'Poriyal': {'calories': 90, 'default_weight': 100},
    'Vatha Kuzhambu': {'calories': 110, 'default_weight': 100},
    'Pongal': {'calories': 150, 'default_weight': 100},
    'Avial': {'calories': 130, 'default_weight': 100},
    'Thayir Sadam': {'calories': 100, 'default_weight': 100},
    'Paruppu': {'calories': 105, 'default_weight': 100},
    'Kara Kuzhambu': {'calories': 125, 'default_weight': 100},
    'Idiyappam': {'calories': 180, 'default_weight': 100},
    'Sevai': {'calories': 120, 'default_weight': 100},
    'Kuzhi Paniyaram': {'calories': 140, 'default_weight': 100},
    'Murukku': {'calories': 450, 'default_weight': 100},
    'Adai': {'calories': 160, 'default_weight': 100},
    'Appam': {'calories': 140, 'default_weight': 100},
    'Vegetable Kurma': {'calories': 160, 'default_weight': 100},
    'Masala Vadai': {'calories': 200, 'default_weight': 100},
    'Medu Vadai': {'calories': 110, 'default_weight': 100},
    'Sundal': {'calories': 120, 'default_weight': 100},

    # --- Chinese Dishes ---
    'Fried Rice': {'calories': 215, 'default_weight': 100},
    'Veg Noodles': {'calories': 170, 'default_weight': 100},
    'Chicken Manchurian': {'calories': 210, 'default_weight': 100},
    'Gobi Manchurian': {'calories': 190, 'default_weight': 100},
    'Hakka Noodles': {'calories': 190, 'default_weight': 100},
    'Spring Roll': {'calories': 240, 'default_weight': 100},
    'Dim Sum': {'calories': 110, 'default_weight': 100},
    'Schezwan Fried Rice': {'calories': 250, 'default_weight': 100},
    'Sweet and Sour Chicken': {'calories': 220, 'default_weight': 100},
    'Kung Pao Chicken': {'calories': 195, 'default_weight': 100},
    'Chilli Paneer': {'calories': 210, 'default_weight': 100},
    'Egg Fried Rice': {'calories': 210, 'default_weight': 100},
    'Chow Mein': {'calories': 200, 'default_weight': 100},
    'Tofu Stir Fry': {'calories': 170, 'default_weight': 100},
    'Hot and Sour Soup': {'calories': 90, 'default_weight': 100},
    'Wonton': {'calories': 120, 'default_weight': 100},
    'Chicken Lollipop': {'calories': 220, 'default_weight': 100},
    'Peking Duck': {'calories': 337, 'default_weight': 100},
    'Mapo Tofu': {'calories': 190, 'default_weight': 100},
    'Egg Roll': {'calories': 250, 'default_weight': 100},

}

# Function to calculate calories for a specific food and weight
def calculate_calories(food_name, weight):
    # First check if food exists in calorie_info
    if food_name in calorie_info:
        calories_per_100g = calorie_info[food_name]['calories']
        return (calories_per_100g * weight) / 100
    # If not in primary database, check extended database
    elif food_name in extended_calorie_info:
        calories_per_100g = extended_calorie_info[food_name]['calories']
        return (calories_per_100g * weight) / 100
    # If not found in either, return a default value
    else:
        return 150 * (weight / 100)  # Using a default of 150 calories per 100g

# Merge the two dictionaries for easier lookups
all_calorie_info = {**calorie_info, **extended_calorie_info}

@app.route("/", methods=["GET"])
def index():
    return render_template("index.html")

@app.route("/detect_image", methods=["POST"])
def upload_and_detect():
    global temp_image_path
    logger.info("Received image detection request")
    
    if not model:
        logger.error("Model not loaded")
        return jsonify({
            "success": False,
            "error": "Model not loaded. Please try again later."
        }), 500
    
    if "file" not in request.files:
        logger.error("No file part in request")
        return jsonify({
            "success": False,
            "error": "No file provided"
        }), 400
        
    file = request.files["file"]
    if not file or file.filename == "":
        logger.error("No file selected")
        return jsonify({
            "success": False,
            "error": "No file selected"
        }), 400
        
    # Validate file type
    if not file.filename.lower().endswith(('.png', '.jpg', '.jpeg')):
        logger.error("Invalid file type")
        return jsonify({
            "success": False,
            "error": "Only PNG, JPG and JPEG files are allowed"
        }), 400
    
    try:
        # Save temporary file
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".jpg")
        file.save(temp_file.name)
        
        # Load the image
        image = cv2.imread(temp_file.name)
        if image is None:
            logger.error("Failed to read image file")
            return jsonify({
                "success": False,
                "error": "Invalid image file"
            }), 400
            
        image_height, image_width, _ = image.shape
        
        # Run YOLO detection
        results = model(image)
        
        # Initialize detected food names
        detected_foods = {}
        
        # Process detection results and draw bounding boxes
        for result in results:
            for box in result.boxes:
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                conf = box.conf[0].item()
                label = result.names[int(box.cls[0].item())]

                # Draw bounding box
                cv2.rectangle(image, (x1, y1), (x2, y2), (0, 255, 0), 2)
                # Put label text
                cv2.putText(image, f"{label} {conf:.2f}", (x1, y1-10), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 255, 0), 2)

                # Get default weight for this food
                default_weight = all_calorie_info.get(label, {}).get('default_weight', 100)
                
                # Store detection info without calculating calories yet
                if label in detected_foods:
                    detected_foods[label]["count"] += 1
                    detected_foods[label]["weight"] += default_weight
                else:
                    detected_foods[label] = {
                        "count": 1,
                        "weight": default_weight,
                        "calories_per_100g": all_calorie_info.get(label, {}).get('calories', 150)
                    }

        # Save processed image
        processed_image_path = os.path.join(tempfile.gettempdir(), "processed.jpg")
        cv2.imwrite(processed_image_path, image)
        image_url = url_for('serve_processed_image', _external=True)

        logger.info(f"Detected foods: {detected_foods}")

        # Return as JSON
        return jsonify({
            "success": True,
            "detected_foods": detected_foods,
            "image_url": image_url
        })

    except Exception as e:
        logger.error(f"Error processing image: {str(e)}")
        return jsonify({
            "success": False,
            "error": f"Error processing image: {str(e)}"
        }), 500

@app.route("/update_calories", methods=["POST"])
def update_calories():
    """Endpoint to recalculate calories based on adjusted weight"""
    try:
        data = request.get_json()
        food_name = data.get('food_name')
        weight = data.get('weight', 100)
        
        # Calculate updated calories
        calories = calculate_calories(food_name, weight)
        
        return jsonify({
            "success": True,
            "food": food_name,
            "weight": weight,
            "calories": round(calories, 2)
        })
    except Exception as e:
        logger.error(f"Error updating calories: {str(e)}")
        return jsonify({
            "success": False,
            "error": f"Error updating calories: {str(e)}"
        }), 500

@app.route("/manual_entry", methods=["POST"])
def manual_entry():
    logger.info("Received manual entry request")
    
    data = request.get_json()
    food_name = data.get('food_name')
    quantity = data.get('quantity', 100)  # Default to 100g if not specified
    
    # First check for exact match in our local database
    if food_name in all_calorie_info:
        calories_per_100g = all_calorie_info[food_name]['calories']
        calories = (calories_per_100g * quantity) / 100
        logger.info("Manual entry completed with exact match")
        return jsonify({
            "success": True,
            "food": food_name,
            "quantity": quantity,
            "calories": round(calories, 2),
            "source": "exact_match"
        })
    
    # Check for case-insensitive match
    lower_food = food_name.lower()
    for food, info in all_calorie_info.items():
        if food.lower() == lower_food:
            calories_per_100g = info['calories']
            calories = (calories_per_100g * quantity) / 100
            logger.info("Manual entry completed with case-insensitive match")
            return jsonify({
                "success": True,
                "food": food_name,
                "quantity": quantity,
                "calories": round(calories, 2),
                "source": "case_insensitive_match",
                "matched_name": food
            })
    
    # Check for partial matches (e.g., "chicken" matches "Chicken Gravy")
    for food, info in all_calorie_info.items():
        if lower_food in food.lower() or food.lower() in lower_food:
            calories_per_100g = info['calories']
            calories = (calories_per_100g * quantity) / 100
            logger.info("Manual entry completed with partial match")
            return jsonify({
                "success": True,
                "food": food_name,
                "quantity": quantity,
                "calories": round(calories, 2),
                "source": "partial_match",
                "matched_name": food
            })
    
    # If no matches found, use a better average estimate
    # 150 is a better average for common foods than 80
    default_calories = 150
    calories = default_calories * (quantity / 100)
    
    logger.info("Manual entry completed with estimate")
    return jsonify({
        "success": True,
        "food": food_name,
        "quantity": quantity,
        "calories": round(calories, 2),
        "source": "estimate",
        "note": "Using average calorie value"
    })

@app.route("/processed_image")
def serve_processed_image():
    processed_image_path = os.path.join(tempfile.gettempdir(), "processed.jpg")
    if os.path.exists(processed_image_path):
        logger.info("Serving processed image")
        return send_file(processed_image_path, mimetype="image/jpeg")
    logger.error("No processed image available")
    return "No processed image available", 404

@app.route("/api/ping", methods=["GET"])
def ping():
    return jsonify({"message": "Connection successful"})

if __name__ == "__main__":
    logger.info("Application started")
    app.run(debug=True, port=5001)
