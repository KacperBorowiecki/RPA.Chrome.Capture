// Set the logging state
chrome.storage.local.set({logging: false});

// Get the logging state
chrome.storage.local.get(['logging'], function(result) {
    console.log('Logging state is ' + result.logging);
});

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'capture') {
        chrome.tabs.captureVisibleTab(null, {format: 'png'}, function(dataUrl) {
            sendResponse({image: dataUrl});
        });
        return true;  // Return true to indicate that we will respond asynchronously.
    } else if (request.command) {
        console.log("Command received: ", request.command);
        if (request.command == "startLogging") {
            console.log("Start logging message received");
            startLogging();
        } else if (request.command == "stopLogging") {
            console.log("Stop logging message received");
            stopLogging();
        } else if (request.command == "downloadLogs") {
            console.log("Download logs message received");
            downloadLogs();
        } else if (request.command == "addLog") {
            console.log("Add log message received");
            addLog(request.log);
        } else if (request.command == "createG1antScript") {
            console.log("createG1antScript message received");
            createG1antScript();
        }
    }
});


var logging = false;
var logBuffer = [];
var request = indexedDB.open('LogDatabase', 3);
var db;

request.onupgradeneeded = function(event) {
    console.log("Upgrading database");
    db = event.target.result;
    if (!db.objectStoreNames.contains('LogStore')) {
        console.log("Creating object store LogStore");
        db.createObjectStore('LogStore', {autoIncrement: true});
    }
};

request.onsuccess = function(event) {
    db = event.target.result;
};

function startLogging() {
  // Get the logging state
  chrome.storage.local.get(['logging'], function(result) {
    if (!result.logging) {
      // Send a message to content.js to start logging
      // Query all tabs and send them the startLogging message
      chrome.tabs.query({}, function(tabs) {
        for (let i = 0; i < tabs.length; i++) {
          chrome.tabs.sendMessage(tabs[i].id, {command: "startLogging"});
		  //console.log(tabs[i].id)
        }
      });
	        // Set the logging state to true
      chrome.storage.local.set({logging: true});
    }
  });
}

function stopLogging() {
  // Get the logging state
  chrome.storage.local.get(['logging'], function(result) {
    if (result.logging) {
      // Send a message to content.js to stop logging
      // Query all tabs and send them the stopLogging message
      chrome.tabs.query({}, function(tabs) {
        for (let i = 0; i < tabs.length; i++) {
          chrome.tabs.sendMessage(tabs[i].id, {command: "stopLogging"});
        }
      });
		// Set the logging state to false
      chrome.storage.local.set({logging: false});
    }
  });
}


async function addLog(log) {
    console.log("Adding log: ", log);
    if (!db) {
        console.log("Database is not opened");
        return;
    }

    // Check if LogStore exists
    if (!db.objectStoreNames.contains('LogStore')) {
        console.log("LogStore does not exist");
        return;
    }

    var tx = db.transaction('LogStore', 'readwrite');
    var store = tx.objectStore('LogStore');
    try {
        await store.add(log);
        console.log("Log added to the store", log);
    } catch (err) {
        console.error("Error adding log to the store", err);
    }
}



function downloadLogs() {
  if (!db) {
      console.log("Database is not opened");
      return;
  }

  var transaction = db.transaction(['LogStore'], 'readonly');
  var objectStore = transaction.objectStore('LogStore');

  // Get all the logs from the database
  objectStore.getAll().onsuccess = function(event) {
    var logs = event.target.result;

    // Convert the logs to a string
    var logStr = logs.map(JSON.stringify).join('\\n');

    // Create a Blob with the logs
    var blob = new Blob([logStr], {type: 'text/plain'});

    // Create a URL for the Blob
    var url = URL.createObjectURL(blob);

    // Create a download link and click it
    var a = document.createElement('a');
    a.download = 'logs.log';
    a.href = url;
    a.click();

    // Revoke the URL
    URL.revokeObjectURL(url);
  };
}


chrome.tabs.onCreated.addListener(function(tab) {
    chrome.storage.local.get(['logging'], function(result) {
        if (result.logging) {
            console.log('Tab opened with ID: ' + tab.id);
            let log = {
                type: 'NewTabOpened',
                url: tab.url,
                timestamp: new Date().getTime()
            };
            addLog(log);
            console.log(log);
        }
    });
});

