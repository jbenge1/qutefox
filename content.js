// content.js
let mode = 'normal'; // 'normal', 'insert', 'command', or 'search'
let commandBuffer = '';
let lastKeyTime = 0;
let modeIndicator = null;
let inputBox = null;
let suggestionsContainer = null;
let recentlyClosedTabs = [];
let searchText = '';
let searchIndex = 0;
let zoomLevel = 80; // Base zoom level in percentage
let open = false, tabopen = false;

// Initialize the extension
function init() {
  // Create mode indicator
  createModeIndicator();
  
  // Set initial mode
  setMode('normal');
  
  // Add event listeners
  document.addEventListener('keydown', handleKeydown, true);
  
  // Store tab info in case we need to reopen it
  storeTabInfo();
  
  // Listen for tab close to store in recently closed tabs
  window.addEventListener('beforeunload', () => {
    storeTabInfo();
  });
}

// Store current tab information
function storeTabInfo() {
  browser.runtime.sendMessage({ 
    type: 'storeTabInfo', 
    url: window.location.href, 
    title: document.title 
  });
}

// Create the mode indicator
function createModeIndicator() {
  modeIndicator = document.createElement('div');
  modeIndicator.id = 'qutefox-mode-indicator';
  modeIndicator.className = 'qutefox-normal-mode';
  modeIndicator.textContent = 'NORMAL';
  document.body.appendChild(modeIndicator);
}

// Set the current mode
function setMode(newMode) {
  mode = newMode;
  
  if (modeIndicator) {
    modeIndicator.className = `qutefox-${newMode}-mode`;
    modeIndicator.textContent = newMode.toUpperCase();
  }
}

// Handle keydown events
function handleKeydown(event) {
  // Always allow modifier keys to pass through
  if (event.key === 'Alt' || event.key === 'Control' ||/* event.key === 'Shift' ||*/ event.key === 'Meta') {
    return;
  }

  // Handle input box if active
  if (inputBox && mode === 'command') {
    if (event.key === 'Escape') {
      removeInputBox();
      setMode('normal');
      event.preventDefault();
      event.stopPropagation();
    } else if (event.key === 'Enter') {
      let value;
      if(open) value = 'open ' + inputBox.value;
      else if(tabopen) value = 'tabopen ' + inputBox.value;
      else value = inputBox.value;
      tabopen = false, open = false;
      removeInputBox();
      setMode('normal');
      processCommand(value);
      event.preventDefault();
      event.stopPropagation();
    }
    return;
  }

  // Don't intercept keys in insert mode unless it's Escape
  if (mode === 'insert' && event.key !== 'Escape') {
    return;
  }

  // In normal mode, intercept all keys
  if (mode === 'normal') {
    // Process the key
    processKey(event);
    
    // Prevent default behavior
    event.preventDefault();
    event.stopPropagation();
  }
  
  // Handle Escape key to exit insert mode
  if (event.key === 'Escape' && mode === 'insert') {
    setMode('normal');
    event.preventDefault();
    event.stopPropagation();
  }
}

// Process a key in normal mode
function processKey(event) {
  const key = event.key.toLowerCase();
  const now = Date.now();
  
  // If it's been more than 1 second since the last key, reset the command buffer
  if (now - lastKeyTime > 1000) {
    commandBuffer = '';
  }
  
  // Add the key to the command buffer
  commandBuffer += key;
  lastKeyTime = now;
  
  // Process commands
  processCommandBuffer();
}

