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
$clicksRequired = isset($input['clicksRequired']) ? $input['clicksRequired'] : 3;

// Load scenarios from JSON file
/**
 * @param $scenarioId
 * @return mixed|void
 */
function loadScenariosFromJSONFile($scenarioId)
{
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
    return $scenario;
}

$scenario = loadScenariosFromJSONFile($scenarioId);

try {
    // Get all words from the scenario
    $scenarioWords = $scenario['words'];

    // Generate a list of random words to display
    // Include the target word and some distractors
    $displayWords = [];

    // Add the target word
    $displayWords[] = $targetWord;

    // Get additional words from the scenario (excluding the target word)
    $distractorWords = array_filter($scenarioWords, function($word) use ($targetWord) {
        return $word !== $targetWord;
    });
    $distractorWords = array_values($distractorWords);

    // Add 4-6 random distractors
    $numDistracters = rand(4, 6);
    $numDistracters = min($numDistracters, count($distractorWords));

    for ($i = 0; $i < $numDistracters; $i++) {
        $randomIndex = rand(0, count($distractorWords) - 1);
        $displayWords[] = $distractorWords[$randomIndex];
        // Remove the used word to avoid duplicates
        array_splice($distractorWords, $randomIndex, 1);
    }

    // Shuffle the display words
    shuffle($displayWords);

    // Return the response with the words to display
    // wordDisplayDuration: time each word is displayed (in milliseconds)
    // wordInterval: time between word changes (in milliseconds)
    echo json_encode([
        'success' => true,
        'words' => $displayWords,
        'targetWord' => $targetWord,
        'clicksRequired' => $clicksRequired,
        'scenarioId' => $scenarioId,
        'wordDisplayDuration' => 4000,
        'wordInterval' => 5000
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Failed to generate textbox',
        'message' => $e->getMessage()
    ]);
}
