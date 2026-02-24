<?php
/**
 * ValidateCaptcha.php
 * Validate CAPTCHA answer on the server side
 * This is the final validation endpoint
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

require_once __DIR__ . '/SecurityConfig.php';
require_once __DIR__ . '/SessionManager.php';
require_once __DIR__ . '/RateLimiter.php';
require_once __DIR__ . '/InputValidator.php';

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
    if (!InputValidator::validateJSONInput($input, ['csrf_token', 'captcha_session_id', 'click_count'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing required parameters']);
        exit;
    }

    $csrfToken = $input['csrf_token'];
    $captchaSessionId = $input['captcha_session_id'];
    $clickCount = $input['click_count'];

    // Validate parameter formats
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

    if (!InputValidator::validateClickData($clickCount)) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid click data']);
        exit;
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

    // Check if all required data is present
    if (!isset($captchaData['targetWord']) || !isset($captchaData['clicksRequired'])) {
        http_response_code(403);
        echo json_encode(['error' => 'CAPTCHA session incomplete']);
        exit;
    }

    // Validate the answer
    $targetWord = $captchaData['targetWord'];
    $clicksRequired = $captchaData['clicksRequired'];

    // Check if the client clicked the correct number of times
    if ($clickCount < $clicksRequired) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Not enough clicks. Required: ' . $clicksRequired,
            'clicks_required' => $clicksRequired,
            'clicks_received' => $clickCount
        ]);
        exit;
    }

    // Success! User passed the CAPTCHA
    // Generate a validation token that can be verified later
    $validationToken = SecurityConfig::generateToken();

    // Store the validation result in the session
    SessionManager::initializeSession();
    if (!isset($_SESSION['CAPTCHA_VALIDATIONS'])) {
        $_SESSION['CAPTCHA_VALIDATIONS'] = [];
    }
    $_SESSION['CAPTCHA_VALIDATIONS'][$captchaSessionId] = [
        'validation_token' => $validationToken,
        'validated_at' => time(),
        'target_word' => $targetWord,
        'clicks_required' => $clicksRequired,
        'clicks_received' => $clickCount
    ];

    // Clean up the CAPTCHA session
    SessionManager::destroyCaptchaSession($captchaSessionId);

    // Record success to reduce rate limit pressure
    RateLimiter::recordSuccess('validation_requests');

    // Generate new CSRF token for next request
    $newCSRFToken = SessionManager::generateCSRFToken();

    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'CAPTCHA validated successfully!',
        'validation_token' => $validationToken,
        'csrf_token' => $newCSRFToken,
        'target_word' => $targetWord,
        'clicks_required' => $clicksRequired,
        'clicks_received' => $clickCount
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Failed to validate CAPTCHA',
        'message' => $e->getMessage()
    ]);
}

