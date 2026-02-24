<?php
/**
 * InputValidator.php
 * Valide et nettoie les entrées utilisateur
 */

class InputValidator {

    /**
     * Validate scenario ID
     * @param mixed $scenarioId The scenario ID to validate
     * @return bool True if valid
     */
    public static function validateScenarioId($scenarioId) {
        // Scenario ID should be a string (UUID or similar)
        if (!is_string($scenarioId)) {
            return false;
        }

        // Should not be empty
        if (empty(trim($scenarioId))) {
            return false;
        }

        // Max length check
        if (strlen($scenarioId) > 255) {
            return false;
        }

        // Allow only alphanumeric, hyphens, and underscores
        if (!preg_match('/^[a-zA-Z0-9\-_]+$/', $scenarioId)) {
            return false;
        }

        return true;
    }

    /**
     * Validate target word
     * @param mixed $targetWord The word to validate
     * @return bool True if valid
     */
    public static function validateTargetWord($targetWord) {
        // Should be a string
        if (!is_string($targetWord)) {
            return false;
        }

        // Should not be empty
        if (empty(trim($targetWord))) {
            return false;
        }

        // Max length check (words shouldn't be extremely long)
        if (strlen($targetWord) > 100) {
            return false;
        }

        // Allow only letters, spaces, hyphens, and apostrophes
        if (!preg_match("/^[a-zA-Z\s'\-]+$/u", $targetWord)) {
            return false;
        }

        return true;
    }

    /**
     * Validate CSRF token format
     * @param mixed $token The token to validate
     * @return bool True if valid format
     */
    public static function validateCSRFTokenFormat($token) {
        // Should be a string
        if (!is_string($token)) {
            return false;
        }

        // Should not be empty
        if (empty($token)) {
            return false;
        }

        // Should be hex string of correct length
        if (!preg_match('/^[a-f0-9]{64}$/', $token)) {
            return false;
        }

        return true;
    }

    /**
     * Validate CAPTCHA session ID
     * @param mixed $sessionId The session ID to validate
     * @return bool True if valid
     */
    public static function validateCaptchaSessionId($sessionId) {
        // Should be a string
        if (!is_string($sessionId)) {
            return false;
        }

        // Should not be empty
        if (empty(trim($sessionId))) {
            return false;
        }

        // Should be hex string (from uniqid or similar)
        if (!preg_match('/^[a-f0-9]+$/', $sessionId)) {
            return false;
        }

        // Reasonable length
        if (strlen($sessionId) > 100) {
            return false;
        }

        return true;
    }

    /**
     * Sanitize JSON input
     * @param array $input The decoded JSON input
     * @param array $required Required keys in the input
     * @return bool True if input has all required keys
     */
    public static function validateJSONInput($input, $required = []) {
        if (!is_array($input)) {
            return false;
        }

        foreach ($required as $key) {
            if (!isset($input[$key])) {
                return false;
            }
        }

        return true;
    }

    /**
     * Validate click data
     * @param mixed $clicks The click data to validate
     * @return bool True if valid
     */
    public static function validateClickData($clicks) {
        // Should be an array or integer
        if (is_integer($clicks)) {
            return $clicks >= 0 && $clicks <= 100;
        }

        if (is_array($clicks)) {
            if (count($clicks) > 100) {
                return false;
            }

            foreach ($clicks as $click) {
                if (!is_numeric($click) || $click < 0) {
                    return false;
                }
            }

            return true;
        }

        return false;
    }
}

