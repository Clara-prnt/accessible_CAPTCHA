<?php
/**
 * RateLimiter.php
 * Rate limiting partage entre toutes les sessions pour eviter le bypass via rotation de cookies.
 */

use Random\RandomException;

require_once __DIR__ . '/SecurityConfig.php';

class RateLimiter {

    /**
     * Check if a request should be rate limited (init request)
     * @return array ['allowed' => bool, 'message' => string, 'retry_after' => int]
     * @throws RandomException
     */
    public static function checkInitLimit(): array
    {
        return self::checkLimit(
            'init_requests',
            SecurityConfig::RATE_LIMIT_INIT_REQUESTS,
            SecurityConfig::RATE_LIMIT_INIT_WINDOW
        );
    }

    /**
     * Check if a request should be rate limited (validation request)
     * @return array ['allowed' => bool, 'message' => string, 'retry_after' => int]
     * @throws RandomException
     */
    public static function checkValidationLimit(): array
    {
        return self::checkLimit(
            'validation_requests',
            SecurityConfig::RATE_LIMIT_VALIDATION_REQUESTS,
            SecurityConfig::RATE_LIMIT_VALIDATION_WINDOW
        );
    }

    /**
     * Generic rate limit check
     * @param string $type
     * @param int $maxRequests
     * @param int $timeWindow
     * @return array ['allowed' => bool, 'message' => string, 'retry_after' => int]
     * @throws RandomException
     */
    private static function checkLimit(string $type, int $maxRequests, int $timeWindow): array
    {
        $clientKey = self::buildClientKey($type);
        $path = self::getStoragePath($clientKey);
        $now = time();

        $handle = fopen($path, 'c+');
        if ($handle === false) {
            return [
                'allowed' => false,
                'message' => 'Rate limit storage unavailable. Please retry later.',
                'retry_after' => 10
            ];
        }

        try {
            if (!flock($handle, LOCK_EX)) {
                return [
                    'allowed' => false,
                    'message' => 'Rate limiter busy. Please retry later.',
                    'retry_after' => 2
                ];
            }

            $raw = stream_get_contents($handle);
            $limitData = json_decode($raw ?: '', true);

            if (!is_array($limitData) || !isset($limitData['timestamps'])) {
                $limitData = [
                    'timestamps' => [],
                    'blocked_until' => 0
                ];
            }

            if (($limitData['blocked_until'] ?? 0) > $now) {
                $retryAfter = (int)($limitData['blocked_until'] - $now);
                return [
                    'allowed' => false,
                    'message' => "Rate limit exceeded. Please try again in $retryAfter seconds.",
                    'retry_after' => max(1, $retryAfter)
                ];
            }

            $limitData['timestamps'] = array_filter(
                $limitData['timestamps'] ?? [],
                fn($ts) => ($now - $ts) <= $timeWindow
            );

            if (count($limitData['timestamps']) >= $maxRequests) {
                $oldestTimestamp = min($limitData['timestamps']);
                $retryAfter = max(1, $timeWindow - ($now - $oldestTimestamp));
                $limitData['blocked_until'] = $now + $retryAfter;
                self::persist($handle, $limitData);

                return [
                    'allowed' => false,
                    'message' => "Too many requests. Please try again in $retryAfter seconds.",
                    'retry_after' => $retryAfter
                ];
            }

            $limitData['timestamps'][] = $now;
            $limitData['blocked_until'] = 0;
            self::persist($handle, $limitData);

            return [
                'allowed' => true,
                'message' => 'OK',
                'retry_after' => 0
            ];
        } finally {
            flock($handle, LOCK_UN);
            fclose($handle);
            self::cleanupStorageIfNeeded();
        }
    }

    /**
     * Record a successful CAPTCHA completion (slight penalty reduction)
     * @param string $type
     */
    public static function recordSuccess(string $type = 'validation_requests'): void
    {
        $clientKey = self::buildClientKey($type);
        $path = self::getStoragePath($clientKey);

        $handle = fopen($path, 'c+');
        if ($handle === false) {
            return;
        }

        try {
            if (!flock($handle, LOCK_EX)) {
                return;
            }

            $raw = stream_get_contents($handle);
            $limitData = json_decode($raw ?: '', true);
            if (!is_array($limitData) || !isset($limitData['timestamps'])) {
                return;
            }

            if (count($limitData['timestamps']) > 0) {
                array_pop($limitData['timestamps']);
                self::persist($handle, $limitData);
            }
        } finally {
            flock($handle, LOCK_UN);
            fclose($handle);
        }
    }

    /**
     * Build per-client key from stable signals.
     * @param string $type
     * @return string
     */
    private static function buildClientKey(string $type): string
    {
        $ip = SecurityConfig::getClientIP();
        $ua = $_SERVER['HTTP_USER_AGENT'] ?? 'unknown';
        $uaHash = substr(hash('sha256', $ua), 0, 16);
        return $type . '|' . $ip . '|' . $uaHash;
    }

    /**
     * @param string $clientKey
     * @return string
     */
    private static function getStoragePath(string $clientKey): string
    {
        $dir = __DIR__ . '/../tmp/rate_limit';
        if (!is_dir($dir)) {
            @mkdir($dir, 0700, true);
        }

        $safeName = hash('sha256', $clientKey) . '.json';
        return $dir . '/' . $safeName;
    }

    /**
     * @param resource $handle
     * @param array $limitData
     * @return void
     */
    private static function persist($handle, array $limitData): void
    {
        rewind($handle);
        ftruncate($handle, 0);
        fwrite($handle, json_encode($limitData));
        fflush($handle);
    }

    /**
     * Cleanup stale limiter files opportunistically.
     * @return void
     * @throws RandomException
     */
    private static function cleanupStorageIfNeeded(): void
    {
        // Run cleanup rarely to avoid overhead on every request.
        if (random_int(1, 100) !== 1) {
            return;
        }

        $dir = __DIR__ . '/../tmp/rate_limit';
        if (!is_dir($dir)) {
            return;
        }

        $now = time();
        $maxAge = max(SecurityConfig::RATE_LIMIT_INIT_WINDOW, SecurityConfig::RATE_LIMIT_VALIDATION_WINDOW) * 3;

        foreach (glob($dir . '/*.json') ?: [] as $file) {
            $mtime = @filemtime($file);
            if ($mtime !== false && ($now - $mtime) > $maxAge) {
                @unlink($file);
            }
        }
    }
}