// Process the current command buffer
function processCommandBuffer() {
  // Navigation commands
  // if (commandBuffer === 'h') {
  //   browser.runtime.sendMessage({ type: 'goBack' });
  // } else if (commandBuffer === 'l') {
  //   browser.runtime.sendMessage({ type: 'goForward' });
  // } 
  if (commandBuffer === 'j') {
    window.scrollBy(0, 50);
  } else if (commandBuffer === 'k') {
    window.scrollBy(0, -50);
  } else if (commandBuffer === 'gg') {
    window.scrollTo(0, 0);
  }else if (commandBuffer === 'shiftg') {
    window.scrollTo(0, document.body.scrollHeight);
  } else if (commandBuffer === 'g' || commandBuffer === 'y' || commandBuffer === 'shift') {
    // Wait for next key
    return;
  }   
  // Tab commands
  else if (commandBuffer === 'shiftk' || commandBuffer === 'gt') {
    browser.runtime.sendMessage({ type: 'nextTab' });
  } else if (commandBuffer === 'shiftj' || commandBuffer === 'gshiftt') {
    browser.runtime.sendMessage({ type: 'prevTab' });
  } else if (commandBuffer === 'd') {
    browser.runtime.sendMessage({ type: 'closeTab' });
  } else if (commandBuffer === 'r') {
    browser.runtime.sendMessage({ type: 'reloadPage' });
  } else if (commandBuffer === 'u') {
    browser.runtime.sendMessage({ type: 'reopenTab' });
  } else if (commandBuffer === 'gc') {
    browser.runtime.sendMessage({ type: 'cloneTab' });
  }
  
  // Zoom controls
  else if (commandBuffer === '+') {
    browser.runtime.sendMessage({ type: 'zoomIn' });
  } else if (commandBuffer === '-') {
    browser.runtime.sendMessage({ type: 'zoomOut' });
  }
  
  // Mode switching
  else if (commandBuffer === 'i') {
    setMode('insert');
  } else if (commandBuffer === ':' || commandBuffer === 'shift:') {
    showCommandBar();
    // showCommandPrompt();
  }
  
  // Open URL commands
  else if (commandBuffer === 'o') {
    open = true;
    showUrlBar(false);
  } else if (commandBuffer === 'shifto') {
    tabopen = true;
    showUrlBar(true);
  } else if (commandBuffer === 'go') {
    editCurrentUrl(false);
  } else if (commandBuffer === 'gshifto' || commandBuffer === 'gshifto') {
    editCurrentUrl(true);
  }
  
  // Copy URL
  else if (commandBuffer === 'yy') {
    copyToClipboard(window.location.href);
  }
  
  // Link following (f)
  // else if (commandBuffer === 'f') {
  //   highlightLinks();
  // }
  
  // Search (/)
  else if (commandBuffer === '/') {
    showFindPrompt();
  } else if (commandBuffer === 'n') {
    searchNext();
  }
  
  // Developer tools
  // else if (commandBuffer === 'wi') {
  //   browser.runtime.sendMessage({ type: 'openDevTools' });
  // }
  
  // History and bookmarks (b, H)
  else if (commandBuffer === 'b') {
    // Open bookmarks (would require additional implementation)
  } else if (commandBuffer === 'shifth') {
      browser.runtime.sendMessage({ type: 'goBack' });
  } else if(commandBuffer === 'shiftl'){
    browser.runtime.sendMessage({type: 'goForward'});
  }
  
  // Clear command buffer for completed commands
  if (!['g', 'y', 'shift'].includes(commandBuffer)) {
    commandBuffer = '';
  }
}

// Process command entered in command mode
function processCommand(cmd) {
  if (cmd.startsWith('open ')) {
    const url = cmd.substring(5);
    navigateToUrl(url, false);
  } else if (cmd.startsWith('tabopen ')) {
    const url = cmd.substring(8);
    navigateToUrl(url, true);
  } else if (cmd === 'reload') {
    browser.runtime.sendMessage({ type: 'reloadPage' });
  } else if (cmd === 'back') {
    browser.runtime.sendMessage({ type: 'goBack' });
  } else if (cmd === 'forward') {
    browser.runtime.sendMessage({ type: 'goForward' });
  } else if (cmd === 'devtools') {
    browser.runtime.sendMessage({ type: 'openDevTools' });
  } else if (cmd.startsWith('zoom ')) {
    const zoomLevel = parseInt(cmd.substring(5));
    if (!isNaN(zoomLevel)) {
      browser.runtime.sendMessage({ type: 'setZoom', level: zoomLevel });
    }
  }
}

