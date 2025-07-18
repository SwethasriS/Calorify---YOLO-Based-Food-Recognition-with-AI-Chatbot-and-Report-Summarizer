# Calorify---Intelligent-Nutrition-Health-Tracker-Using-YOLO-and-LLMs

Calorify is an AI-powered web application that detects food items using YOLO, estimates calories, summarizes uploaded medical reports, and provides personalized advice via a smart chatbot.

---

## 🚀 Features

- 🍽️ **Food Detection using YOLO**  
  Scan your food through your camera and detect food type with real-time calorie estimation.

- 🤖 **Personalized AI Chatbot**  
  Get dietary suggestions, healthy meal ideas, and fitness advice based on your health profile.

- 📄 **Medical Report Summarizer**  
  Upload medical reports (PDF/Image/Text) and get an easy-to-read summary using NLP and LLMs.

- 📊 **Calorie Tracker**  
  Tracks user’s daily calorie intake and generates graphical reports.

---

## 🛠️ Tech Stack

- **Frontend**: HTML, CSS, JavaScript  
- **Backend**: Python, Flask  
- **ML Model**: YOLOv8 (Ultralytics)  
- **NLP/LLM**: OpenAI GPT or HuggingFace Transformers  
- **Database**: MongoDB (or SQLite/PostgreSQL)  
- **Deployment**: Render/Heroku/Vercel (Optional)

---

## 📸 Screenshots
<img width="1884" height="925" alt="image" src="https://github.com/user-attachments/assets/1f5ac7b0-6551-40d5-8edc-cda188d4f3da" /> 
<img width="1314" height="918" alt="image" src="https://github.com/user-attachments/assets/b0ea1bfc-a848-4cd8-a3df-f6a9191f6389" />
<img width="877" height="512" alt="image" src="https://github.com/user-attachments/assets/241a0c18-4e63-4e20-a9b8-74ad7354994e" />
<img width="242" height="153" alt="image" src="https://github.com/user-attachments/assets/ba8a561f-7b94-4704-9c0c-aea392438b34" />
<img width="297" height="204" alt="image" src="https://github.com/user-attachments/assets/3a6034ba-53be-42ed-9cf0-19352246c481" />





---

## 🔍 How to Run Locally

```bash
git clone https://github.com/----------/calorify.git
cd calorify
python -m venv env
source env/bin/activate  # or env\Scripts\activate on Windows
pip install -r requirements.txt
python app.py
