import { API_URL } from './common.js';
import { wsHandler } from './ws.js';

document.addEventListener('DOMContentLoaded', () => {
  init();
});


async function init() {
  if (localStorage.getItem('token')) {
    // Event listeners
    document.getElementById('add-link').addEventListener('click', showAddForm);
    document.getElementById('search-button').addEventListener('click', () => {
      const searchQuery = document.getElementById('search-input').value;
      try {
        loadLinks(searchQuery);
      } catch (error) {
        console.error(error);
        window.location.href = '/login.html';
      }
    });
    document.getElementById('logout-btn').addEventListener('click', handleLogoutButtonClick);
    document.getElementById('add-link-form').addEventListener('submit', handleAddLinkFormSubmit);
    document.getElementById('theme-toggle').addEventListener('click', () => {
      document.body.classList.toggle('dark');
    });

    loadLinks();
  } else {
    window.location.href = '/login.html';
  }
}

/**
 * @typedef {Object} Link
 * @property {number} id
 * @property {string} url
 * @property {string} title
 * @property {string[]} tags
 * @property {boolean} isPublic
 * @property {string} savedAt
 * @property {number} userId
 */

/**
 * Fetch links from the API
 * @param {string} searchQuery optional search query to filter links
 * @returns {Promise<Link[]>} list of links
 * @throws {Error} if the request fails
 */
async function getLinks(searchQuery = '') {
  const response = await fetch(`${API_URL}/api/links?search=${encodeURIComponent(searchQuery)}`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
  });

  if (response.ok) {
    const res = await response.json();
    return res.links;
  } else {
    throw new Error('Failed to load links');
  }
}

/**
 * Fetch links from the API and render them in the DOM
 * @param {string} searchQuery optional search query to filter links
 * @throws {Error} if the request fails
 */
async function loadLinks(searchQuery = '') {
  try {
    const links = await getLinks(searchQuery);
    const linkList = document.getElementById('link-list');
    linkList.innerHTML = '';

    links.forEach((link) => {
      const item = renderLinkItem(link);
      linkList.appendChild(item);
    });
  } catch (error) {
    console.error('Failed to load links:', error);
    window.location.href = '/login.html';
  }
}

/**
 * Create a div element with the given classes
 * @param {string[]} classes 
 * @returns A div element with the given classes
 */
function divWithClasses(classes) {
  const div = document.createElement('div');
  div.classList.add(...classes);
  return div;
}

function timeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  let interval = Math.floor(seconds / 31536000);
  if (interval >= 1) {
    return interval + " years ago";
  }
  interval = Math.floor(seconds / 2592000);
  if (interval >= 1) {
    return interval + " months ago";
  }
  interval = Math.floor(seconds / 86400);
  if (interval >= 1) {
    return interval + " days ago";
  }
  interval = Math.floor(seconds / 3600);
  if (interval >= 1) {
    return interval + " hours ago";
  }
  interval = Math.floor(seconds / 60);
  if (interval >= 1) {
    return interval + " minutes ago";
  }
  return Math.floor(seconds) + " seconds ago";
}

/**
 * Create a link list item element
 * @param {Link} link One link object to render
 * @returns Link list item element
 */
function renderLinkItem(link) {
  const linkItem = document.createElement('p');
  linkItem.classList.add('link-item');
  linkItem.dataset.id = link.id;

  // first line - link w/ page title
  const title = divWithClasses(['link-title']);
  const titleLink = document.createElement('a');
  titleLink.href = link.url;
  titleLink.target = '_blank';
  titleLink.rel = 'noopener noreferrer';
  titleLink.textContent = link.title;
  title.appendChild(titleLink);

  // second line - tags and description
  const tagsSpan = document.createElement('span');
  tagsSpan.classList.add('link-tags');
  let hasTags = false;
  if (link.tags.length && link.tags[0] !== '') {
    hasTags = true;
    link.tags.forEach((tag) => {
      const tagLink = document.createElement('a');
      tagLink.href = `/?search=${encodeURIComponent(tag)}`;
      tagLink.textContent = `#${tag} `;
      tagsSpan.appendChild(tagLink);
    });
  }

  const descrSpan = document.createElement('span');
  descrSpan.classList.add('link-description');
  descrSpan.textContent = link.description ? link.description : '';

  const tagsAndDescription = divWithClasses(['link-tags-description']);
  tagsAndDescription.appendChild(tagsSpan);
  if (hasTags) {
    tagsAndDescription.appendChild(document.createTextNode(' | '));
  }
  tagsAndDescription.appendChild(descrSpan);

  // third line - date, edit, and delete links
  const actionsAndDate = document.createElement('div');
  actionsAndDate.classList.add('link-actions-date');

  const date = document.createElement('span');
  date.classList.add('link-date');
  const dateAgo = timeAgo(new Date(link.savedAt));
  date.textContent = `${dateAgo} | `;

  const actions = document.createElement('span');
  actions.classList.add('link-actions');

  const editLink = document.createElement('a');
  editLink.classList.add('edit-link');
  editLink.textContent = 'Edit';
  editLink.addEventListener('click', async () => {
    try {
      const linkData = await getLink(link.id);
      showEditForm(linkData);
    } catch (error) {
      console.error('Failed to load link for editing:', error);
    }
  });

  const removeLink = document.createElement('a');
  removeLink.classList.add('delete-link');
  removeLink.textContent = 'Remove';
  removeLink.addEventListener('click', () => {
    deleteLink(link.id).then(() => {
      loadLinks();
    });
  });

  actions.append(editLink, removeLink);
  actionsAndDate.append(date, actions);

  linkItem.append(title, tagsAndDescription, actionsAndDate);
  return linkItem;
}

