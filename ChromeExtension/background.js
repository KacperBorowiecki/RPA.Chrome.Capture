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
        }
    }
});


var logging = false;
var logBuffer = [];
var request = indexedDB.open('LogDatabase', 2);
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
  if (!logging) {
    logging = true;
    // Send a message to content.js to start logging
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {command: "startLogging"});
    });
  }
}

function stopLogging() {
  if (logging) {
    logging = false;
    // Send a message to content.js to stop logging
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {command: "stopLogging"});
    });
  }
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