// Show command bar
function showCommandBar() {
  setMode('command');
  inputBox = document.createElement('input');
  inputBox.type = 'text';
  inputBox.id = 'qutefox-url-bar';
  inputBox.placeholder = 'Enter command...';
  inputBox.classList.add('qutefox-input');
  document.body.appendChild(inputBox);
  inputBox.focus();
}

// Show URL bar
function showUrlBar(newTab) {
  setMode('command');
  inputBox = document.createElement('input');
  inputBox.type = 'text';
  inputBox.id = 'qutefox-url-bar';
  inputBox.placeholder = newTab ? 'Open URL in new tab...' : 'Open URL...';
  inputBox.classList.add('qutefox-input');
  document.body.appendChild(inputBox);
  inputBox.focus();
  setupUrlBarSuggestions(document.getElementById('qutefox-url-bar'));
}

// Edit current URL
function editCurrentUrl(newTab) {
  setMode('command');
  inputBox = document.createElement('input');
  inputBox.type = 'text';
  inputBox.id = 'qutefox-url-bar';
  inputBox.value = window.location.href;
  inputBox.classList.add('qutefox-input');
  document.body.appendChild(inputBox);
  inputBox.focus();
  inputBox.select();
}

// Navigate to a URL
function navigateToUrl(url, newTab) {
  // Add http:// if no protocol specified
  if (!/^https?:\/\//i.test(url) && !url.startsWith('about:')) {
    // Check if it's a search or URL
    if (url.includes(' ') || !url.includes('.')) {
      // Treat as search query - use browser's default search engine
      browser.runtime.sendMessage({ 
        type: 'search', 
        query: url, 
        newTab: newTab 
      });
      return;
    } else {
      // Treat as URL
      url = 'http://' + url;
    }
  }
  
  if (newTab) {
    browser.runtime.sendMessage({ type: 'openTab', url: url });
  } else {
    window.location.href = url;
  }
}

function copyToClipboard(text) {
  // Use the Clipboard API
  navigator.clipboard.writeText(text)
    .then(() => {
      // Show notification on success
      showNotification('URL copied to clipboard');
    })
    .catch(err => {
      console.error('Failed to copy: ', err);
      showNotification('Failed to copy URL');
    });
}

// Show a temporary notification
function showNotification(message) {
  console.log('here?');
  const notification = document.createElement('div');
  notification.textContent = message;
  notification.className = 'qutefox-notification';
  document.body.appendChild(notification);
  
  // Remove after 2 seconds
  setTimeout(() => {
    notification.remove();
  }, 2000);
}

// Remove input box
function removeInputBox() {
  if (inputBox) {
    removeInputSuggestion();
    inputBox.remove();
    inputBox = null;
  }
}

function removeInputSuggestion() {
  if(suggestionsContainer) {
    suggestionsContainer.remove();
    suggestionsContainer = null;
  }
}

// Highlight links for clicking
function highlightLinks() {
  const links = document.querySelectorAll('a');
  const linkOverlays = [];
  
  // Remove existing link hints
  document.querySelectorAll('.qutefox-link-hint').forEach(hint => hint.remove());
  
  // Create a hint for each link
  links.forEach((link, i) => {
    if (isLinkVisible(link)) {
      const rect = link.getBoundingClientRect();
      
      // Create the link hint
      const hint = document.createElement('div');
      hint.className = 'qutefox-link-hint';
      hint.textContent = i.toString(36); // Base-36 for shorter hints
      hint.style.top = `${rect.top + window.scrollY}px`;
      hint.style.left = `${rect.left + window.scrollX}px`;
      
      document.body.appendChild(hint);
      linkOverlays.push({ hint, link });
    }
  });
  
  // Set up event listener for hint keys
  const linkHintListener = function(e) {
    const key = e.key.toLowerCase();
    const index = parseInt(key, 36);
    
    if (!isNaN(index) && index < linkOverlays.length) {
      // Click the link
      linkOverlays[index].link.click();
      
      // Clean up
      linkOverlays.forEach(item => item.hint.remove());
      document.removeEventListener('keydown', linkHintListener);
      
      e.preventDefault();
      e.stopPropagation();
    } else if (e.key === 'Escape') {
      // Cancel link following
      linkOverlays.forEach(item => item.hint.remove());
      document.removeEventListener('keydown', linkHintListener);
      
      e.preventDefault();
      e.stopPropagation();
    }
  };
  
  document.addEventListener('keydown', linkHintListener);
}

