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
$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
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
    $clicksRequired = isset($input['clicksRequired']) ? $input['clicksRequired'] : 3;

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

    // Validate clicks required
    if (!is_int($clicksRequired) || $clicksRequired < 1 || $clicksRequired > 10) {
        $clicksRequired = 3;
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

    // Load scenario and validate it exists
    $scenario = loadScenariosFromJSONFile($scenarioId);

    // Reuse shared shuffled order from audio generation when available.
    $displayWords = null;
    if (isset($captchaData['displayWords']) && is_array($captchaData['displayWords']) && count($captchaData['displayWords']) > 0) {
        $displayWords = array_values($captchaData['displayWords']);
    } else {
        $scenarioWords = isset($scenario['words']) ? $scenario['words'] : [];
        if (!is_array($scenarioWords) || count($scenarioWords) === 0) {
            SecurityConfig::sendResponse(['error' => 'Scenario words are missing'], 500);
        }

        $displayWords = array_values($scenarioWords);
        shuffle($displayWords);
    }

    // Ensure the declared target is part of the selected ordered list.
    if (!in_array($targetWord, $displayWords, true)) {
        SecurityConfig::sendResponse(['error' => 'Target word not found in display words'], 400);
    }

    // Generate new CSRF token for next request
    $newCSRFToken = SessionManager::generateCSRFToken();

    // Update CAPTCHA session data
    $textboxData = [
        'displayWords' => $displayWords,
        'words' => $displayWords,
        'wordDisplayDuration' => 1000,
        'wordInterval' => 1300,
        'clicksRequired' => $clicksRequired
    ];
    SessionManager::setCaptchaData($captchaSessionId, array_merge($captchaData, $textboxData));

    SecurityConfig::sendResponse([
        'success' => true,
        'words' => $displayWords,
        'targetWord' => $targetWord,
        'clicksRequired' => $clicksRequired,
        'scenarioId' => $scenarioId,
        'wordDisplayDuration' => 1000,
        'wordInterval' => 1300,
        'csrf_token' => $newCSRFToken,
        'captcha_session_id' => $captchaSessionId
    ], 200);

} catch (Exception $e) {
    error_log('GenerateTextbox failure: ' . $e->getMessage());
    SecurityConfig::sendResponse([
        'error' => 'Failed to generate textbox'
    ], 500);
}
