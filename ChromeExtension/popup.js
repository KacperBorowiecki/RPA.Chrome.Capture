document.getElementById('startLogging').addEventListener('click', function() {
  chrome.runtime.sendMessage({command: "startLogging"}, function(response) {
    if (chrome.runtime.lastError) {
      console.error(chrome.runtime.lastError.message);
    } else {
      console.log(response);
    }
  });
});

document.getElementById('stopLogging').addEventListener('click', function() {
  chrome.runtime.sendMessage({command: "stopLogging"}, function(response) {
    if (chrome.runtime.lastError) {
      console.error(chrome.runtime.lastError.message);
    } else {
      console.log(response);
    }
  });
});

document.getElementById('downloadLogs').addEventListener('click', function() {
  chrome.runtime.sendMessage({command: "downloadLogs"}, function(response) {
    if (chrome.runtime.lastError) {
      console.error(chrome.runtime.lastError.message);
    } else {
      console.log(response);
    }
  });
});