// Check if a link is visible
function isLinkVisible(link) {
  const rect = link.getBoundingClientRect();
  return (
    rect.width > 0 &&
    rect.height > 0 &&
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.top <= (window.innerHeight || document.documentElement.clientHeight)
  );
}

// Start a search
function startSearch() {
  setMode('search');
  
  // Create search box
  inputBox = document.createElement('input');
  inputBox.type = 'text';
  inputBox.id = 'qutefox-search-box';
  inputBox.placeholder = 'Search...';
  inputBox.classList.add('qutefox-input');
  document.body.appendChild(inputBox);
  
  // Focus the search box
  inputBox.focus();
}

// Perform a search
function performSearch(text) {
  searchText = text;
  browser.runtime.sendMessage({ type: 'find', query: text });
}

function stopSearch(text) {
  browser.runtime.sendMessage({type: 'stopFind'});
}

// Search for next occurrence
function searchNext() {
  if (searchText && window.find) {
    window.find(searchText);
  }
}

// Initialize the extension when the document is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}


// Search bar suggestions
// URL bar suggestions from history
function setupUrlBarSuggestions(urlBarElement) {
  // Create suggestions container
  suggestionsContainer = document.createElement('div');
  suggestionsContainer.id = 'qutefox-suggestions';
  document.body.appendChild(suggestionsContainer);
  
  // Track selected suggestion
  let selectedIndex = -1;
  let suggestions = [];
  
  // Function to fetch history suggestions
  async function fetchHistorySuggestions(query) {
    return new Promise((resolve) => {
      if (!query || query.trim() === '') {
        resolve([]);
        return;
      }
      
      browser.runtime.sendMessage({
        action: "getHistorySuggestions",
        query: query
      }).then(response => {
        if (response && response.success) {
          resolve(response.suggestions);
        } else {
          console.error('Error fetching history:', response?.error || 'Unknown error');
          resolve([]);
        }
      }).catch(error => {
        console.error('Error sending message:', error);
        resolve([]);
      });
    });
  } 
  
  // Show suggestions
  function showSuggestions(items) {
    suggestions = items;
    selectedIndex = -1;
    
    if (items.length === 0) {
      suggestionsContainer.style.display = 'none';
      return;
    }
    
    // Update position to match URL bar
    const urlBarRect = urlBarElement.getBoundingClientRect();
    suggestionsContainer.style.top = `${urlBarRect.bottom + 5}px`;
    suggestionsContainer.style.left = `${urlBarRect.left}px`;
    suggestionsContainer.style.width = `${urlBarRect.width}px`;
    
    // Build suggestions HTML
    let html = '';
    items.forEach((item, index) => {
      const icon = item.source === 'history' ? '🕒' : '🔍';
      html += `
        <div class="qutefox-suggestion" data-index="${index}">
          <span class="qutefox-suggestion-icon">${icon}</span>
          <div class="qutefox-suggestion-content">
            <div class="qutefox-suggestion-title">${escapeHtml(item.title)}</div>
            <div class="qutefox-suggestion-url">${escapeHtml(item.url)}</div>
          </div>
        </div>
      `;
    });
    
    suggestionsContainer.innerHTML = html;
    suggestionsContainer.style.display = 'block';
    
    // Add click handlers to suggestions
    document.querySelectorAll('.qutefox-suggestion').forEach(el => {
      el.addEventListener('click', () => {
        const index = parseInt(el.dataset.index, 10);
        if (suggestions[index]) {
          urlBarElement.value = suggestions[index].url;
          navigateToUrl(suggestions[index].url);
          hideSuggestions();
        }
      });
    });
  }
  
  // Hide suggestions
  function hideSuggestions() {
    suggestionsContainer.style.display = 'none';
  }
  
  // Escape HTML to prevent XSS
  function escapeHtml(unsafe) {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
  
  // Navigate to URL
  function navigateToUrl(url) {
    // Check if it's a valid URL, if not, search it
    if (!/^https?:\/\//i.test(url)) {
      url = `https://www.google.com/search?q=${encodeURIComponent(url)}`;
    }
    window.location.href = url;
  }
  
  // Input event for real-time suggestions
  urlBarElement.addEventListener('input', async () => {
    const query = urlBarElement.value.trim();
    const historyResults = await fetchHistorySuggestions(query);
    showSuggestions(historyResults);
  });
  
  // Key navigation for suggestions
  urlBarElement.addEventListener('keydown', (e) => {
    if (suggestions.length === 0) return;
    
    // Down arrow
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedIndex = Math.min(selectedIndex + 1, suggestions.length - 1);
      highlightSelectedSuggestion();
    }
    // Up arrow
    else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedIndex = Math.max(selectedIndex - 1, -1);
      highlightSelectedSuggestion();
    }
    // Enter to select
    else if (e.key === 'Enter') {
      if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
        e.preventDefault();
        urlBarElement.value = suggestions[selectedIndex].url;
        navigateToUrl(suggestions[selectedIndex].url);
        hideSuggestions();
      } else if (urlBarElement.value.trim()) {
        navigateToUrl(urlBarElement.value.trim());
        hideSuggestions();
      }
    }
    // Escape to close
    else if (e.key === 'Escape') {
      hideSuggestions();
    }
  });
  
  // Highlight the selected suggestion
  function highlightSelectedSuggestion() {
    document.querySelectorAll('.qutefox-suggestion').forEach((el, i) => {
      if (i === selectedIndex) {
        el.classList.add('qutefox-suggestion-selected');
        // Optionally update the URL bar with the selected suggestion
        urlBarElement.value = suggestions[i].url;
      } else {
        el.classList.remove('qutefox-suggestion-selected');
      }
    });
  }
  
  // Close suggestions when clicking elsewhere
  document.addEventListener('click', (e) => {
    if (e.target !== urlBarElement && !suggestionsContainer.contains(e.target)) {
      hideSuggestions();
    }
  });
  
  // Hide when URL bar loses focus
  urlBarElement.addEventListener('blur', () => {
    // Small delay to allow clicking on suggestions
    setTimeout(() => {
      if (!suggestionsContainer.contains(document.activeElement)) {
        hideSuggestions();
      }
    }, 100);
  });
}

