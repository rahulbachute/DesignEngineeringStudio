import cv2
import numpy as np

img = cv2.imread('assignments/connecting-rod-fatigue/images/EA-17_Connecting_Rod_Fatigue_v1.0.png')
h, w, _ = img.shape

# Let's inspect the 10 orange badge locations on the image:
badge_coords = [
  (1, 0.628, 0.285),
  (2, 0.628, 0.362),
  (3, 0.591, 0.453),
  (4, 0.606, 0.485),
  (5, 0.622, 0.590),
  (6, 0.552, 0.671),
  (7, 0.557, 0.789),
  (8, 0.525, 0.801),
  (9, 0.652, 0.862),
  (10, 0.625, 0.928)
]

print("Inspecting diagram components under each badge 1..10:")

# Let's check text labels on the image:
# In the image graphic, there are text labels:
# "Piston ----" (pointing to top)
# "Connecting Rod ----" (pointing to middle shank)
# "Crankpin ----" (pointing to crankpin)
# "Crank Web ----" (pointing to crank web)
# "1. COMBUSTION / GAS FORCE" (box on top right)
# "2. INERTIA FORCE" (box on mid left)
# "LOAD PATH" (box on bottom right)
# "Power Stroke --->", "---- Linear Motion --->", "Intake Stroke --->" (bottom legend)

for num, x_pct, y_pct in badge_coords:
    px = int(x_pct * w)
    py = int(y_pct * h)
    crop = img[max(0, py-40):min(h, py+40), max(0, px-40):min(w, px+40)]
    cv2.imwrite(f'd:/RPB/DesignEngineeringStudio/tools/detail_badge_{num}.png', crop)

print("Saved detailed badge crops detail_badge_1.png to detail_badge_10.png")
