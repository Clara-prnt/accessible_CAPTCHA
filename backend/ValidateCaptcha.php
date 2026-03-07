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
    if (!InputValidator::validateJSONInput($input, ['csrf_token', 'captcha_session_id', 'click_count'])) {
        SecurityConfig::sendResponse(['error' => 'Missing required parameters'], 400);
    }

    $csrfToken = $input['csrf_token'];
    $captchaSessionId = $input['captcha_session_id'];
    $clickCount = $input['click_count'];

    // Validate parameter formats
    if (!InputValidator::validateCSRFTokenFormat($csrfToken)) {
        SecurityConfig::sendResponse(['error' => 'Invalid CSRF token format'], 400);
    }

    if (!InputValidator::validateCaptchaSessionId($captchaSessionId)) {
        SecurityConfig::sendResponse(['error' => 'Invalid session ID'], 400);
    }

    if (!InputValidator::validateClickData($clickCount)) {
        SecurityConfig::sendResponse(['error' => 'Invalid click data'], 400);
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

    // Check if all required data is present
    if (!isset($captchaData['targetWord']) || !isset($captchaData['clicksRequired'])) {
        SecurityConfig::sendResponse(['error' => 'CAPTCHA session incomplete'], 403);
    }

    // Validate the answer
    $targetWord = $captchaData['targetWord'];
    $clicksRequired = $captchaData['clicksRequired'];

    // Check if the client clicked the correct number of times
    if ($clickCount < $clicksRequired) {
        SecurityConfig::sendResponse([
            'success' => false,
            'message' => 'Not enough clicks. Required: ' . $clicksRequired,
            'clicks_required' => $clicksRequired,
            'clicks_received' => $clickCount
        ], 400);
    }

    // Success! User passed the CAPTCHA
    $validationToken = SecurityConfig::generateToken();

    SecurityConfig::storeCaptchaValidation($captchaSessionId, [
        'validation_token' => $validationToken,
        'validated_at' => time(),
        'target_word' => $targetWord,
        'clicks_required' => $clicksRequired,
        'clicks_received' => $clickCount
    ]);

    // Clean up the CAPTCHA session
    SessionManager::destroyCaptchaSession($captchaSessionId);

    // Record success to reduce rate limit pressure
    RateLimiter::recordSuccess();

    // Generate new CSRF token for next request
    $newCSRFToken = SessionManager::generateCSRFToken();

    SecurityConfig::sendResponse([
        'success' => true,
        'message' => 'CAPTCHA validated successfully!',
        'validation_token' => $validationToken,
        'csrf_token' => $newCSRFToken,
        'target_word' => $targetWord,
        'clicks_required' => $clicksRequired,
        'clicks_received' => $clickCount
    ]);

} catch (Exception $e) {
    error_log('ValidateCaptcha failure: ' . $e->getMessage());
    SecurityConfig::sendResponse([
        'success' => false,
        'error' => 'Failed to validate CAPTCHA'
    ], 500);
}