// Find in page functions
let currentSearchResults = [];
let currentSearchIndex = -1;

function showFindPrompt() {
  setMode('search');
  inputBox = document.createElement('input');
  inputBox.id = 'qutefox-search-box';
  inputBox.setAttribute('type', 'text');
  inputBox.setAttribute('placeholder', 'Find in page...');
  document.body.appendChild(inputBox);
  
  // Create find controls
  const findControls = document.createElement('div');
  findControls.id = 'qutefox-find-controls';
  findControls.innerHTML = `
    <span id="qutefox-find-count">0/0</span>
    <button id="qutefox-find-prev">◄</button>
    <button id="qutefox-find-next">►</button>
    <button id="qutefox-find-close">✕</button>
  `;
  document.body.appendChild(findControls);
  
  // Position the controls next to the search box
  const boxRect = inputBox.getBoundingClientRect();
  findControls.style.top = `${boxRect.top}px`;
  findControls.style.left = `${boxRect.right + 10}px`;
  
  // Add event listeners
  document.getElementById('qutefox-find-prev').addEventListener('click', findPrevious);
  document.getElementById('qutefox-find-next').addEventListener('click', findNext);
  document.getElementById('qutefox-find-close').addEventListener('click', () => {
    clearSearch();
    removeFindPrompt();
  });
  
  // Real-time search as user types
  inputBox.addEventListener('input', () => {
    performRealTimeSearch(inputBox.value);
  });
  
  // Handle keyboard navigation
  inputBox.addEventListener('keydown', (e) => {
    console.log('HERE:');
    console.log(e);
    if (e.key === 'Escape') {
      clearSearch();
      removeFindPrompt();
      e.preventDefault();
    } else if (e.key === 'Enter') {
      if (e.shiftKey) {
        findPrevious();
      } else {
        findNext();
      }
      e.preventDefault();
    }
  });
  
  inputBox.focus();
  
  function removeFindPrompt() {
    document.body.removeChild(inputBox);
    document.body.removeChild(findControls);
    setMode('normal');
  }
}

