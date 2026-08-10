import cv2
import numpy as np

img = cv2.imread('assignments/connecting-rod-fatigue/images/EA-17_Connecting_Rod_Fatigue_v1.0.png')
h, w, _ = img.shape

# Candidate badge centers in percentage:
badges = [
    (1, 62.8, 28.5),
    (2, 62.8, 36.2),
    (3, 59.1, 45.3),
    (4, 60.6, 48.5),
    (5, 62.2, 59.0),
    (6, 55.2, 67.1),
    (7, 55.7, 78.9),
    (8, 52.5, 80.1),
    (9, 65.2, 86.2),
    (10, 62.5, 92.8)
]

# Let's search in wider windows to identify callout lines connected to each circle:
print("Inspecting 150px neighborhoods around badges:")
for num, x_pct, y_pct in badges:
    px, py = int(x_pct * w / 100), int(y_pct * h / 100)
    crop = img[max(0, py-75):min(h, py+75), max(0, px-75):min(w, px+75)]
    cv2.imwrite(f'd:/RPB/DesignEngineeringStudio/tools/crop_wide_{num}.png', crop)

print("Saved crop_wide_1.png to crop_wide_10.png")
