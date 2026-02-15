import json
import sys
import pyttsx3
from datetime import datetime
import os

# Initialize TTS engine
engine = pyttsx3.init()
engine.setProperty('rate', 150)  # Speed

# Load scenario
scenario_id = sys.argv[1]
target_word = sys.argv[2]

with open('src/data/scenarios.json', 'r') as f:
    data = json.load(f)

# Find scenario
scenario = next((s for s in data['scenarios'] if s['id'] == scenario_id), None)

if not scenario:
    print(json.dumps({'error': 'Scenario not found'}))
    sys.exit(1)

# Build audio text
audio_text = scenario['text'] + ' ' + ', '.join(scenario['words'])

# Create audio directory
os.makedirs('public/audio', exist_ok=True)

# Generate filename
filename = f"{scenario_id}_{int(datetime.now().timestamp())}.mp3"
filepath = f"public/audio/{filename}"

# Generate audio
engine.save_to_file(audio_text, filepath)
engine.runAndWait()

# Return response
response = {
    'success': True,
    'audioUrl': f'/audio/{filename}',
    'targetWord': target_word,
    'duration': len(audio_text) / 15
}

print(json.dumps(response))