function performRealTimeSearch(text) {
  // Clear previous results
  clearHighlights();
  
  if (!text || text.trim() === '') {
    updateFindCount(0, 0);
    return;
  }
  
  // Create a text node iterator
  const textNodes = [];
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    { acceptNode: node => node.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT }
  );
  
  let node;
  while (node = walker.nextNode()) {
    textNodes.push(node);
  }
  
  // Search for matches and highlight them
  currentSearchResults = [];
  const searchRegex = new RegExp(escapeRegExp(text), 'gi');
  
  textNodes.forEach(textNode => {
    const nodeText = textNode.nodeValue;
    let match;
    let lastIndex = 0;
    const matches = [];
    searchRegex.lastIndex = 0;
    
    while ((match = searchRegex.exec(nodeText)) !== null) {
      matches.push({
        node: textNode,
        startOffset: match.index,
        endOffset: match.index + match[0].length
      });
    }
    
    if (matches.length > 0) {
      currentSearchResults = currentSearchResults.concat(matches);
    }
  });
  
  // Highlight all matches
  highlightMatches();
  
  // Set index to first match and focus it
  currentSearchIndex = currentSearchResults.length > 0 ? 0 : -1;
  focusCurrentMatch();
  
  // Update match count
  updateFindCount(currentSearchIndex + 1, currentSearchResults.length);
}

function highlightMatches() {
  currentSearchResults.forEach((match, index) => {
    const range = document.createRange();
    range.setStart(match.node, match.startOffset);
    range.setEnd(match.node, match.endOffset);
    
    const highlight = document.createElement('span');
    highlight.className = 'qutefox-search-highlight';
    highlight.dataset.index = index;
    
    range.surroundContents(highlight);
    
    // Store reference to the highlight element
    match.element = highlight;
  });
}

