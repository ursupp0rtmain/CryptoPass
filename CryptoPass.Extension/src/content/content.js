// CryptoPass Extension - Content Script

// Message handling
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case 'autofill':
      autofillCredentials(message.username, message.password);
      sendResponse({ success: true });
      break;

    case 'fillField':
      fillActiveField(message.value);
      sendResponse({ success: true });
      break;

    case 'getPageInfo':
      sendResponse({
        url: window.location.href,
        domain: window.location.hostname,
        hasLoginForm: detectLoginForm()
      });
      break;
  }
  return true;
});

// Autofill credentials
function autofillCredentials(username, password) {
  const usernameFields = findUsernameFields();
  const passwordFields = findPasswordFields();

  // Fill username
  if (usernameFields.length > 0 && username) {
    fillField(usernameFields[0], username);
  }

  // Fill password
  if (passwordFields.length > 0 && password) {
    fillField(passwordFields[0], password);
  }
}

// Fill a single field
function fillField(field, value) {
  if (!field) return;

  // Focus the field
  field.focus();

  // Set value
  field.value = value;

  // Trigger events for frameworks that listen to them
  field.dispatchEvent(new Event('input', { bubbles: true }));
  field.dispatchEvent(new Event('change', { bubbles: true }));

  // For React controlled inputs
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value'
  )?.set;

  if (nativeInputValueSetter) {
    nativeInputValueSetter.call(field, value);
    field.dispatchEvent(new Event('input', { bubbles: true }));
  }
}

// Fill the currently active/focused field
function fillActiveField(value) {
  const activeElement = document.activeElement;
  if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
    fillField(activeElement, value);
  }
}

// Find username fields
function findUsernameFields() {
  const selectors = [
    'input[type="email"]',
    'input[type="text"][name*="user"]',
    'input[type="text"][name*="email"]',
    'input[type="text"][name*="login"]',
    'input[type="text"][id*="user"]',
    'input[type="text"][id*="email"]',
    'input[type="text"][id*="login"]',
    'input[type="text"][autocomplete="username"]',
    'input[type="text"][autocomplete="email"]',
    'input[type="text"][placeholder*="email" i]',
    'input[type="text"][placeholder*="user" i]'
  ];

  const fields = [];
  selectors.forEach(selector => {
    const found = document.querySelectorAll(selector);
    found.forEach(field => {
      if (isVisible(field) && !fields.includes(field)) {
        fields.push(field);
      }
    });
  });

  return fields;
}

// Find password fields
function findPasswordFields() {
  const passwordFields = document.querySelectorAll('input[type="password"]');
  return Array.from(passwordFields).filter(isVisible);
}

// Check if element is visible
function isVisible(element) {
  if (!element) return false;

  const style = window.getComputedStyle(element);
  return (
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    element.offsetParent !== null
  );
}

// Detect if page has a login form
function detectLoginForm() {
  const passwordFields = findPasswordFields();
  return passwordFields.length > 0;
}

// Add CryptoPass icon to password fields
function addFieldIcons() {
  const passwordFields = findPasswordFields();

  passwordFields.forEach(field => {
    if (field.dataset.cryptopassIcon) return;
    field.dataset.cryptopassIcon = 'true';

    const wrapper = document.createElement('div');
    wrapper.className = 'cryptopass-field-wrapper';
    wrapper.style.cssText = 'position: relative; display: inline-block; width: 100%;';

    const icon = document.createElement('button');
    icon.className = 'cryptopass-field-icon';
    icon.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2C9.24 2 7 4.24 7 7V10H6C4.9 10 4 10.9 4 12V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V12C20 10.9 19.1 10 18 10H17V7C17 4.24 14.76 2 12 2ZM12 4C13.66 4 15 5.34 15 7V10H9V7C9 5.34 10.34 4 12 4ZM12 14C13.1 14 14 14.9 14 16C14 17.1 13.1 18 12 18C10.9 18 10 17.1 10 16C10 14.9 10.9 14 12 14Z" fill="#175ddc"/>
    </svg>`;
    icon.style.cssText = `
      position: absolute;
      right: 8px;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0.7;
      transition: opacity 0.15s;
      z-index: 9999;
    `;

    icon.addEventListener('mouseenter', () => {
      icon.style.opacity = '1';
    });

    icon.addEventListener('mouseleave', () => {
      icon.style.opacity = '0.7';
    });

    icon.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      chrome.runtime.sendMessage({ action: 'openPopup' });
    });

    // Wrap the field
    if (field.parentNode) {
      const parent = field.parentNode;
      const fieldStyle = window.getComputedStyle(field);

      // Only wrap if field has enough space
      if (parseInt(fieldStyle.paddingRight) < 30) {
        field.style.paddingRight = '36px';
      }

      // Insert icon after field (absolute positioned)
      parent.style.position = 'relative';
      parent.insertBefore(icon, field.nextSibling);
    }
  });
}

// Observe DOM changes to detect dynamically added forms
const observer = new MutationObserver((mutations) => {
  let hasNewInputs = false;

  mutations.forEach(mutation => {
    if (mutation.addedNodes.length > 0) {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          if (node.tagName === 'INPUT' || node.querySelector?.('input')) {
            hasNewInputs = true;
          }
        }
      });
    }
  });

  if (hasNewInputs) {
    addFieldIcons();
  }
});

// Start observing
observer.observe(document.body, {
  childList: true,
  subtree: true
});

// Initial scan
document.addEventListener('DOMContentLoaded', addFieldIcons);
if (document.readyState !== 'loading') {
  addFieldIcons();
}
