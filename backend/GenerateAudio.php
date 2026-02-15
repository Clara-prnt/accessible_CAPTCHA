<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);

if (!isset($input['scenarioId']) || !isset($input['targetWord'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing required parameters']);
    exit;
}

$scenarioId = $input['scenarioId'];
$targetWord = $input['targetWord'];

// Load scenarios from JSON file
$scenariosPath = __DIR__ . '/../src/data/scenarios.json';
$scenariosData = json_decode(file_get_contents($scenariosPath), true);

// Find the matching scenario
$scenario = null;
foreach ($scenariosData['scenarios'] as $s) {
    if ($s['id'] === $scenarioId) {
        $scenario = $s;
        break;
    }
}

if (!$scenario) {
    http_response_code(404);
    echo json_encode(['error' => 'Scenario not found']);
    exit;
}

try {
    // Prepare the Python command
    $pythonScript = __DIR__ . '/generate_audio.py';
    $command = "python \"$pythonScript\" \"$scenarioId\" \"$targetWord\" 2>&1";

    // Execute the Python script
    $output = shell_exec($command);

    // Parse the response from Python
    $result = json_decode($output, true);

    if ($result === null) {
        throw new Exception('Invalid response from Python script: ' . $output);
    }

    if (isset($result['error'])) {
        http_response_code(500);
        echo json_encode(['error' => $result['error']]);
        exit;
    }

    // Return the audio response
    echo json_encode($result);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Failed to generate audio',
        'message' => $e->getMessage()
    ]);
}