async function handleLogoutButtonClick() {
  localStorage.removeItem('token');
  window.location.href = '/login.html';
}

async function handleAddLinkFormSubmit(event) {
  event.preventDefault();

  const title = document.getElementById('link-title').value;
  const url = document.getElementById('link-url').value;
  const description = document.getElementById('link-description').value;
  const tags = document
    .getElementById('link-tags')
    .value.split(',')
    .map((tag) => tag.trim());
  const visibility = document.getElementById('link-visibility').value;

  try {
    await addLink({ title, url, tags, visibility, description });
    document.getElementById('add-link-form').reset();
    closeModal('add-link-modal');
    loadLinks();
  } catch (error) {
    console.error('Error adding link:', error);
  }
}

async function addLink(linkData) {
  const response = await fetch(`${API_URL}/api/links`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
    body: JSON.stringify(linkData),
  });

  if (!response.ok) {
    throw new Error('Failed to add link');
  }
}

async function handleEditButtonClick(event) {
  const linkId = event.target.dataset.id;
  const link = await getLink(linkId);

  if (link) {
    showEditForm(link);
  } else {
    console.error('Error loading link data for editing');
  }
}

async function getLink(id) {
  const response = await fetch(`${API_URL}/api/links/${id}`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
  });

  if (response.ok) {
    return await response.json();
  } else {
    throw new Error('Failed to load link');
  }
}

async function handleDeleteButtonClick(event) {
  const linkId = event.target.dataset.id;
  try {
    await deleteLink(linkId);
    loadLinks();
  } catch (error) {
    console.error('Error deleting link:', error);
  }
}

function showEditForm(link) {
  const editForm = document.createElement('form');
  editForm.id = 'edit-link-form';
  editForm.innerHTML = `
    <input type="hidden" id="edit-link-id" value="${link.id}">
    <input type="text" class="custom-input" id="edit-link-title" value="${link.title}" required>
    <input type="url" class="custom-input" id="edit-link-url" value="${link.url}" required>
    <input type="text" class="custom-input" id="edit-link-tags" value="${(link.tags ?? []).join(
      ', '
    )}">
    <select class="custom-input" id="edit-link-visibility">
      <option value="private" ${link.visibility === 'private' ? 'selected' : ''}>Private</option>
      <option value="public" ${link.visibility === 'public' ? 'selected' : ''}>Public</option>
    </select>
    <button type="submit" class="custom-btn custom-btn-primary">Save Changes</button>
    <button type="button" class="custom-btn custom-btn-danger" id="cancel-edit">Cancel</button>
  `;

  const linkItem = document.querySelector(`[data-id="${link.id}"]`).closest('.link-item');
  linkItem.appendChild(editForm);

  editForm.addEventListener('submit', handleEditFormSubmit);
  document.getElementById('cancel-edit').addEventListener('click', () => {
    editForm.remove();
  });
}

function showAddForm() {
  const addLinkModal = document.getElementById("add-link-modal");
  addLinkModal.style.display = "block";

  const addForm = document.getElementById("add-link-form");
  addForm.addEventListener("submit", handleAddLinkFormSubmit);
  document.getElementById("cancel-add").addEventListener("click", () => {
    addLinkModal.style.display = "none";
  });
  document.getElementById("link-url").focus();
}


async function handleEditFormSubmit(event) {
  event.preventDefault();

  const linkId = document.getElementById('edit-link-id').value;
  const title = document.getElementById('edit-link-title').value;
  const url = document.getElementById('edit-link-url').value;
  const tags = document
    .getElementById('edit-link-tags')
    .value.split(',')
    .map((tag) => tag.trim());
  const visibility = document.getElementById('edit-link-visibility').value;

  try {
    await updateLink(linkId, {
      title,
      url,
      tags,
      visibility,
    });

    // Hide the edit form and reload the links
    closeEditForm();
    await loadLinks();
  } catch (error) {
    console.error('Error updating link:', error);
    alert('Failed to update link. Please try again.');
  }
}

function closeEditForm() {
  const editForm = document.getElementById('edit-link-form');
  if (editForm) {
    editForm.remove();
  }
}

async function updateLink(id, data) {
  const response = await fetch(`${API_URL}/api/links/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error('Failed to update link');
  }
}

async function deleteLink(id) {
  const response = await fetch(`${API_URL}/api/links/${id}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to delete link');
  }
}

window.addEventListener('click', (event) => {
  // TODO: add edit form
  const addLinkModal = document.getElementById('add-link-modal');
  if (event.target === addLinkModal) {
    addLinkModal.style.display = 'none';
  }
});

function closeModal(id) {
  document.getElementById(id).style.display = 'none';
}

// websocket
wsHandler.on('scrapeFQDN', (data) => {
  const { title, description, url } = data;
  document.getElementById('link-title').value = title;
  document.getElementById('link-description').value = description;
  document.getElementById('link-url').value = url;
});

// Add event listener to the URL input field
const urlInput = document.getElementById('link-url');
urlInput.addEventListener('focusout', (event) => {
  const url = event.target.value;
  if (url) {
    wsHandler.send('scrapeFQDN', url);
  }
});