// background.js
let recentlyClosedTabs = [];

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {

  if (message.action === "getHistorySuggestions") {
    browser.history.search({
      text: message.query,
      maxResults: 5
    }).then(historyItems => {
      sendResponse({
        success: true,
        suggestions: historyItems.map(item => ({
          url: item.url,
          title: item.title || item.url,
          source: 'history'
        }))
      });
    }).catch(error => {
      console.error('Error fetching history:', error);
      sendResponse({
        success: false,
        error: error.toString()
      });
    });
    return true; // Important: indicates we will send a response asynchronously
  }
  if (message.type === 'openTab') {
    browser.tabs.create({ url: message.url });
  } else if (message.type === 'closeTab') {
    browser.tabs.remove(sender.tab.id);
  } else if (message.type === 'nextTab') {
    browser.tabs.query({}, (tabs) => {
      const currentTabIndex = tabs.findIndex(tab => tab.active);
      const nextTabIndex = (currentTabIndex + 1) % tabs.length;
      browser.tabs.update(tabs[nextTabIndex].id, { active: true });
    });
  } else if (message.type === 'prevTab') {
    browser.tabs.query({}, (tabs) => {
      const currentTabIndex = tabs.findIndex(tab => tab.active);
      const prevTabIndex = (currentTabIndex - 1 + tabs.length) % tabs.length;
      browser.tabs.update(tabs[prevTabIndex].id, { active: true });
    });
  } else if (message.type === 'goBack') {
    browser.tabs.goBack(sender.tab.id);
  } else if (message.type === 'goForward') {
    browser.tabs.goForward(sender.tab.id);
  } else if (message.type === 'reloadPage') {
    browser.tabs.reload(sender.tab.id);
  } else if (message.type === 'storeTabInfo') {
    // Store tab info for recently closed tabs feature
    const tabInfo = {
      url: message.url,
      title: message.title,
      timestamp: Date.now()
    };
    
    // Add to front of array and limit to 10 entries
    recentlyClosedTabs.unshift(tabInfo);
    if (recentlyClosedTabs.length > 10) {
      recentlyClosedTabs.pop();
    }
  } else if (message.type === 'find') {
    browser.find.find(message.query).then(results => {
      if (results.count > 0) {
        browser.find.highlightResults();
      }
    });
  } else if(message.type === 'stopFind') {

  }
  else if (message.type === 'reopenTab') {
    browser.sessions.getRecentlyClosed({ maxResults: 1 })
      .then(sessions => {
        if (sessions.length > 0) {
          const sessionInfo = sessions[0];
          if (sessionInfo.tab) {
            return browser.sessions.restore(sessionInfo.tab.sessionId);
          } else if (sessionInfo.window) {
            return browser.sessions.restore(sessionInfo.window.sessionId);
          }
          throw new Error("No valid session found");
        } else {
          throw new Error("No recently closed sessions");
        }
      })
      .then(restoredSession => {
        sendResponse({ success: true, session: restoredSession });
      })
      .catch(error => {
        console.error("Error restoring session:", error);
        sendResponse({ success: false, error: error.toString() });
      });
    return true; // For async response
  }
  // else if (message.type === 'reopenTab') {
  //   // Reopen most recently closed tab
  //   if (recentlyClosedTabs.length > 0) {
  //     const tabInfo = recentlyClosedTabs.shift();
  //     browser.tabs.create({ url: tabInfo.url });
  //   }
  // } 


  else if (message.type === 'cloneTab') {
    // Clone current tab
    browser.tabs.duplicate(sender.tab.id);
  } else if (message.type === 'openDevTools') {
    // Open developer tools
    browser.tabs.executeScript(sender.tab.id, {
      code: "window.open('about:devtools-toolbox?id=' + window.location.href, '_blank');"
    });
  } else if (message.type === 'zoomIn') {
    // Zoom in
    browser.tabs.getZoom(sender.tab.id).then(zoomFactor => {
      browser.tabs.setZoom(sender.tab.id, zoomFactor + 0.1);
    });
  } else if (message.type === 'zoomOut') {
    // Zoom out
    browser.tabs.getZoom(sender.tab.id).then(zoomFactor => {
      browser.tabs.setZoom(sender.tab.id, zoomFactor - 0.1);
    });
  } else if (message.type === 'setZoom') {
    // Set zoom to specific level
    browser.tabs.setZoom(sender.tab.id, message.level / 100);
  } else if (message.type === 'search') {
    // Use the browser's default search engine for searches
    if (message.newTab) {
      browser.search.search({
        query: message.query,
        disposition: 'NEW_TAB'
      });
    } else {
      browser.search.search({
        query: message.query,
        disposition: 'CURRENT_TAB'
      });
    }
  }
});

// Listen for tab remove events to store recently closed tabs
browser.tabs.onRemoved.addListener((tabId, removeInfo) => {
  browser.tabs.get(tabId, (tab) => {
    if (browser.runtime.lastError) {
      // Tab might not exist anymore
      return;
    }
    
    const tabInfo = {
      url: tab.url,
      title: tab.title,
      timestamp: Date.now()
    };
    
    recentlyClosedTabs.unshift(tabInfo);
    if (recentlyClosedTabs.length > 10) {
      recentlyClosedTabs.pop();
    }
  });
});
