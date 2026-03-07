<?php
/**
 * InitCaptcha.php
 * Initialize a new CAPTCHA session
 * This endpoint must be called first to get a CSRF token and session ID
 */

header('Content-Type: application/json');

require_once __DIR__ . '/SecurityConfig.php';
require_once __DIR__ . '/SessionManager.php';
require_once __DIR__ . '/RateLimiter.php';

// Set security headers
SecurityConfig::applyApiSecurityHeaders();

// Handle CORS
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, SecurityConfig::ALLOWED_ORIGINS, true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Access-Control-Allow-Credentials: true');
}
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

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
    $rateLimit = RateLimiter::checkInitLimit();
    if (!$rateLimit['allowed']) {
        SecurityConfig::sendRateLimitExceeded($rateLimit);
    }

    // Initialize session and generate CSRF token
    SessionManager::initializeSession();
    $csrfToken = SessionManager::generateCSRFToken();
    $sessionId = SessionManager::getSessionId();

    // Generate a unique CAPTCHA session ID
    $captchaSessionId = bin2hex(random_bytes(16));

    // Store empty CAPTCHA session data (will be populated by GenerateAudio/GenerateTextbox)
    SessionManager::setCaptchaData($captchaSessionId, [
        'created_at' => time(),
        'csrf_token' => $csrfToken,
    ]);

    SecurityConfig::sendResponse([
        'success' => true,
        'csrf_token' => $csrfToken,
        'captcha_session_id' => $captchaSessionId,
        'session_id' => $sessionId,
    ]);

} catch (Exception $e) {
    error_log('InitCaptcha failure: ' . $e->getMessage());
    SecurityConfig::sendResponse([
        'error' => 'Failed to initialize CAPTCHA'
    ], 500);
}

