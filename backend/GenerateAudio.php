<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

require_once __DIR__ . '/SecurityConfig.php';
require_once __DIR__ . '/SessionManager.php';
require_once __DIR__ . '/RateLimiter.php';
require_once __DIR__ . '/InputValidator.php';
require_once __DIR__ . '/ScenarioLoader.php';

// Set security headers
SecurityConfig::applyApiSecurityHeaders();

// Handle CORS
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, SecurityConfig::ALLOWED_ORIGINS, true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Access-Control-Allow-Credentials: true');
}

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

try {
    // Only allow POST requests
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        SecurityConfig::sendResponse(['error' => 'Method not allowed'], 405);
    }

    // Check rate limiting
    $rateLimit = RateLimiter::checkValidationLimit();
    if (!$rateLimit['allowed']) {
        SecurityConfig::sendRateLimitExceeded($rateLimit);
    }

    // Initialize session
    SessionManager::initializeSession();

    // Parse input
    $input = json_decode(file_get_contents('php://input'), true);

    // Validate input structure
    if (!InputValidator::validateJSONInput($input, ['scenarioId', 'targetWord', 'csrf_token', 'captcha_session_id'])) {
        SecurityConfig::sendResponse(['error' => 'Missing required parameters'], 400);
    }

    // Validate and extract parameters
    $scenarioId = $input['scenarioId'];
    $targetWord = $input['targetWord'];
    $csrfToken = $input['csrf_token'];
    $captchaSessionId = $input['captcha_session_id'];

    // Validate parameter formats
    if (!InputValidator::validateScenarioId($scenarioId)) {
        SecurityConfig::sendResponse(['error' => 'Invalid scenario ID'], 400);
    }

    if (!InputValidator::validateTargetWord($targetWord)) {
        SecurityConfig::sendResponse(['error' => 'Invalid target word'], 400);
    }

    if (!InputValidator::validateCSRFTokenFormat($csrfToken)) {
        SecurityConfig::sendResponse(['error' => 'Invalid CSRF token format'], 400);
    }

    if (!InputValidator::validateCaptchaSessionId($captchaSessionId)) {
        SecurityConfig::sendResponse(['error' => 'Invalid session ID'], 400);
    }

    // Validate CSRF token
    if (!SessionManager::validateCSRFToken($csrfToken)) {
        SecurityConfig::sendResponse(['error' => 'Invalid or expired CSRF token'], 403);
    }

    // Verify CAPTCHA session exists and belongs to this client
    $captchaData = SessionManager::getCaptchaData($captchaSessionId);
    if ($captchaData === null) {
        SecurityConfig::sendResponse(['error' => 'Invalid or expired CAPTCHA session'], 403);
    }

    // Load scenario and build a shared shuffled word order for audio + textbox.
    $scenario = loadScenariosFromJSONFile($scenarioId);
    $scenarioWords = $scenario['words'] ?? [];

    if (!is_array($scenarioWords) || count($scenarioWords) === 0) {
        SecurityConfig::sendResponse(['error' => 'Scenario words are missing'], 500);
    }

    if (!in_array($targetWord, $scenarioWords, true)) {
        SecurityConfig::sendResponse(['error' => 'Target word not found in scenario words'], 400);
    }

    $displayWords = array_values($scenarioWords);
    shuffle($displayWords);

    $displayWordsJson = json_encode($displayWords);
    if ($displayWordsJson === false) {
        throw new Exception('Unable to encode shuffled words');
    }

    // Pass shuffled words as a safe CLI arg (base64 JSON).
    $displayWordsArg = base64_encode($displayWordsJson);

    // Prepare the Python command with proper escaping to prevent command injection
    $pythonScript = __DIR__ . '/generate_audio.py';
    $command = sprintf(
        'python %s %s %s %s 2>&1',
        escapeshellarg($pythonScript),
        escapeshellarg($scenarioId),
        escapeshellarg($targetWord),
        escapeshellarg($displayWordsArg)
    );

    // Execute the Python script
    $output = shell_exec($command);

    $output = $output ?? '';
    if (str_contains($output, "\x00") && function_exists('iconv')) {
        $output = iconv('UTF-16LE', 'UTF-8', $output);
    }
    $output = trim($output);

    // Parse the response from Python
    $result = json_decode($output, true);

    if ($result === null) {
        throw new Exception('Invalid response from Python script');
    }

    if (isset($result['error'])) {
        SecurityConfig::sendResponse(['error' => 'Audio generation failed'], 500);
    }

    // Update CAPTCHA session data
    $audioData = [
        'targetWord' => $targetWord,
        'scenarioId' => $scenarioId,
        'displayWords' => $displayWords,
        'leadInSeconds' => $result['leadInSeconds'] ?? 0,
        'duration' => $result['duration'] ?? 0,
        'audioPath' => $result['audioPath'] ?? '',
        'created_at' => time()
    ];
    SessionManager::setCaptchaData($captchaSessionId, array_merge($captchaData, $audioData));

    // Generate new CSRF token for next request
    $newCSRFToken = SessionManager::generateCSRFToken();

    $ambientUrl = '/audio/ambience/' . $scenarioId . '.mp3';

    // Return the audio response with security tokens
    SecurityConfig::sendResponse(array_merge($result, [
        'words' => $displayWords,
        'ambientUrl' => $ambientUrl,
        'csrf_token' => $newCSRFToken,
        'captcha_session_id' => $captchaSessionId,
        'success' => true
    ]));

} catch (Exception $e) {
    error_log('GenerateAudio failure: ' . $e->getMessage());
    SecurityConfig::sendResponse([
        'error' => 'Failed to generate audio'
    ], 500);
}

