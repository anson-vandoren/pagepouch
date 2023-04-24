import { API_URL } from './common.js';

function loginDropdownHandler() {
  const loginForm = document.getElementById('login-dropdown');
  // toggle is-active class on login form when clicked
  loginForm.addEventListener('click', (e) => {
    if (e.target.classList.contains('navbar-link')) {
      loginForm.classList.toggle('is-active');
    }
  });
}

/**
 * Submits a form with the provided event, path, and error message.
 * @param {Event} e - The form submission event.
 * @param {string} path - The API path for the request ('login' or 'register').
 * @param {string} errorMessage - The error message to display upon failure.
 * @returns {Promise<void>}
 */
async function submitForm(e, path, errorMessage) {
  e.preventDefault();
  const username = document.getElementById(`${path}-username`).value;
  const password = document.getElementById(`${path}-password`).value;

  const response = await fetch(`${API_URL}/api/users/${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, password }),
  });

  if (response.ok) {
    const { token } = await response.json();
    localStorage.setItem('token', token);
    window.location.href = 'bookmarks.html';
  } else {
    alert(errorMessage);
  }
}

/**
 * Handles the login form submission.
 * @param {Event} e - The form submission event.
 * @returns {Promise<void>}
 */
function loginSubmit(e) {
  submitForm(e, 'login', 'Error logging in. Please check your credentials.');
}

document.addEventListener('DOMContentLoaded', () => {
  loginDropdownHandler();
  const loginForm = document.getElementById('login-form');
  loginForm.addEventListener('submit', loginSubmit);
});