function focusCurrentMatch() {
  if (currentSearchIndex >= 0 && currentSearchIndex < currentSearchResults.length) {
    // Remove current focus class from all highlights
    document.querySelectorAll('.qutefox-search-highlight-current').forEach(el => {
      el.classList.remove('qutefox-search-highlight-current');
    });
    
    // Add focus class to current match
    const match = currentSearchResults[currentSearchIndex];
    if (match && match.element) {
      match.element.classList.add('qutefox-search-highlight-current');
      match.element.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }
}

function findNext() {
  if (currentSearchResults.length === 0) return;
  
  currentSearchIndex = (currentSearchIndex + 1) % currentSearchResults.length;
  focusCurrentMatch();
  updateFindCount(currentSearchIndex + 1, currentSearchResults.length);
}

function findPrevious() {
  if (currentSearchResults.length === 0) return;
  
  currentSearchIndex = (currentSearchIndex - 1 + currentSearchResults.length) % currentSearchResults.length;
  focusCurrentMatch();
  updateFindCount(currentSearchIndex + 1, currentSearchResults.length);
}

function clearHighlights() {
  document.querySelectorAll('.qutefox-search-highlight').forEach(el => {
    const parent = el.parentNode;
    if (parent) {
      // Replace highlight element with its text content
      parent.replaceChild(document.createTextNode(el.textContent), el);
      parent.normalize(); // Merge adjacent text nodes
    }
  });
  
  currentSearchResults = [];
  currentSearchIndex = -1;
}

function clearSearch() {
  clearHighlights();
  updateFindCount(0, 0);
}

function updateFindCount(current, total) {
  const countElement = document.getElementById('qutefox-find-count');
  if (countElement) {
    countElement.textContent = `${current}/${total}`;
  }
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// command promptt
// Show command prompt with suggestions
function showCommandPrompt() {
  inputBox = document.createElement('input');
  inputBox.id = 'qutefox-command';
  inputBox.setAttribute('type', 'text');
  inputBox.setAttribute('placeholder', ':');
  document.body.appendChild(inputBox);
  
  const suggestionsContainer = document.createElement('div');
  suggestionsContainer.id = 'qutefox-command-suggestions';
  document.body.appendChild(suggestionsContainer);
  
  // Command definitions with descriptions
  const commands = [
    { command: 'o', description: 'Open URL in current tab' },
    { command: 'O', description: 'Open URL in new tab' },
    { command: 'f', description: 'Find in page' },
    { command: 'u', description: 'Undo closed tab' },
    { command: 'r', description: 'Reload page' },
    { command: 'h', description: 'Go back in history' },
    { command: 'l', description: 'Go forward in history' },
    { command: 'gg', description: 'Go to top of page' },
    { command: 'G', description: 'Go to bottom of page' }
    // Add more commands as needed
  ];
  
  // Show initial suggestions
  showCommandSuggestions('', commands);
  
  // Update suggestions as user types
  inputBox.addEventListener('input', () => {
    const query = inputBox.value;
    const filtered = commands.filter(cmd => 
      cmd.command.startsWith(query) || cmd.description.toLowerCase().includes(query.toLowerCase())
    );
    showCommandSuggestions(query, filtered);
  });
  
  // Handle command selection
  // inputBox.addEventListener('keydown', (e) => {
  //   if (e.key === 'Enter') {
  //     executeCommand(inputBox.value);
  //     removeCommandPrompt();
  //   } else if (e.key === 'Escape') {
  //     removeCommandPrompt();
  //   }
  // });
  
  inputBox.focus();
  
  function showCommandSuggestions(query, filteredCommands) {
    let html = '';
    filteredCommands.forEach(cmd => {
      html += `
        <div class="qutefox-command-suggestion">
          <span class="qutefox-command-key">${cmd.command}</span>
          <span class="qutefox-command-description">${cmd.description}</span>
        </div>
      `;
    });
    
    suggestionsContainer.innerHTML = html;
    
    // Position the suggestions container
    const boxRect = inputBox.getBoundingClientRect();
    suggestionsContainer.style.top = `${boxRect.bottom + 5}px`;
    suggestionsContainer.style.left = `${boxRect.left}px`;
    suggestionsContainer.style.width = `${boxRect.width}px`;
    suggestionsContainer.style.display = filteredCommands.length ? 'block' : 'none';
    
    // Add click handlers to suggestions
    document.querySelectorAll('.qutefox-command-suggestion').forEach(el => {
      el.addEventListener('click', () => {
        const cmd = el.querySelector('.qutefox-command-key').textContent;
        processCommand(cmd);
        removeCommandPrompt();
      });
    });
  }
  
  function removeCommandPrompt() {
    document.body.removeChild(inputBox);
    document.body.removeChild(suggestionsContainer);
  }
 }
