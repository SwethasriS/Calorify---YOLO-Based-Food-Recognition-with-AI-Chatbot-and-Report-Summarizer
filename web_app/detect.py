import cv2
import torch
from ultralytics import YOLO

# Load trained model
model = YOLO("D:/success/model/best.pt")  # Ensure compatibility with updated library

# Load image
image_path = "D:/success/dataset/images/test/sample.jpeg"
image = cv2.imread(image_path)

# Run detection
results = model(image)

# Draw bounding boxes
for result in results:
    for box in result.boxes:
        x1, y1, x2, y2 = map(int, box.xyxy[0])
        conf = box.conf[0].item()
        label = result.names[int(box.cls[0].item())]
        
        # Draw box
        cv2.rectangle(image, (x1, y1), (x2, y2), (0, 255, 0), 2)
        cv2.putText(image, f"{label} {conf:.2f}", (x1, y1 - 10), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)

# Show output
cv2.imshow("Detection", image)
cv2.waitKey(0)
cv2.destroyAllWindows()
