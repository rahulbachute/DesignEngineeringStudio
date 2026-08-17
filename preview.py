import json
import base64

with open('d:/RPB/DesignEngineeringStudio/DesignEngineeringStudio-main/outputs/meilp/assignments/c-clamp-friction/content.json', encoding='utf-8') as f:
    content = json.load(f)
labels = content['activities']['component-identification']['labels']

html = '''
<html><body style="background: #333;">
<div style="position: relative; display: inline-block;">
  <img src="file:///d:/RPB/DesignEngineeringStudio/DesignEngineeringStudio-main/outputs/meilp/assignments/c-clamp-friction/images/EA-19_C-Clamp_Screw_Friction_v1.0.png" width="500" />
'''

for l in labels:
    x = l['x']
    y = l['y']
    html += f'<div style="position: absolute; left: {x}%; top: {y}%; width: 20px; height: 20px; background: orange; border-radius: 50%; color: white; text-align: center; font-weight: bold; transform: translate(-50%, -50%);">{l["componentNumber"]}</div>'

html += '''
</div>
</body></html>
'''
with open('c_clamp_preview.html', 'w', encoding='utf-8') as f:
    f.write(html)

