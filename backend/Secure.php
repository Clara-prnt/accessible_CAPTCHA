<?php
/**
 * Secure.php
 * Security utility class for verifying CAPTCHA validation status
 */

require_once __DIR__ . '/SessionManager.php';

class CaptchaSecurity {

    /**
     * Verify if a CAPTCHA has been successfully validated
     * @param string $validationToken The token received from ValidateCaptcha.php
     * @return array ['valid' => bool, 'data' => array|null]
     */
    public static function verifyCaptchaValidation($validationToken) {
        SessionManager::initializeSession();

        if (!isset($_SESSION['CAPTCHA_VALIDATIONS'])) {
            return ['valid' => false, 'data' => null];
        }

        // Search for the validation token
        foreach ($_SESSION['CAPTCHA_VALIDATIONS'] as $sessionId => $validationData) {
            if ($validationData['validation_token'] === $validationToken) {
                // Check if validation is not too old (1 hour max)
                if (time() - $validationData['validated_at'] > 3600) {
                    unset($_SESSION['CAPTCHA_VALIDATIONS'][$sessionId]);
                    return ['valid' => false, 'data' => null];
                }

                return [
                    'valid' => true,
                    'data' => $validationData
                ];
            }
        }

        return ['valid' => false, 'data' => null];
    }

    /**
     * Consume a validation token (can only be used once)
     * @param string $validationToken The token to consume
     * @return bool True if token was consumed
     */
    public static function consumeValidationToken($validationToken) {
        SessionManager::initializeSession();

        if (!isset($_SESSION['CAPTCHA_VALIDATIONS'])) {
            return false;
        }

        foreach ($_SESSION['CAPTCHA_VALIDATIONS'] as $sessionId => $validationData) {
            if ($validationData['validation_token'] === $validationToken) {
                unset($_SESSION['CAPTCHA_VALIDATIONS'][$sessionId]);
                return true;
            }
        }

        return false;
    }

    /**
     * Send a secure JSON response with proper headers
     * @param array $data The data to send
     * @param int $httpCode The HTTP status code
     */
    public static function sendResponse($data, $httpCode = 200) {
        http_response_code($httpCode);
        echo json_encode($data);
        exit;
    }
}
