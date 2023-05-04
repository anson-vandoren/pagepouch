import { createLink, deleteLink, getLink, getLinks, updateLink } from './apiClient';
import { scrollToTop, timeAgo } from './utils';
import { createTagLink } from './tags';
import { loadTags } from './tagsBar';
import { DEFAULT_PER_PAGE } from './constants';
import { showNotification } from './notification';
import { updatePagination } from './pagination';
import { wsHandler } from './ws';
import { updateSearch } from './search';
import { ScrapeFQDNResponseData } from '../../shared/apiTypes';

export const tagOnClick = () => {
  updateSearch();
  loadLinks()
    .then(() => {
      scrollToTop();
    })
    .catch((error: unknown) => {
      const reason = error instanceof Error ? error.message : 'Unknown error';
      showNotification(reason, 'danger');
    });
};

async function handleEditFormSubmit(event: Event) {
  event.preventDefault();
  if (!(event.target instanceof HTMLFormElement)) {
    throw new Error('Could not find edit form');
  }
  const linkId = event.target.dataset.id;
  if (!linkId) {
    throw new Error('Could not find link id');
  }
  const titleElem = document.getElementById('edit-link-title');
  if (!(titleElem instanceof HTMLInputElement)) {
    // TODO: factor out getOrThrow(?)
    throw new Error('Could not find edit link title');
  }
  const title = titleElem.value;
  const urlElem = document.getElementById('edit-link-url');
  if (!(urlElem instanceof HTMLInputElement)) {
    throw new Error('Could not find edit link url');
  }
  const url = urlElem.value;

  const tagsElem = document.getElementById('edit-link-tags');
  if (!(tagsElem instanceof HTMLInputElement)) {
    throw new Error('Could not find edit link tags');
  }

  const tags = tagsElem.value.split(',').map((tag) => tag.trim());

  const visibilityElem = document.getElementById('edit-link-visibility');
  if (!(visibilityElem instanceof HTMLSelectElement)) {
    throw new Error('Could not find edit link visibility');
  }
  const isPublic = visibilityElem.value === 'public';

  try {
    await updateLink(+linkId, {
      title,
      url,
      tags,
      isPublic,
    });

    // Hide the edit form and reload the links
    closeEditForm();
    await loadLinks();
    await loadTags(tagOnClick);
  } catch (error) {
    showNotification('Failed to update link', 'danger');
  }
}

function closeEditForm() {
  const editForm = document.getElementById('edit-link-form');
  if (editForm) {
    editForm.remove();
  }
}

async function handleAddLinkFormSubmit(event) {
  event.preventDefault();

  const title = document.getElementById('add-link-title').value;
  const url = document.getElementById('add-link-url').value;
  const description = document.getElementById('add-link-description').value;
  const tags = document
    .getElementById('add-link-tags')
    .value.split(',')
    .map((tag) => tag.trim());
  const visibility = document.getElementById('link-visibility').value;
  const isPublic = visibility === 'public';

  await createLink({
    title,
    url,
    tags,
    isPublic,
    description,
  });
  document.getElementById('add-link-form').reset();
  loadLinks();
}

wsHandler.on('scrapeFQDN', (data: ScrapeFQDNResponseData) => {
  const { title, description, url } = data;
  const titleElem = document.getElementById('add-link-title');
  if (titleElem instanceof HTMLInputElement && !titleElem.value) {
    titleElem.value = title;
  }
  const descriptionElem = document.getElementById('add-link-description');
  if (descriptionElem instanceof HTMLInputElement && !descriptionElem.value) {
    descriptionElem.value = description;
  }
  const urlElem = document.getElementById('add-link-url');
  if (urlElem instanceof HTMLInputElement && !urlElem.value) {
    urlElem.value = url;
  }
});

// Add event listener to the URL input field
const urlInput = document.getElementById('add-link-url');
if (urlInput) {
  urlInput.addEventListener('focusout', (event) => {
    const url = event.target.value;
    if (url) {
      wsHandler.send('scrapeFQDN', url);
    }
  });
}

const editLinkTemplate = document.getElementById('edit-link-template');
function showEditForm(link) {
  const editFormFragment = editLinkTemplate.content.cloneNode(true);

  editFormFragment.querySelector('#edit-link-form').dataset.id = link.id;
  editFormFragment.querySelector('#edit-link-title').value = link.title;
  editFormFragment.querySelector('#edit-link-url').value = link.url;
  editFormFragment.querySelector('#edit-link-tags').value = (link.tags ?? []).join(', ');
  const linkVisibility = link.isPublic ? 'public' : 'private';
  editFormFragment.querySelector(`#edit-link-visibility option[value="${linkVisibility}"]`).selected = true;

  const editForm = editFormFragment.querySelector('#edit-link-form');

  const linkItem = document.querySelector(`[data-id="${link.id}"]`).closest('.link-item');
  linkItem.appendChild(editFormFragment);

  editForm.addEventListener('submit', handleEditFormSubmit);
  document.getElementById('cancel-edit').addEventListener('click', () => {
    editForm.remove();
  });
}

