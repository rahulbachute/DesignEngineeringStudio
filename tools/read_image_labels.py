import cv2
import numpy as np

img = cv2.imread('assignments/connecting-rod-fatigue/images/EA-17_Connecting_Rod_Fatigue_v1.0.png')
h, w, _ = img.shape

# Let's crop key text callouts from the graphic to read them clearly:
# 1. Top left labels (Piston, Connecting Rod)
crop_top_left = img[int(h*0.25):int(h*0.45), int(w*0.35):int(w*0.55)]
cv2.imwrite('d:/RPB/DesignEngineeringStudio/tools/crop_top_left.png', crop_top_left)

# 2. Mid left labels (Crankpin)
crop_mid_left = img[int(h*0.50):int(h*0.65), int(w*0.35):int(w*0.55)]
cv2.imwrite('d:/RPB/DesignEngineeringStudio/tools/crop_mid_left.png', crop_mid_left)

# 3. Bottom left labels (Crank Web)
crop_bot_left = img[int(h*0.75):int(h*0.90), int(w*0.35):int(w*0.55)]
cv2.imwrite('d:/RPB/DesignEngineeringStudio/tools/crop_bot_left.png', crop_bot_left)

# 4. Right Load Path box
crop_load_path = img[int(h*0.60):int(h*0.90), int(w*0.75):int(w*0.95)]
cv2.imwrite('d:/RPB/DesignEngineeringStudio/tools/crop_load_path.png', crop_load_path)

print("Saved crop regions for inspection.")
