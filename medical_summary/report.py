from flask import Flask, request, jsonify
from pytesseract import pytesseract
from pdfminer.high_level import extract_text
from io import BytesIO
from PIL import Image
import google.generativeai as genai

app = Flask(__name__)

# ✅ Set up Gemini API key
genai.configure(api_key="AIzaSyDADpowkizDRUxP-tGtr5_MTUXuXuhyCWU")

# ✅ Use the correct model name
MODEL_NAME = "gemini-1.5-pro-latest"

# Path to Tesseract executable
pytesseract.tesseract_cmd = r"C:/Program Files/Tesseract-OCR/tesseract.exe"

@app.route('/')
def home():
    return """
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <title>NutriSummarize</title>
      <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
      <style>
        body {
          margin: 0;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background: #5a502a;
          background-size: cover;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
        }

        .container {
          
          background: rgba(255, 255, 255, 0.5);
          backdrop-filter: blur(10px);
          border-radius: 16px;
          padding: 40px;
          text-align: center;
          max-width: 100%;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
        }

        h1 {
          font-size: 32px;
          margin-bottom: 20px;
          color: #333;
        }

        p {
          color: #444;
          font-size: 18px;
          margin-bottom: 30px;
        }

        input[type="file"] {
          margin-bottom: 20px;
          font-size: 14px;
          padding: 8px;
        }

        button {
          background-color: #f1c40f;
          color: white;
          padding: 10px 24px;
          border: none;
          border-radius: 24px;
          font-weight: bold;
          font-size: 16px;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
          cursor: pointer;
        }

        button:hover {
          background: #333;
    color: #f1c40f;
    border: 2px solid #f1c40f;
        }

        #alertBox {
          margin-top: 20px;
          background-color: #f1c40f;
          color:  #333;
          padding: 10px;
          border-radius: 8px;
          display: none;
        }

        #preview {
          margin-top: 20px;
          max-width: 100%;
          border-radius: 8px;
          display: none;
        }

        #resultContainer {
          display: none;
          margin-top: 30px;
        }

        table {
          width: 100%;
          margin-top: 20px;
          border-collapse: collapse;
        }

        th, td {
          padding: 12px;
          border: 1px solid #ccc;
        }

        th {
          background-color: #333;
          color: white;
        }

      </style>
    </head>
    <body>

      <div class="container">
        <h1>Welcome to NutriSummarize</h1>
        <p>Upload an image or PDF file to extract and summarize key medical insights.</p>

        <form id="uploadForm">
          <input type="file" id="fileInput" name="files" multiple />
          <br>
          <button type="button" id="uploadBtn">Extract & Summarize</button>
        </form>

        <div id="alertBox">✅ File uploaded successfully!</div>
        <img id="preview" />

        <div id="resultContainer">
          <h3>🩺 Patient Report</h3>
          <div id="tableContainer"></div>
        </div>
      </div>

      <script>
        // Image preview
        $("#fileInput").on("change", function () {
          const file = this.files[0];
          if (file && file.type.startsWith("image")) {
            const reader = new FileReader();
            reader.onload = function (e) {
              $("#preview").attr("src", e.target.result).show();
            };
            reader.readAsDataURL(file);
          } else {
            $("#preview").hide();
          }
        });

        // Upload handler
        $("#uploadBtn").click(function () {
          let formData = new FormData();
          let files = $("#fileInput")[0].files;

          if (files.length === 0) {
            alert("Please select a file.");
            return;
          }

          for (let i = 0; i < files.length; i++) {
            formData.append("files", files[i]);
          }

          $.ajax({
            url: "/extract_text1",
            type: "POST",
            data: formData,
            processData: false,
            contentType: false,
            success: function (response) {
              $("#tableContainer").html(response);
              $("#resultContainer").fadeIn();
              $("#alertBox").fadeIn();
              setTimeout(() => $("#alertBox").fadeOut(), 3000);
            },
            error: function () {
              alert("Error processing file.");
            }
          });
        });
      </script>

    </body>
    </html>

    """

@app.route('/extract_text1', methods=['POST'])
def extract_text1():
    prompt = (
    "You are a certified clinical nutritionist. Analyze the following medical report and extract nutritional insights.\n\n"
    "Based on the report:\n"
    "- Identify nutrients that are deficient (low or missing).\n"
    "- Identify nutrients that are sufficient (at optimal levels).\n"
    "- Recommend specific foods that can improve the patient's deficiencies.\n\n"
    "📝 Format your response strictly as a clean HTML <table> with exactly 3 columns:\n"
    "1. Deficient Nutrients\n"
    "2. Sufficient Nutrients\n"
    "3. Recommended Foods\n\n"
    "⚠ Do NOT include any paragraphs, markdown, or additional explanation.\n"
    "⚠ Do NOT wrap the table in <html>, <body>, or <pre> tags. Just return the <table> only."
)


    files = request.files.getlist('files')
    results = []

    for file in files:
        if file.filename.endswith('.pdf'):
            try:
                with BytesIO(file.read()) as file_stream:
                    pdf_text = extract_text(file_stream)
                report = pdf_text
            except Exception as e:
                return jsonify({'message': 'Error processing PDF:', 'error': str(e)}), 500
        else:
            try:
                image_text = pytesseract.image_to_string(Image.open(file))
                report = image_text
            except Exception as e:
                return jsonify({'message': 'Error processing image:', 'error': str(e)}), 500
        
        try:
            # ✅ Use the correct model name
            model = genai.GenerativeModel(MODEL_NAME)
            response = model.generate_content(report + "\n\n" + prompt)
            results.append(response.text)
        except Exception as e:
            return jsonify({'message': 'Error summarizing text:', 'error': str(e)}), 500

    return results[-1] if results else jsonify({'message': 'No text extracted.'})

if __name__ == '__main__':
    app.run(debug=True, port=5003)