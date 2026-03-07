/**
 * CAPTCHA Actions Module
 * Handles Support, Reload, and Report Problem functionality
 */

export class CaptchaActions {
  constructor(captchaGenerator) {
    this.captchaGenerator = captchaGenerator;
    this.supportButton = null;
    this.reloadButton = null;
    this.reportButton = null;
  }

  /**
   * Initialize all button handlers
   */
  initialize() {
    this.supportButton = document.getElementById('support-link');
    this.reloadButton = document.getElementById('reload-link');
    this.reportButton = document.getElementById('report-link');

    if (this.supportButton) {
      this.supportButton.addEventListener('click', (e) => {
        e.preventDefault();
        this.showSupportModal();
      });
      this.supportButton.setAttribute('aria-label', 'Get help with CAPTCHA');
    }

    if (this.reloadButton) {
      this.reloadButton.addEventListener('click', (e) => {
        e.preventDefault();
        this.reloadCaptcha().then(() => {});
      });
      this.reloadButton.setAttribute('aria-label', 'Reload CAPTCHA with new challenge');
    }

    if (this.reportButton) {
      this.reportButton.addEventListener('click', (e) => {
        e.preventDefault();
        this.showReportModal();
      });
      this.reportButton.setAttribute('aria-label', 'Report a problem with this CAPTCHA');
    }
  }

