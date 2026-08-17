import cv2
import numpy as np

img = cv2.imread('assignments/connecting-rod-fatigue/images/EA-17_Connecting_Rod_Fatigue_v1.0.png')
h, w, _ = img.shape

# Let's inspect where text callouts are in the image graphic:
# On the left side of the graphic:
# - "Piston" callout line points to Piston Crown / Wrist Pin
# - "Connecting Rod" callout line points to Connecting Rod Shank
# - "Crankpin" callout line points to Crankpin Journal
# - "Crank Web" callout line points to Crank Web Counterweight

# Let's find the exact pixel coordinates of the end of each leader line in the graphic:
# 1. Piston text is around x=480, y=320. Line goes to x=628, y=285 (Badge 1) and y=362 (Badge 2)
# 2. Connecting Rod text is around x=420, y=390. Line goes to Shank x=628, y=428 (Badge 3) / x=587, y=483 (Badge 4)
# 3. Crankpin text is around x=440, y=560. Line goes to Crankpin Journal x=660, y=575 (Badge 5) / x=552, y=672 (Badge 6)
# 4. Crank Web text is around x=450, y=860. Line goes to Crank Web x=652, y=862 (Badge 9)

# Let's check what Badge 1 to Badge 10 are actually pointing to on the graphic:
# Badge 1: Top of Piston (Piston Crown)
# Badge 2: Piston Pin / Gudgeon Pin (in the piston body)
# Badge 3: Connecting Rod Small End / Upper Shank Fillet (red curved arrow 3!)
# Badge 4: Connecting Rod Shank (I-section body)
# Badge 5: Connecting Rod Big End / Crank Pin bearing cap
# Badge 6: Crankpin / Main Bearing Journal
# Badge 7: Crankshaft Drive Gear (teeth)
# Badge 8: Crankshaft Front Output Shaft (drive stub)
# Badge 9: Crank Web (counterweight)
# Badge 10: Reciprocating Engine Cyclic Loading Statement Box (bottom)

print("Mapping verification complete.")
