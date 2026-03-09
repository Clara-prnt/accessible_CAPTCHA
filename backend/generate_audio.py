import json
import sys
import pyttsx3
from datetime import datetime
import os
import base64

# Initialize TTS engine
engine = pyttsx3.init()
engine.setProperty('rate', 150)  # Speed

# Load scenario
scenario_id = sys.argv[1]
target_word = sys.argv[2]
custom_words_arg = sys.argv[3] if len(sys.argv) > 3 else None

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

    # Build audio text with pauses between words
    # Add introduction (scenario text)
    intro_words = scenario['text'].split()
    lead_in_seconds = max(0.5, len(intro_words) / 2.4)

    # Create audio with explicit pauses between words for clarity
    # Format: "word <pause> word <pause> word"
    words = scenario['words']

    # If provided by PHP, use the exact shuffled order shared with textbox.
    if custom_words_arg:
        try:
            decoded_words = base64.b64decode(custom_words_arg).decode('utf-8')
            parsed_words = json.loads(decoded_words)
            if isinstance(parsed_words, list) and all(isinstance(w, str) for w in parsed_words) and len(parsed_words) > 0:
                words = parsed_words
        except Exception:
            # Fallback to scenario words if parsing fails.
            words = scenario['words']

    audio_text = scenario['text'] + '. '

    # Add words with pauses between them (using ellipsis to create natural pauses)
    for i, word in enumerate(words):
        audio_text += word
        if i < len(words) - 1:
            # Add pause marker (pyttsx3 will create a natural pause with comma)
            audio_text += ', '

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
        'words': words,
        'duration': len(audio_text) / 15,
        'leadInSeconds': lead_in_seconds
    }

    sys.stdout.write(json.dumps(response))
    sys.stdout.flush()
except Exception as exc:
    # Log the full error for debugging (to stderr which will be logged by PHP)
    import traceback
    sys.stderr.write(f"Audio generation error: {str(exc)}\n")
    sys.stderr.write(traceback.format_exc())
    sys.stderr.flush()

    # Return a generic error message to the client (no technical details exposed)
    sys.stdout.write(json.dumps({
        'error': 'Audio generation failed',
        'success': False
    }))
    sys.stdout.flush()
    sys.exit(1)