  /**
   * Show Support Modal with help options
   */
  showSupportModal() {
    const modal = this.createModal('Get Help & Support', `
      <p>Need help with the CAPTCHA verification? We're here to assist you.</p>
      
      <div class="support-options">
        <div class="support-option" role="button" tabindex="0" data-action="faq">
          <div class="support-option-icon">❓</div>
          <div class="support-option-title">FAQ</div>
          <div class="support-option-desc">Common questions and answers</div>
        </div>
        
        <div class="support-option" role="button" tabindex="0" data-action="accessibility">
          <div class="support-option-icon">♿</div>
          <div class="support-option-title">Accessibility</div>
          <div class="support-option-desc">Alternative verification methods</div>
        </div>
        
        <div class="support-option" role="button" tabindex="0" data-action="contact">
          <div class="support-option-icon">📧</div>
          <div class="support-option-title">Contact Support</div>
          <div class="support-option-desc">Get in touch with our team</div>
        </div>
        
        <div class="support-option" role="button" tabindex="0" data-action="technical">
          <div class="support-option-icon">🔧</div>
          <div class="support-option-title">Technical Issues</div>
          <div class="support-option-desc">Browser or device problems</div>
        </div>
      </div>
    `);

    // Track modal history for back navigation
    modal.setAttribute('data-modal-history', JSON.stringify(['main']));

    // Add click handlers for support options
    modal.querySelectorAll('.support-option').forEach(option => {
      option.addEventListener('click', () => {
        const action = option.getAttribute('data-action');
        this.handleSupportAction(action, modal);
      });

      // Keyboard support
      option.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          const action = option.getAttribute('data-action');
          this.handleSupportAction(action, modal);
        }
      });
    });
  }

  /**
   * Handle specific support actions
   */
  handleSupportAction(action, modal) {
    const content = modal.querySelector('.modal-content');
    const history = JSON.parse(modal.getAttribute('data-modal-history') || '["main"]');

    switch(action) {
      case 'faq':
        history.push('faq');
        modal.setAttribute('data-modal-history', JSON.stringify(history));
        content.innerHTML = `
          <h3>Frequently Asked Questions</h3>
          
          <h4>How does this CAPTCHA work?</h4>
          <p>Listen to the audio scenario and press Shift 2-3 times rapidly when you hear or see the target word.</p>
          
          <h4>Can I use keyboard only?</h4>
          <p>Yes! Press <kbd>Shift</kbd> to validate instead of clicking. Press <kbd>Alt+H</kbd> for keyboard shortcuts.</p>
          
          <h4>Audio not working?</h4>
          <p>Check your browser's audio permissions and volume settings. You can adjust speed and volume using the controls.</p>
          
          <h4>Failed the CAPTCHA?</h4>
          <p>You have 2 attempts per challenge. If you exhaust all attempts, the page will reload automatically.</p>
          
          <h4>Need more time?</h4>
          <p>You can pause the audio anytime and replay it as many times as needed.</p>
          
          <div class="support-action-buttons">
            <button class="btn-secondary" id="support-back-btn">← Back</button>
          </div>
        `;
        this.setupBackButton(modal, history);
        break;

      case 'accessibility':
        history.push('accessibility');
        modal.setAttribute('data-modal-history', JSON.stringify(history));
        content.innerHTML = `
          <h3>Accessibility Features</h3>
          
          <p>Our CAPTCHA is designed with accessibility in mind:</p>
          
          <ul>
            <li><strong>Screen Reader Support:</strong> Full ARIA labels and live regions</li>
            <li><strong>Keyboard Navigation:</strong> Complete keyboard control with Tab, Shift, Enter</li>
            <li><strong>Audio Controls:</strong> Adjustable volume and playback speed</li>
            <li><strong>High Contrast:</strong> Automatic support for high contrast modes</li>
            <li><strong>Reduced Motion:</strong> Respects prefers-reduced-motion settings</li>
          </ul>
          
          <h4>Keyboard Shortcuts</h4>
          <ul>
            <li><kbd>Tab</kbd> / <kbd>Shift+Tab</kbd> - Navigate between elements</li>
            <li><kbd>Shift</kbd> - Register click (same as mouse click)</li>
            <li><kbd>Space</kbd> / <kbd>Enter</kbd> - Activate buttons</li>
            <li><kbd>Alt+H</kbd> - Show keyboard help</li>
          </ul>
          
          <p>If you need additional assistance, please contact our support team at <a href="mailto:support@example.com">support@example.com</a></p>
          
          <div class="support-action-buttons">
            <button class="btn-secondary" id="support-back-btn">← Back</button>
          </div>
        `;
        this.setupBackButton(modal, history);
        break;

      case 'contact':
        history.push('contact');
        modal.setAttribute('data-modal-history', JSON.stringify(history));
        content.innerHTML = `
          <h3>Contact Support</h3>
          
          <p>Need personalized assistance? Our support team is ready to help!</p>
          
          <div style="margin: 1.5rem 0;">
            <p><strong>📧 Email:</strong> <a href="mailto:support@example.com">support@example.com</a></p>
            <p><strong>📞 Phone:</strong> +1 (555) 123-4567 (Mon-Fri, 9am-5pm EST)</p>
            <p><strong>💬 Live Chat:</strong> Available on our website</p>
            <p><strong>🕐 Response Time:</strong> Usually within 24 hours</p>
          </div>
          
          <p>Please include details about your issue, browser version, and any error messages you see.</p>
          
          <div class="support-action-buttons">
            <button class="btn-secondary" id="support-back-btn">← Back</button>
          </div>
        `;
        this.setupBackButton(modal, history);
        break;

      case 'technical':
        history.push('technical');
        modal.setAttribute('data-modal-history', JSON.stringify(history));
        content.innerHTML = `
          <h3>Technical Requirements & Troubleshooting</h3>
          
          <h4>System Requirements</h4>
          <ul>
            <li>Modern web browser (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)</li>
            <li>JavaScript enabled</li>
            <li>Audio playback capability</li>
            <li>Stable internet connection</li>
          </ul>
          
          <h4>Common Issues & Solutions</h4>
          
          <p><strong>Audio not playing:</strong></p>
          <ul>
            <li>Check browser audio permissions</li>
            <li>Ensure system volume is not muted</li>
            <li>Try refreshing the page</li>
            <li>Clear browser cache and cookies</li>
          </ul>
          
          <p><strong>CAPTCHA not loading:</strong></p>
          <ul>
            <li>Disable ad blockers temporarily</li>
            <li>Check browser console for errors (F12)</li>
            <li>Try a different browser</li>
            <li>Check your internet connection</li>
          </ul>
          
          <p><strong>Validation not working:</strong></p>
          <ul>
            <li>Ensure you're clicking/pressing Shift quickly (within 1200ms)</li>
            <li>Make sure audio is playing when you click</li>
            <li>Try clicking on the correct word only</li>
          </ul>
          
          <div class="support-action-buttons">
            <button class="btn-secondary" id="support-back-btn">← Back</button>
          </div>
        `;
        this.setupBackButton(modal, history);
        break;
    }
  }

  /**
   * Setup back button for support sections
   */
  setupBackButton(modal, history) {
    const backBtn = modal.querySelector('#support-back-btn');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        history.pop(); // Remove current section from history
        if (history.length > 0) {
          // Show main menu again
          modal.setAttribute('data-modal-history', JSON.stringify(['main']));
          this.showSupportModalContent(modal);
        } else {
          // This shouldn't happen, but close just in case
          modal.remove();
        }
      });
    }
  }

  /**
   * Show main support modal content
   */
  showSupportModalContent(modal) {
    const content = modal.querySelector('.modal-content');
    content.innerHTML = `
      <p>Need help with the CAPTCHA verification? We're here to assist you.</p>
      
      <div class="support-options">
        <div class="support-option" role="button" tabindex="0" data-action="faq">
          <div class="support-option-icon">❓</div>
          <div class="support-option-title">FAQ</div>
          <div class="support-option-desc">Common questions and answers</div>
        </div>
        
        <div class="support-option" role="button" tabindex="0" data-action="accessibility">
          <div class="support-option-icon">♿</div>
          <div class="support-option-title">Accessibility</div>
          <div class="support-option-desc">Alternative verification methods</div>
        </div>
        
        <div class="support-option" role="button" tabindex="0" data-action="contact">
          <div class="support-option-icon">📧</div>
          <div class="support-option-title">Contact Support</div>
          <div class="support-option-desc">Get in touch with our team</div>
        </div>
        
        <div class="support-option" role="button" tabindex="0" data-action="technical">
          <div class="support-option-icon">🔧</div>
          <div class="support-option-title">Technical Issues</div>
          <div class="support-option-desc">Browser or device problems</div>
        </div>
      </div>
    `;

    // Re-attach click handlers for support options
    modal.querySelectorAll('.support-option').forEach(option => {
      option.addEventListener('click', () => {
        const action = option.getAttribute('data-action');
        this.handleSupportAction(action, modal);
      });

      // Keyboard support
      option.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          const action = option.getAttribute('data-action');
          this.handleSupportAction(action, modal);
        }
      });
    });
  }

  /**
   * Reload CAPTCHA with a new challenge
   */
  async reloadCaptcha() {
    // Show loading state
    const captchaContainer = document.getElementById('captcha');
    const explanation = document.getElementById('explanation');
    const originalContent = captchaContainer.innerHTML;

    captchaContainer.innerHTML = `
      <div style="text-align: center; padding: 2rem;">
        <div style="font-size: 3em; animation: spin 1s linear infinite;">🔄</div>
        <p>Loading new CAPTCHA challenge...</p>
      </div>
    `;
    explanation.textContent = 'Please wait...';

    try {
      // Cleanup current instance
      if (this.captchaGenerator) {
        this.captchaGenerator.cleanup();
      }

      // Wait a moment for visual feedback
      await new Promise(resolve => setTimeout(resolve, 500));

      // Clear the container to remove loading state before initializing
      captchaContainer.innerHTML = '';
      explanation.textContent = '';

      // Initialize new CAPTCHA
      await this.captchaGenerator.initialize();

      // Announce to screen readers
      if (this.captchaGenerator.accessibility) {
        this.captchaGenerator.accessibility.announce(
          'New CAPTCHA challenge loaded. Listen to the audio and follow the instructions.',
          'polite'
        );
      }
    } catch (error) {
      captchaContainer.innerHTML = originalContent;
      this.showError('Failed to reload CAPTCHA. Please try again.');
    }
  }

  /**
   * Show Report Problem Modal
   */
  showReportModal() {
    const modal = this.createModal('Report a Problem', `
      <p>Help us improve by reporting issues with this CAPTCHA. Your feedback is valuable!</p>
      
      <form class="report-form" id="report-form">
        <div>
          <label for="report-type">Problem Type *</label>
          <select id="report-type" name="type" required>
            <option value="">Select a problem type...</option>
            <option value="audio">Audio not playing or unclear</option>
            <option value="validation">Validation not working correctly</option>
            <option value="accessibility">Accessibility issue</option>
            <option value="performance">Performance or loading issue</option>
            <option value="incorrect">Incorrect scenario or words</option>
            <option value="other">Other issue</option>
          </select>
        </div>
        
        <div>
          <label for="report-description">Description *</label>
          <textarea 
            id="report-description" 
            name="description" 
            placeholder="Please describe the issue in detail..."
            required
          ></textarea>
        </div>
        
        <div>
          <label for="report-email">Email (optional)</label>
          <input 
            type="email" 
            id="report-email" 
            name="email" 
            placeholder="your.email@example.com"
          />
          <small style="color: #666; font-size: 0.9em;">We'll only use this to follow up on your report</small>
        </div>
        
        <div class="report-form-actions">
          <button type="button" class="btn-secondary" onclick="this.closest('.modal-overlay').remove()">
            Cancel
          </button>
          <button type="submit" class="btn-primary">
            Submit Report
          </button>
        </div>
      </form>
    `);

    // Handle form submission
    const form = modal.querySelector('#report-form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.submitReport(form, modal);
    });
  }

  /**
   * Submit problem report
   */
  async submitReport(form, modal) {
    const formData = new FormData(form);
    const reportData = {
      type: formData.get('type'),
      description: formData.get('description'),
      email: formData.get('email'),
      captcha_session_id: this.captchaGenerator?.captchaSessionId,
      scenario_id: this.captchaGenerator?.scenario?.id,
      user_agent: navigator.userAgent,
      timestamp: new Date().toISOString()
    };

    // Show loading state
    const submitButton = form.querySelector('button[type="submit"]');
    const originalText = submitButton.textContent;
    submitButton.textContent = 'Submitting...';
    submitButton.disabled = true;

    try {
      // Submit to backend
      const response = await fetch('/backend/ReportProblem.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportData)
      });

      if (!response.ok) {
        console.error('❌ Failed to submit report: HTTP error', response.status);
        submitButton.textContent = originalText;
        submitButton.disabled = false;
        this.showError('Failed to submit report. Please try again.');
        return;
      }

      const result = await response.json();

      if (!result.success) {
        console.error('❌ Failed to submit report:', result.error || 'Unknown error');
        submitButton.textContent = originalText;
        submitButton.disabled = false;
        this.showError('Failed to submit report. Please try again.');
        return;
      }
      //console.log('✅ Problem report submitted successfully:', result.report_id);

      // Show success message
      const content = modal.querySelector('.modal-content');
      content.innerHTML = `
        <div class="modal-success-message">
          <h3>✅ Report Submitted Successfully</h3>
          <p>Thank you for your feedback! We've received your report and will investigate the issue.</p>
          ${reportData.email ? '<p>We\'ll contact you at the provided email if we need more information.</p>' : ''}
        </div>
        <p>Your report reference: <strong>${result.report_id}</strong></p>
        <button class="btn-primary" onclick="this.closest('.modal-overlay').remove()">Close</button>
      `;

      // Announce to screen readers
      if (this.captchaGenerator?.accessibility) {
        this.captchaGenerator.accessibility.announce(
          'Problem report submitted successfully. Thank you for your feedback.',
          'polite'
        );
      }
    } catch (error) {
      console.error('❌ Failed to submit report:', error);
      submitButton.textContent = originalText;
      submitButton.disabled = false;
      this.showError('Failed to submit report. Please try again.');
    }
  }

  /**
   * Create a modal overlay with content
   */
  createModal(title, content) {
    // Remove any existing modals
    document.querySelectorAll('.modal-overlay').forEach(m => m.remove());

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'modal-title');

    overlay.innerHTML = `
      <div class="modal-container">
        <div class="modal-header">
          <h2 id="modal-title">${title}</h2>
          <button class="modal-close" aria-label="Close modal">&times;</button>
        </div>
        <div class="modal-content">
          ${content}
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Close on background click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.remove();
      }
    });

    // Close on X button click (always closes completely)
    const closeButton = overlay.querySelector('.modal-close');
    closeButton.addEventListener('click', () => {
      overlay.remove();
    });

    // Handle Escape key - behaves as "back" button for support modals
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        const history = JSON.parse(overlay.getAttribute('data-modal-history') || '["main"]');

        if (history && history.length > 1) {
          // Go back to previous page
          history.pop();
          overlay.setAttribute('data-modal-history', JSON.stringify(history));
          this.showSupportModalContent(overlay);
        } else {
          // Close the modal if at main page
          overlay.remove();
          document.removeEventListener('keydown', handleEscape);
        }
      }
    };
    document.addEventListener('keydown', handleEscape);

    // Store the escape handler on the overlay for cleanup
    overlay._escapeHandler = handleEscape;

    // Focus management
    const focusableElements = overlay.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }

    // Announce to screen readers
    if (this.captchaGenerator?.accessibility) {
      this.captchaGenerator.accessibility.announce(
        `${title} dialog opened`,
        'polite'
      );
    }

    return overlay;
  }

  /**
   * Show error message
   */
  showError(message) {
    const errorElement = document.getElementById('error');
    if (errorElement) {
      errorElement.textContent = message;
      errorElement.style.display = 'block';

      setTimeout(() => {
        errorElement.style.display = 'none';
      }, 5000);
    }
  }

  /**
   * Cleanup
   */
  cleanup() {
    // Remove any open modals
    document.querySelectorAll('.modal-overlay').forEach(m => m.remove());

    // Remove event listeners
    if (this.supportButton) {
      this.supportButton.replaceWith(this.supportButton.cloneNode(true));
    }
    if (this.reloadButton) {
      this.reloadButton.replaceWith(this.reloadButton.cloneNode(true));
    }
    if (this.reportButton) {
      this.reportButton.replaceWith(this.reportButton.cloneNode(true));
    }
  }
}



