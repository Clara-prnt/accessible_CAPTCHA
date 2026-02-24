<?php
/**
 * RateLimiter.php
 * Implémente le rate limiting basé sur l'IP
 */

require_once __DIR__ . '/SecurityConfig.php';
require_once __DIR__ . '/SessionManager.php';

class RateLimiter {

    /**
     * Check if a request should be rate limited (init request)
     * @return array ['allowed' => bool, 'message' => string, 'retry_after' => int]
     */
    public static function checkInitLimit() {
        return self::checkLimit(
            'init_requests',
            SecurityConfig::RATE_LIMIT_INIT_REQUESTS,
            SecurityConfig::RATE_LIMIT_INIT_WINDOW
        );
    }

    /**
     * Check if a request should be rate limited (validation request)
     * @return array ['allowed' => bool, 'message' => string, 'retry_after' => int]
     */
    public static function checkValidationLimit() {
        return self::checkLimit(
            'validation_requests',
            SecurityConfig::RATE_LIMIT_VALIDATION_REQUESTS,
            SecurityConfig::RATE_LIMIT_VALIDATION_WINDOW
        );
    }

    /**
     * Generic rate limit check
     * @param string $type Type of limit (used as key in session)
     * @param int $maxRequests Maximum number of requests allowed
     * @param int $timeWindow Time window in seconds
     * @return array ['allowed' => bool, 'message' => string, 'retry_after' => int]
     */
    private static function checkLimit($type, $maxRequests, $timeWindow) {
        SessionManager::initializeSession();

        $clientIP = SecurityConfig::getClientIP();
        $key = 'RATE_LIMIT_' . $type . '_' . $clientIP;

        $now = time();

        // Initialize or retrieve rate limit data
        if (!isset($_SESSION[$key])) {
            $_SESSION[$key] = [
                'count' => 0,
                'window_start' => $now,
                'blocked_until' => 0
            ];
        }

        $limitData = &$_SESSION[$key];

        // Check if user is still blocked
        if ($limitData['blocked_until'] > $now) {
            $retryAfter = $limitData['blocked_until'] - $now;
            return [
                'allowed' => false,
                'message' => "Rate limit exceeded. Please try again in $retryAfter seconds.",
                'retry_after' => $retryAfter
            ];
        }

        // Check if we're still in the current time window
        if ($now - $limitData['window_start'] > $timeWindow) {
            // Reset the window
            $limitData['count'] = 0;
            $limitData['window_start'] = $now;
        }

        // Check if request count exceeds limit
        if ($limitData['count'] >= $maxRequests) {
            // Block for the remainder of the window
            $retryAfter = $timeWindow - ($now - $limitData['window_start']);
            $limitData['blocked_until'] = $now + $retryAfter;

            return [
                'allowed' => false,
                'message' => "Too many requests. Please try again in $retryAfter seconds.",
                'retry_after' => $retryAfter
            ];
        }

        // Increment request count
        $limitData['count']++;
        $_SESSION[$key] = $limitData;

        return [
            'allowed' => true,
            'message' => 'OK',
            'retry_after' => 0
        ];
    }

    /**
     * Record a successful CAPTCHA completion (reduces rate limit pressure)
     * @param string $type Type of limit
     */
    public static function recordSuccess($type = 'validation_requests') {
        SessionManager::initializeSession();

        $clientIP = SecurityConfig::getClientIP();
        $key = 'RATE_LIMIT_' . $type . '_' . $clientIP;

        if (isset($_SESSION[$key])) {
            // Reduce count by 1 (but not below 0) on success
            $_SESSION[$key]['count'] = max(0, $_SESSION[$key]['count'] - 1);
        }
    }
}

