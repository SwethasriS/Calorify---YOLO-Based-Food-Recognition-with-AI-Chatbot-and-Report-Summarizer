import os
from ultralytics import YOLO

# Define paths
dataset_yaml = "D:/success/dataset/yolo.yaml"  # Path to dataset config
model_save_path = "D:/success/model/best.pt"  # Path to save model

# Load YOLOv8 model (pre-trained)
model = YOLO("yolov8n.pt")  # Ensure compatibility with updated library

# Train model
model.train(
    data=dataset_yaml,  
    epochs=5,
    imgsz=640,
    batch=8,
    pretrained=True,
    save=True
)

# Save trained model
os.makedirs("D:/success/model", exist_ok=True)
model.export(format="torchscript")  # Convert to TorchScript
model.save(model_save_path)

print(f"✅ Model saved at: {model_save_path}")