chrome.tabs.onRemoved.addListener(function(tabId, removeInfo) {
    chrome.storage.local.get(['logging'], function(result) {
        if (result.logging) {
            console.log('Tab closed with ID: ' + tabId);
            let log = {
                type: 'TabRemoved',
                timestamp: new Date().getTime()
            };
            addLog(log);
            console.log(log);
        }
    });
});

chrome.tabs.onActivated.addListener(function(activeInfo) {
    chrome.storage.local.get(['logging'], function(result) {
        if (result.logging) {
            console.log('Tab activated with ID: ' + activeInfo.tabId);
            chrome.tabs.get(activeInfo.tabId, function(tab) {
                let log = {
                    type: 'TabActivated',
                    url: tab.url,
                    timestamp: new Date().getTime()
                };
                addLog(log);
                console.log(log);
            });
        }
    });
});

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    chrome.storage.local.get(['logging'], function(result) {
        if (result.logging) {
            // If the URL has changed
            if (changeInfo.url) {
                console.log('Tab updated with ID: ' + tabId);
                console.log('New URL: ' + changeInfo.url);
                let log = {
                    type: 'urlChanged',
                    url: changeInfo.url,
                    timestamp: new Date().getTime()
                };
                addLog(log);
                console.log(log);
            }

            if (changeInfo.status === 'complete') {
                chrome.tabs.sendMessage(tabId, {command: "startLogging"});
            }
        }
    });
});

chrome.webNavigation.onCommitted.addListener(function(details) {
    chrome.storage.local.get(['logging'], function(result) {
        if (result.logging) {
            if (details.transitionType === 'reload') {
                console.log('Tab refreshed with ID: ' + details.tabId);
                let log = {
                    type: 'refresh',
                    url: details.url,
                    timestamp: new Date().getTime()
                };
                addLog(log);
                console.log(log);

                // Send a message to the tab to start logging
                chrome.tabs.sendMessage(details.tabId, {command: "startLogging"});
            }
        }
    });
});

function parseLogToG1ANT(log) {
    let g1antScript = "";
	let searchValue = `search ‴${log.target.xpath}‴ by ‴xpath‴`;
    switch(log.type) {
        case 'keydown'://[done]
            g1antScript = `selenium.type text ‴${log.data}‴ ${searchValue}`;
            break;
        case 'click'://[done]
            g1antScript = `selenium.click search ‴${log.target.xpath}‴ by ‴xpath‴`;
            break;
        case 'NewTabOpened'://need to add logic - has to be opened tab with new url. no option to open tab without url
            g1antScript = `selenium.newtab url ${log.url}`;
            break;
        case 'TabRemoved'://need to add logic about closing tab - need to know which tab should be closed. First activate this tab, if not activated
            g1antScript = `selenium.closetab`;
            break;
        case 'TabActivated'://[done]
            g1antScript = `selenium.activatetab search ‴${log.url}‴ by ‴url‴`;
            break;
        case 'urlChanged'://[done]
            g1antScript = `selenium.seturl url ‴${log.url}‴`;
            break;
        case 'refresh'://[done]
            g1antScript = `selenium.refresh`;
            break;
		case 'wheel'://[done]
			g1antScript = `selenium.runscript script ‴var xpath = ${log.target.xpath}; var evaluator = new XPathEvaluator(); var result = evaluator.evaluate(xpath, document.documentElement, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);var element = result.singleNodeValue;element.scrollBy(0,{log.scrollBy});‴`
        default:
            console.log(`Unknown log type: ${log.type}`);
    }

    return g1antScript;
}


function createG1antScript() {
	console.log('command started')
	var transaction = db.transaction(["LogStore"]);
	var objectStore = transaction.objectStore("LogStore");

	var logScripts = [];

	objectStore.openCursor().onsuccess = function(event) {
		var cursor = event.target.result;
		if (cursor) {
			var log = cursor.value;
			var script = parseLogToG1ANT(log);
			logScripts.push(script);
			cursor.continue();
		} else {
			// Done iterating through all logs
			var fullScript = logScripts.join('\n');
			console.log(fullScript);
		}
	};

}
