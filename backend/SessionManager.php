<?php
/**
 * SessionManager.php
 * Gère les sessions sécurisées et les tokens CSRF
 */

require_once __DIR__ . '/SecurityConfig.php';

class SessionManager {

    /**
     * Initialize secure session
     */
    public static function initializeSession(): void
    {
        if (session_status() === PHP_SESSION_NONE) {
            // Session configuration
            ini_set('session.use_strict_mode', 1);
            ini_set('session.use_only_cookies', 1);
            ini_set('session.cookie_httponly', 1);
            ini_set('session.cookie_secure', self::isSecureConnection());
            ini_set('session.cookie_samesite', 'Strict');
            ini_set('session.gc_maxlifetime', SecurityConfig::SESSION_LIFETIME);

            session_start();

            // Check for session timeout
            if (isset($_SESSION['LAST_ACTIVITY'])) {
                if (time() - $_SESSION['LAST_ACTIVITY'] > SecurityConfig::SESSION_LIFETIME) {
                    session_unset();
                    session_destroy();
                    session_start();
                }
            }

            $_SESSION['LAST_ACTIVITY'] = time();
        }
    }

    /**
     * Generate and store CSRF token
     * @return string The CSRF token
     */
    public static function generateCSRFToken(): string
    {
        self::initializeSession();

        $token = SecurityConfig::generateToken();

        if (!isset($_SESSION['CSRF_TOKENS'])) {
            $_SESSION['CSRF_TOKENS'] = [];
        }

        $_SESSION['CSRF_TOKENS'][$token] = time();

        // Clean old tokens (older than CSRF_TOKEN_LIFETIME)
        self::cleanOldCSRFTokens();

        return $token;
    }

    /**
     * Validate CSRF token
     * @param string $token The token to validate
     * @return bool True if valid, false otherwise
     */
    public static function validateCSRFToken(string $token): bool
    {
        self::initializeSession();

        if (!isset($_SESSION['CSRF_TOKENS']) || !is_array($_SESSION['CSRF_TOKENS'])) {
            return false;
        }

        if (!isset($_SESSION['CSRF_TOKENS'][$token])) {
            return false;
        }

        $tokenTime = $_SESSION['CSRF_TOKENS'][$token];

        // Check if token is expired
        unset($_SESSION['CSRF_TOKENS'][$token]);
        if (time() - $tokenTime > SecurityConfig::CSRF_TOKEN_LIFETIME) {
            return false;
        }

        // Token is valid, remove it (one-time use with rotation)

        return true;
    }

    /**
     * Clean expired CSRF tokens
     */
    private static function cleanOldCSRFTokens(): void
    {
        if (!isset($_SESSION['CSRF_TOKENS'])) {
            return;
        }

        $now = time();
        foreach ($_SESSION['CSRF_TOKENS'] as $token => $timestamp) {
            if ($now - $timestamp > SecurityConfig::CSRF_TOKEN_LIFETIME) {
                unset($_SESSION['CSRF_TOKENS'][$token]);
            }
        }
    }

    /**
     * Get or create session ID
     * @return string Session ID
     */
    public static function getSessionId(): string
    {
        self::initializeSession();
        return session_id();
    }

    /**
     * Store CAPTCHA session data
     * @param string $captchaSessionId Unique ID for this CAPTCHA instance
     * @param array $data Data to store
     */
    public static function setCaptchaData(string $captchaSessionId, array $data): void
    {
        self::initializeSession();

        if (!isset($_SESSION['CAPTCHA_SESSIONS'])) {
            $_SESSION['CAPTCHA_SESSIONS'] = [];
        }

        $_SESSION['CAPTCHA_SESSIONS'][$captchaSessionId] = [
            'data' => $data,
            'timestamp' => time(),
            'ip' => SecurityConfig::getClientIP()
        ];
    }

    /**
     * Get CAPTCHA session data
     * @param string $captchaSessionId Unique ID for this CAPTCHA instance
     * @return array|null The stored data or null if not found/expired
     */
    public static function getCaptchaData(string $captchaSessionId): ?array
    {
        self::initializeSession();

        if (!isset($_SESSION['CAPTCHA_SESSIONS'][$captchaSessionId])) {
            return null;
        }

        $session = $_SESSION['CAPTCHA_SESSIONS'][$captchaSessionId];

        // Check if session has expired
        if (time() - $session['timestamp'] > SecurityConfig::CAPTCHA_SESSION_LIFETIME) {
            unset($_SESSION['CAPTCHA_SESSIONS'][$captchaSessionId]);
            return null;
        }

        // Check IP consistency (detect IP spoofing)
        if ($session['ip'] !== SecurityConfig::getClientIP()) {
            unset($_SESSION['CAPTCHA_SESSIONS'][$captchaSessionId]);
            return null;
        }

        return $session['data'];
    }

    /**
     * Destroy a CAPTCHA session
     * @param string $captchaSessionId Unique ID for this CAPTCHA instance
     */
    public static function destroyCaptchaSession(string $captchaSessionId): void
    {
        self::initializeSession();

        if (isset($_SESSION['CAPTCHA_SESSIONS'][$captchaSessionId])) {
            unset($_SESSION['CAPTCHA_SESSIONS'][$captchaSessionId]);
        }
    }

    /**
     * Check if connection is secure (HTTPS)
     * @return bool
     */
    private static function isSecureConnection(): bool
    {
        return !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
    }
}