/**
 * Create a link list item element
 * @param {Link} link One link object to render
 * @returns Link list item element
 */
function renderLinkItem(link) {
  const linkItemTemplate = document.getElementById('link-item-template');
  const fragment = linkItemTemplate.content.cloneNode(true);
  const linkItem = fragment.querySelector('.link-item');
  linkItem.dataset.id = link.id;

  const titleLink = linkItem.querySelector('.link-item-title > a');
  titleLink.href = link.url;
  titleLink.textContent = link.title;

  const tagsSpan = linkItem.querySelector('.link-item-tags-description > span:first-child');
  if (link.tags.length && link.tags[0] !== '') {
    link.tags.forEach((tag) => {
      tagsSpan.appendChild(
        createTagLink(tag, {
          onClick: tagOnClick,
        })
      );
    });
  }

  const descrSpan = linkItem.querySelector('.link-item-tags-description > span:last-child');
  descrSpan.textContent = link.description ? link.description : '';

  if (link.tags.length && link.tags[0] !== '' && link.description) {
    tagsSpan.insertAdjacentText('beforeend', ' | ');
  }

  const dateSpan = linkItem.querySelector('.link-item-date-actions > span:first-child');
  const dateAgo = timeAgo(new Date(link.savedAt));

  const isLoggedIn = !!link.userId;
  if (isLoggedIn) {
    dateSpan.textContent = `Saved ${dateAgo} | `;
    const editLink = linkItem.querySelector('.link-item-date-actions > span:last-child > a:first-child');
    editLink.addEventListener('click', async () => {
      const linkData = await getLink(link.id);
      showEditForm(linkData);
    });

    const removeLink = linkItem.querySelector('.link-item-date-actions > span:last-child > a:last-child');
    const cancelLink = document.createElement('a');
    const confirmLink = document.createElement('a');

    // Hide the remove link and show the cancel and confirm links
    const showConfirmation = () => {
      removeLink.style.display = 'none';
      cancelLink.style.display = 'inline';
      confirmLink.style.display = 'inline';
    };

    // Show the remove link and hide the cancel and confirm links
    const hideConfirmation = (e) => {
      e.preventDefault();
      removeLink.style.display = 'inline';
      cancelLink.style.display = 'none';
      confirmLink.style.display = 'none';
    };

    const removeSpan = linkItem.querySelector('.link-item-date-actions > span:last-child');
    removeLink.addEventListener('click', showConfirmation);

    // Add the cancel and confirm links
    cancelLink.textContent = 'Cancel';
    cancelLink.classList.add('has-text-danger');
    cancelLink.style.display = 'none';
    removeSpan.appendChild(cancelLink);

    confirmLink.textContent = ' Confirm';
    confirmLink.classList.add('has-text-danger');
    confirmLink.style.display = 'none';
    removeSpan.appendChild(confirmLink);

    // Bind event listeners
    cancelLink.addEventListener('click', hideConfirmation);
    confirmLink.addEventListener('click', (e) => {
      e.preventDefault();
      deleteLink(link.id).then(() => {
        loadLinks();
      });
    });
  } else {
    dateSpan.textContent = `Saved ${dateAgo} by ${link.User.username}`;
    const editRemoveSpan = linkItem.querySelector('.link-item-date-actions > span:last-child');
    editRemoveSpan.remove();
  }

  return fragment;
}
/**
 * Fetch links from the API and render them in the DOM
 * @param {string} searchQuery optional search query to filter links
 * @throws {Error} if the request fails
 */
async function loadLinks(page = 1, pageSize = DEFAULT_PER_PAGE) {
  const searchInput = document.getElementById('search-input');
  const searchQuery = searchInput?.value.trim() ?? '';

  const linkList = document.getElementById('link-list');
  if (!linkList) return; // nowhere to render to

  try {
    const { links, totalPages } = await getLinks(searchQuery, page, pageSize);
    linkList.innerHTML = '';

    links.forEach((link) => {
      const item = renderLinkItem(link);
      linkList.appendChild(item);
    });

    updatePagination(page, totalPages, loadLinks);
  } catch (err) {
    showNotification('Oops, something went wrong.', 'danger');
  }
}

export { handleAddLinkFormSubmit, loadLinks };
