#!/usr/bin/env php
<?php
/**
 * Audio Cleanup Script
 * Deletes temporary audio files older than one hour
 *
 * Usage:
 * Manually:
 *   php backend/cleanup_audio.php
 *
 * Cron (every hour):
 *   0 * * * * /usr/bin/php /path/to/backend/cleanup_audio.php >> /var/log/captcha_cleanup.log 2>&1
 */

$audioDir = __DIR__ . '/../public/audio';
$maxAge = 3600; // 1 heure en secondes
$now = time();
$deletedCount = 0;
$totalSize = 0;

if (!is_dir($audioDir)) {
    echo "[" . date('Y-m-d H:i:s') . "] Audio directory not found: $audioDir\n";
    exit(1);
}

echo "[" . date('Y-m-d H:i:s') . "] Starting audio cleanup...\n";

// Parcourir tous les fichiers MP3 dans le répertoire audio
$files = glob($audioDir . '/*.mp3');

if ($files === false) {
    echo "[" . date('Y-m-d H:i:s') . "] Error reading audio directory\n";
    exit(1);
}

foreach ($files as $file) {
    // Ignorer les fichiers d'ambiance (dans le sous-dossier ambience)
    if (strpos($file, '/ambience/') !== false || strpos($file, '\\ambience\\') !== false) {
        continue;
    }

    $fileAge = $now - filemtime($file);

    // Supprimer si le fichier est plus vieux que maxAge
    if ($fileAge > $maxAge) {
        $fileSize = filesize($file);

        if (unlink($file)) {
            $deletedCount++;
            $totalSize += $fileSize;
            echo "[" . date('Y-m-d H:i:s') . "] Deleted: " . basename($file) . " (age: " . round($fileAge / 60) . " minutes, size: " . formatBytes($fileSize) . ")\n";
        } else {
            echo "[" . date('Y-m-d H:i:s') . "] Failed to delete: " . basename($file) . "\n";
        }
    }
}

echo "[" . date('Y-m-d H:i:s') . "] Cleanup complete. Deleted $deletedCount file(s), freed " . formatBytes($totalSize) . "\n";

/**
 * Format bytes to human-readable format
 */
function formatBytes($bytes, $precision = 2) {
    $units = ['B', 'KB', 'MB', 'GB'];

    for ($i = 0; $bytes > 1024 && $i < count($units) - 1; $i++) {
        $bytes /= 1024;
    }

    return round($bytes, $precision) . ' ' . $units[$i];
}

