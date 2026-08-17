import cv2
import numpy as np

img = cv2.imread('assignments/connecting-rod-fatigue/images/EA-17_Connecting_Rod_Fatigue_v1.0.png')
h, w, _ = img.shape

# Let's define candidate coordinates for the 10 badges on EA-17 image:
# Based on visual layout:
# Badge 1: Top of Piston
# Badge 2: Piston Pin / Wrist Pin
# Badge 3: Connecting Rod Small End
# Badge 4: Connecting Rod Shank (I-section)
# Badge 5: Connecting Rod Big End
# Badge 6: Crankshaft Main Bearing / Journal
# Badge 7: Crankshaft Gear
# Badge 8: Crankshaft Front Axle
# Badge 9: Crank Web
# Badge 10: Cyclic Load Statement (bottom)

candidates = [
    {"id": 1, "x": 62.8, "y": 28.5},
    {"id": 2, "x": 62.8, "y": 36.2},
    {"id": 3, "x": 62.8, "y": 42.8},
    {"id": 4, "x": 57.5, "y": 49.0},
    {"id": 5, "x": 66.0, "y": 57.5},
    {"id": 6, "x": 55.2, "y": 67.2},
    {"id": 7, "x": 52.0, "y": 75.2},
    {"id": 8, "x": 52.0, "y": 79.8},
    {"id": 9, "x": 65.2, "y": 86.2},
    {"id": 10, "x": 62.5, "y": 92.8}
]

print("Verifying badge crop areas:")
for c in candidates:
    px = int(c["x"] * w / 100)
    py = int(c["y"] * h / 100)
    crop = img[max(0, py-25):min(h, py+25), max(0, px-25):min(w, px+25)]
    cv2.imwrite(f'd:/RPB/DesignEngineeringStudio/tools/badge_{c["id"]}.png', crop)
    print(f"Saved badge_{c['id']}.png around ({px}, {py})")
