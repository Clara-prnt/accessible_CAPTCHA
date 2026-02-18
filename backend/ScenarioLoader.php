<?php

function loadScenariosFromJSONFile($scenarioId)
{
    $scenariosPath = __DIR__ . '/../src/data/scenarios.json';
    $scenariosData = json_decode(file_get_contents($scenariosPath), true);

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

