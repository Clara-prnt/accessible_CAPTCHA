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
foreach (SecurityConfig::SECURITY_HEADERS as $header => $value) {
    header("$header: $value");
}

// Handle CORS
$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
if (in_array($origin, SecurityConfig::ALLOWED_ORIGINS)) {
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
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
        exit;
    }

    // Check rate limiting
    $rateLimit = RateLimiter::checkValidationLimit();
    if (!$rateLimit['allowed']) {
        http_response_code(429);
        echo json_encode([
            'error' => 'Rate limit exceeded',
            'message' => $rateLimit['message'],
            'retry_after' => $rateLimit['retry_after']
        ]);
        exit;
    }

    // Initialize session
    SessionManager::initializeSession();

    // Parse input
    $input = json_decode(file_get_contents('php://input'), true);

    // Validate input structure
    if (!InputValidator::validateJSONInput($input, ['scenarioId', 'targetWord', 'csrf_token', 'captcha_session_id'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing required parameters']);
        exit;
    }

    // Validate and extract parameters
    $scenarioId = $input['scenarioId'];
    $targetWord = $input['targetWord'];
    $csrfToken = $input['csrf_token'];
    $captchaSessionId = $input['captcha_session_id'];
    $clicksRequired = isset($input['clicksRequired']) ? $input['clicksRequired'] : 3;

    // Validate parameter formats
    if (!InputValidator::validateScenarioId($scenarioId)) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid scenario ID']);
        exit;
    }

    if (!InputValidator::validateTargetWord($targetWord)) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid target word']);
        exit;
    }

    if (!InputValidator::validateCSRFTokenFormat($csrfToken)) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid CSRF token format']);
        exit;
    }

    if (!InputValidator::validateCaptchaSessionId($captchaSessionId)) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid session ID']);
        exit;
    }

    // Validate clicks required
    if (!is_int($clicksRequired) || $clicksRequired < 1 || $clicksRequired > 10) {
        $clicksRequired = 3;
    }

    // Validate CSRF token
    if (!SessionManager::validateCSRFToken($csrfToken)) {
        http_response_code(403);
        echo json_encode(['error' => 'Invalid or expired CSRF token']);
        exit;
    }

    // Verify CAPTCHA session exists and belongs to this client
    $captchaData = SessionManager::getCaptchaData($captchaSessionId);
    if ($captchaData === null) {
        http_response_code(403);
        echo json_encode(['error' => 'Invalid or expired CAPTCHA session']);
        exit;
    }

    // Load scenario and validate it exists
    $scenario = loadScenariosFromJSONFile($scenarioId);

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

    // Generate new CSRF token for next request
    $newCSRFToken = SessionManager::generateCSRFToken();

    // Update CAPTCHA session data
    $textboxData = [
        'words' => $displayWords,
        'wordDisplayDuration' => 1000,
        'wordInterval' => 1000,
        'clicksRequired' => $clicksRequired
    ];
    SessionManager::setCaptchaData($captchaSessionId, array_merge($captchaData, $textboxData));

    // Return the response with the words to display and security tokens
    // wordDisplayDuration: time each word is displayed (in milliseconds)
    // wordInterval: time between word changes (in milliseconds)
    echo json_encode([
        'success' => true,
        'words' => $displayWords,
        'targetWord' => $targetWord,
        'clicksRequired' => $clicksRequired,
        'scenarioId' => $scenarioId,
        'wordDisplayDuration' => 1000,
        'wordInterval' => 1000,
        'csrf_token' => $newCSRFToken,
        'captcha_session_id' => $captchaSessionId
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Failed to generate textbox',
        'message' => $e->getMessage()
    ]);
}
