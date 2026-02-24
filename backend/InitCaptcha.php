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
foreach (SecurityConfig::SECURITY_HEADERS as $header => $value) {
    header("$header: $value");
}

// Handle CORS
$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
if (in_array($origin, SecurityConfig::ALLOWED_ORIGINS)) {
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
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
        exit;
    }

    // Check rate limiting
    $rateLimit = RateLimiter::checkInitLimit();
    if (!$rateLimit['allowed']) {
        http_response_code(429);
        echo json_encode([
            'error' => 'Rate limit exceeded',
            'message' => $rateLimit['message'],
            'retry_after' => $rateLimit['retry_after']
        ]);
        exit;
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

    http_response_code(200);
    echo json_encode([
        'success' => true,
        'csrf_token' => $csrfToken,
        'captcha_session_id' => $captchaSessionId,
        'session_id' => $sessionId,
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Failed to initialize CAPTCHA',
        'message' => $e->getMessage()
    ]);
}

