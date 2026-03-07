<?php

class SecurityConfig {
    // CSRF Token Configuration
    const CSRF_TOKEN_LENGTH = 64;  // 32 bytes = 64 hex characters
    const CSRF_TOKEN_LIFETIME = 3600; // 1 hour

    // Session Configuration
    const SESSION_LIFETIME = 1800; // 30 minutes
    const SESSION_TIMEOUT_WARNING = 300; // 5 minutes before timeout

    // Rate Limiting Configuration
    const RATE_LIMIT_INIT_REQUESTS = 5; // Max init requests (5) | for testing, x10
    const RATE_LIMIT_INIT_WINDOW = 900; // 15 minutes (900) | for testing, 1 minute
    const RATE_LIMIT_VALIDATION_REQUESTS = 10; // Max validation attempts (10) | for testing, x10
    const RATE_LIMIT_VALIDATION_WINDOW = 3600; // 1 hour (3600) | for testing, 5 minutes (300)

    // Captcha Configuration
    const CAPTCHA_SESSION_LIFETIME = 600; // 10 minutes
    const MAX_CAPTCHA_ATTEMPTS = 5; // Max attempts per CAPTCHA instance
    const CAPTCHA_TIMEOUT = 600; // 10 minutes to complete

    // File Storage
    const TEMP_SESSION_DIR = '/tmp/captcha_sessions';
    const SESSION_FILE_PERMISSIONS = 0600;
    const CLEANUP_INTERVAL = 3600; // Clean old files every hour

    // Security Headers
    const SECURITY_HEADERS = [
        'X-Content-Type-Options' => 'nosniff',
        'X-Frame-Options' => 'DENY',
        'X-XSS-Protection' => '1; mode=block',
        'Strict-Transport-Security' => 'max-age=31536000; includeSubDomains',
        'Content-Security-Policy' => "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'",
    ];

    // CORS Configuration
    const ALLOWED_ORIGINS = [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:3000',
    ];

    // Captcha validation token lifetime
    const VALIDATION_TOKEN_LIFETIME = 3600; // 1 hour

    // Proxy trust configuration
    const TRUST_PROXY_HEADERS = false;
    const TRUSTED_PROXIES = [
        '127.0.0.1',
        '::1',
    ];

    /**
     * Get client IP address safely
     * @return string
     */
    public static function getClientIP() {
        $remoteAddr = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
        $isTrustedProxy = self::TRUST_PROXY_HEADERS && in_array($remoteAddr, self::TRUSTED_PROXIES, true);

        $ip = $remoteAddr;

        // Only trust proxy headers when the direct peer is an explicitly trusted proxy.
        if ($isTrustedProxy && !empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
            $ips = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR']);
            $candidate = trim($ips[0]);
            if (filter_var($candidate, FILTER_VALIDATE_IP)) {
                $ip = $candidate;
            }
        } elseif ($isTrustedProxy && !empty($_SERVER['HTTP_CLIENT_IP'])) {
            $candidate = trim($_SERVER['HTTP_CLIENT_IP']);
            if (filter_var($candidate, FILTER_VALIDATE_IP)) {
                $ip = $candidate;
            }
        }

        if (!filter_var($ip, FILTER_VALIDATE_IP)) {
            $ip = '0.0.0.0';
        }

        return $ip;
    }

    /**
     * Generate a cryptographically secure random token
     * @param int $length Length of token to generate in BYTES (will be doubled as hex characters)
     * @return string
     */
    public static function generateToken($length = 32) {
        try {
            // Generate random bytes and convert to hex (each byte = 2 hex chars)
            $bytes = random_bytes($length);
            return bin2hex($bytes);
        } catch (Exception $e) {
            // Fallback for older PHP versions
            return bin2hex(openssl_random_pseudo_bytes($length));
        }
    }

    /**
     * Basic string sanitization for logs and user-supplied text.
     * @param mixed $value
     * @return string
     */
    public static function sanitize($value) {
        $stringValue = is_string($value) ? $value : (string)$value;
        return trim(strip_tags($stringValue));
    }

