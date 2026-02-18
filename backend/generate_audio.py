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

base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
scenarios_path = os.path.join(base_dir, 'src', 'data', 'scenarios.json')
output_dir = os.path.join(base_dir, 'public', 'audio')

try:
    with open(scenarios_path, 'r') as f:
        data = json.load(f)

    # Find scenario
    scenario = next((s for s in data['scenarios'] if s['id'] == scenario_id), None)

    if not scenario:
        print(json.dumps({'error': 'Scenario not found'}))
        sys.exit(1)

    # Build audio text
    audio_text = scenario['text'] + ' ' + ', '.join(scenario['words'])

    intro_words = scenario['text'].split()
    lead_in_seconds = max(0.5, len(intro_words) / 2.5)

    # Create audio directory
    os.makedirs(output_dir, exist_ok=True)

    # Generate filename
    filename = f"{scenario_id}_{int(datetime.now().timestamp())}.mp3"
    filepath = os.path.join(output_dir, filename)

    # Generate audio
    engine.save_to_file(audio_text, filepath)
    engine.runAndWait()

    # Return response
    response = {
        'success': True,
        'audioUrl': f'/audio/{filename}',
        'targetWord': target_word,
        'duration': len(audio_text) / 15,
        'leadInSeconds': lead_in_seconds
    }

    sys.stdout.write(json.dumps(response))
    sys.stdout.flush()
except Exception as exc:
    sys.stdout.write(json.dumps({'error': str(exc)}))
    sys.stdout.flush()
    sys.exit(1)
