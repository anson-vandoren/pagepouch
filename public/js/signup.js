import { API_URL } from './common.js';
import { showNotification } from './common.js';

async function handleFormSubmit(event) {
  event.preventDefault();
  const submitButton = event.target.querySelector('button[type="submit"]');
  submitButton.disabled = true;

  const formData = new FormData(event.target);
  const username = formData.get('username');
  const password = formData.get('password');

  const response = await fetch(`${API_URL}/api/users/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, password }),
  });

  const { token, error } = await response.json();
  if (response.ok) {
    localStorage.setItem('token', token);
    window.location.href = 'bookmarks.html';
  } else {
    showNotification(error, 'error');
    submitButton.disabled = false;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('signup-form');
  form.addEventListener('submit', handleFormSubmit);
});
