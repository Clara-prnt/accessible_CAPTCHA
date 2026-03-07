<?php
/**
 * Report Problem Handler
 * Receives and logs user-reported issues with the CAPTCHA system
 */

require_once __DIR__ . '/SecurityConfig.php';

header('Content-Type: application/json');

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    SecurityConfig::sendResponse(['success' => false, 'error' => 'Method not allowed'], 405);
}

// Get JSON input
$input = json_decode(file_get_contents('php://input'), true);

if (!$input) {
    SecurityConfig::sendResponse(['success' => false, 'error' => 'Invalid JSON input'], 400);
}

// Validate required fields
$requiredFields = ['type', 'description'];
foreach ($requiredFields as $field) {
    if (empty($input[$field])) {
        SecurityConfig::sendResponse(['success' => false, 'error' => "Missing required field: $field"], 400);
    }
}

// Sanitize inputs
$report = [
    'type' => SecurityConfig::sanitize($input['type']),
    'description' => SecurityConfig::sanitize($input['description']),
    'email' => !empty($input['email']) ? filter_var($input['email'], FILTER_VALIDATE_EMAIL) : null,
    'captcha_session_id' => !empty($input['captcha_session_id']) ? SecurityConfig::sanitize($input['captcha_session_id']) : null,
    'scenario_id' => !empty($input['scenario_id']) ? SecurityConfig::sanitize($input['scenario_id']) : null,
    'user_agent' => !empty($input['user_agent']) ? SecurityConfig::sanitize($input['user_agent']) : ($_SERVER['HTTP_USER_AGENT'] ?? 'Unknown'),
    'ip_address' => SecurityConfig::getClientIP(),
    'timestamp' => !empty($input['timestamp']) ? SecurityConfig::sanitize($input['timestamp']) : date('c'),
    'server_timestamp' => date('c')
];

// Generate unique report ID
$reportId = 'REP-' . strtoupper(substr(md5(uniqid(rand(), true)), 0, 10));
$report['report_id'] = $reportId;

// Log the report
$logDir = __DIR__ . '/../logs/reports';
if (!file_exists($logDir)) {
    mkdir($logDir, 0755, true);
}

$logFile = $logDir . '/problem_reports_' . date('Y-m') . '.json';
$reports = [];

if (file_exists($logFile)) {
    $existingData = file_get_contents($logFile);
    $reports = json_decode($existingData, true) ?? [];
}

$reports[] = $report;
file_put_contents($logFile, json_encode($reports, JSON_PRETTY_PRINT));

// Also log to a simple text file for easy reading
$textLogFile = $logDir . '/problem_reports_' . date('Y-m') . '.log';
$logEntry = sprintf(
    "[%s] Report ID: %s\nType: %s\nDescription: %s\nEmail: %s\nSession: %s\nScenario: %s\nUser Agent: %s\nIP: %s\n%s\n",
    $report['server_timestamp'],
    $reportId,
    $report['type'],
    $report['description'],
    $report['email'] ?? 'Not provided',
    $report['captcha_session_id'] ?? 'Unknown',
    $report['scenario_id'] ?? 'Unknown',
    $report['user_agent'],
    $report['ip_address'],
    str_repeat('-', 80)
);
file_put_contents($textLogFile, $logEntry, FILE_APPEND);

// Send notification email if configured (optional)
if (defined('ADMIN_EMAIL') && ADMIN_EMAIL) {
    $subject = "CAPTCHA Problem Report: {$report['type']}";
    $message = "A new problem report has been submitted:\n\n";
    $message .= "Report ID: $reportId\n";
    $message .= "Type: {$report['type']}\n";
    $message .= "Description: {$report['description']}\n";
    $message .= "Email: " . ($report['email'] ?? 'Not provided') . "\n";
    $message .= "Session ID: " . ($report['captcha_session_id'] ?? 'Unknown') . "\n";
    $message .= "Scenario: " . ($report['scenario_id'] ?? 'Unknown') . "\n";
    $message .= "Timestamp: {$report['server_timestamp']}\n";
    $message .= "User Agent: {$report['user_agent']}\n";
    $message .= "IP Address: {$report['ip_address']}\n";

    $headers = "From: noreply@example.com\r\n";
    if ($report['email']) {
        $headers .= "Reply-To: {$report['email']}\r\n";
    }

    @mail(ADMIN_EMAIL, $subject, $message, $headers);
}

// Return success response
SecurityConfig::sendResponse([
    'success' => true,
    'report_id' => $reportId,
    'message' => 'Problem report received successfully',
    'timestamp' => $report['server_timestamp']
]);

