<?php
/**
 * SecurityConfig.php
 * Configuration centralisée de sécurité pour le système CAPTCHA
 */

class SecurityConfig {
    // CSRF Token Configuration
    const CSRF_TOKEN_LENGTH = 64;  // 32 bytes = 64 hex characters
    const CSRF_TOKEN_LIFETIME = 3600; // 1 hour in seconds

    // Session Configuration
    const SESSION_LIFETIME = 1800; // 30 minutes
    const SESSION_TIMEOUT_WARNING = 300; // 5 minutes before timeout

    // Rate Limiting Configuration
    const RATE_LIMIT_INIT_REQUESTS = 5; // Max init requests
    const RATE_LIMIT_INIT_WINDOW = 900; // 15 minutes in seconds
    const RATE_LIMIT_VALIDATION_REQUESTS = 10; // Max validation attempts
    const RATE_LIMIT_VALIDATION_WINDOW = 3600; // 1 hour in seconds

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

    /**
     * Get client IP address safely
     * @return string
     */
    public static function getClientIP() {
        // Check for IP from a shared internet
        if (!empty($_SERVER['HTTP_CLIENT_IP'])) {
            $ip = $_SERVER['HTTP_CLIENT_IP'];
        }
        // Check for IP passed from proxy
        elseif (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
            // Handle multiple IPs (take the first one)
            $ips = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR']);
            $ip = trim($ips[0]);
        }
        // Check for remote address
        else {
            $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
        }

        // Validate IP
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
}

