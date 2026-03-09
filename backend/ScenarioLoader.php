<?php

require_once __DIR__ . '/SecurityConfig.php';

function loadScenariosFromJSONFile($scenarioId)
{
    $scenariosPath = __DIR__ . '/../src/data/scenarios.json';

    if (!file_exists($scenariosPath)) {
        SecurityConfig::sendResponse(['error' => 'Scenarios file not found'], 500);
    }

    $scenariosData = json_decode(file_get_contents($scenariosPath), true);

    if ($scenariosData === null || !isset($scenariosData['scenarios'])) {
        SecurityConfig::sendResponse(['error' => 'Invalid scenarios file format'], 500);
    }

    $scenario = null;
    foreach ($scenariosData['scenarios'] as $s) {
        if ($s['id'] === $scenarioId) {
            $scenario = $s;
            break;
        }
    }

    if (!$scenario) {
        SecurityConfig::sendResponse(['error' => 'Scenario not found'], 404);
    }

    return $scenario;
}