    /**
     * Persist a successful CAPTCHA validation into the session.
     * @param string $captchaSessionId
     * @param array $validationData
     * @return void
     */
    public static function storeCaptchaValidation($captchaSessionId, $validationData) {
        if (!class_exists('SessionManager')) {
            require_once __DIR__ . '/SessionManager.php';
        }

        SessionManager::initializeSession();

        if (!isset($_SESSION['CAPTCHA_VALIDATIONS']) || !is_array($_SESSION['CAPTCHA_VALIDATIONS'])) {
            $_SESSION['CAPTCHA_VALIDATIONS'] = [];
        }

        $_SESSION['CAPTCHA_VALIDATIONS'][$captchaSessionId] = $validationData;
    }

    /**
     * Verify if a CAPTCHA validation token is valid and not expired.
     * @param string $validationToken
     * @return array ['valid' => bool, 'data' => array|null]
     */
    public static function verifyCaptchaValidation($validationToken) {
        if (!class_exists('SessionManager')) {
            require_once __DIR__ . '/SessionManager.php';
        }

        SessionManager::initializeSession();

        if (!isset($_SESSION['CAPTCHA_VALIDATIONS']) || !is_array($_SESSION['CAPTCHA_VALIDATIONS'])) {
            return ['valid' => false, 'data' => null];
        }

        foreach ($_SESSION['CAPTCHA_VALIDATIONS'] as $sessionId => $validationData) {
            if (($validationData['validation_token'] ?? null) === $validationToken) {
                if (time() - ($validationData['validated_at'] ?? 0) > self::VALIDATION_TOKEN_LIFETIME) {
                    unset($_SESSION['CAPTCHA_VALIDATIONS'][$sessionId]);
                    return ['valid' => false, 'data' => null];
                }

                return ['valid' => true, 'data' => $validationData];
            }
        }

        return ['valid' => false, 'data' => null];
    }

    /**
     * Consume a CAPTCHA validation token (single-use behavior).
     * @param string $validationToken
     * @return bool
     */
    public static function consumeValidationToken($validationToken) {
        if (!class_exists('SessionManager')) {
            require_once __DIR__ . '/SessionManager.php';
        }

        SessionManager::initializeSession();

        if (!isset($_SESSION['CAPTCHA_VALIDATIONS']) || !is_array($_SESSION['CAPTCHA_VALIDATIONS'])) {
            return false;
        }

        foreach ($_SESSION['CAPTCHA_VALIDATIONS'] as $sessionId => $validationData) {
            if (($validationData['validation_token'] ?? null) === $validationToken) {
                unset($_SESSION['CAPTCHA_VALIDATIONS'][$sessionId]);
                return true;
            }
        }

        return false;
    }

    /**
     * Apply common API hardening headers.
     * @return void
     */
    public static function applyApiSecurityHeaders() {
        foreach (self::SECURITY_HEADERS as $header => $value) {
            header("$header: $value");
        }

        // Prevent caching of security-sensitive JSON responses.
        header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
        header('Pragma: no-cache');
        header('Expires: 0');
        header('Vary: Origin');
    }

    /**
     * Send a 429 response with Retry-After metadata.
     * @param array $rateLimit
     * @return void
     */
    public static function sendRateLimitExceeded($rateLimit) {
        $retryAfter = max(1, (int)($rateLimit['retry_after'] ?? 1));
        header('Retry-After: ' . $retryAfter);
        self::sendResponse([
            'error' => 'Rate limit exceeded',
            'message' => $rateLimit['message'] ?? 'Too many requests',
            'retry_after' => $retryAfter
        ], 429);
    }

    /**
     * Send a JSON response and terminate.
     * @param array $data
     * @param int $httpCode
     * @return void
     */
    public static function sendResponse($data, $httpCode = 200) {
        http_response_code($httpCode);
        echo json_encode($data);
        exit;
    }
}
