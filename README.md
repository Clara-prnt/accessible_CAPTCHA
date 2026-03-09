# Accessible CAPTCHA Project

## 📝 Overview

This project aims to create an accessible and secure CAPTCHA for everyone. Traditional CAPTCHAs often present significant barriers for blind and visually impaired users, preventing them from accessing websites and services independently.

This CAPTCHA system will be designed with accessibility in mind, ensuring that all users can verify their identity online without facing unnecessary obstacles.

## 🔎 How it works

The CAPTCHA will utilize a combination of audio and text-based challenges that can be easily navigated using screen readers and other assistive technologies. Users will be presented with a simple question or task that can be completed without relying on visual cues.

The user will listen to an audio prompt or read a text-based challenge and provide their response using the space key or clicking directly on the screen. The system will then verify the response to confirm that the user is human.

## ❓ Purpose

This is a prototype open source project designed to help others add accessible CAPTCHAs to their websites. We are particularly focused on addressing the needs of blind and visually impaired people who are especially blocked by traditional visual CAPTCHAs.

## 🎯 Goals

- Create a CAPTCHA system that is both secure and accessible
- Provide an alternative to traditional image-based CAPTCHAs
- Enable all users, regardless of visual ability, to verify their identity online
- Offer an open source solution that developers can integrate into their own projects

## ⚙️ Starting process

**📋 Prerequisites:** Make sure you have installed all system requirements. See [PREREQUISITES.md](PREREQUISITES.md) for detailed instructions.

To start the project on localhost, go into your terminal and run the following commands:
```powershell
cd C:\your_path\captcha_vite
.\start.ps1
```

That's it! The script will:
- ✅ Verify that PHP and npm are installed
- ✅ Start the PHP server automatically
- ✅ Start Vite automatically
- ✅ Open your browser automatically

## 🧹 Maintenance

### Audio File Cleanup

Audio files are generated temporarily and should be cleaned regularly to avoid disk space issues.

**Manual cleanup:**
```bash
php backend/cleanup_audio.php
```

**Automatic cleanup (recommended for production):**

Add to crontab (Linux/macOS):
```bash
# Clean audio files every hour
0 * * * * /usr/bin/php /path/to/backend/cleanup_audio.php >> /var/log/captcha_cleanup.log 2>&1
```

Windows Task Scheduler:
- Program: `C:\path\to\php.exe`
- Arguments: `C:\path\to\backend\cleanup_audio.php`
- Trigger: Daily, repeat every 1 hour

## Security anti-bot tests

Run the automated anti-bot checks locally:

```powershell
cd C:\your_path\captcha_vite
powershell -ExecutionPolicy Bypass -File .\security-bot-check.ps1 -ResetRateLimit
```

Generate a report to a custom file:

```powershell
powershell -ExecutionPolicy Bypass -File .\security-bot-check.ps1 -BaseUrl "http://127.0.0.1:8000/backend" -ResetRateLimit -ReportPath ".\security-bot-check-report.txt"
```

CI automation is configured in `.github/workflows/security-bot-check.yml`.
It runs on push, pull request, and manual trigger, then uploads `security-bot-check-report.txt` as an artifact.
