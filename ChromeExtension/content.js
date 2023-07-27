var keySequence = '';
var resetKeySequenceTimer, resetScrollTimer, resetWheellTimer;
var scrollPosition = window.scrollY;
var logBuffer = [];
var lastEventTime = 0;
var scrollDifference = 0;


function getCssSelector(element) {
}

function getFullXpath(element) {
    function index(el) {
        if (!el || !el.parentNode) {
            return 0;
        }
        var siblingsWithSameTag = Array.prototype.filter.call(el.parentNode.children, child => 
            child.tagName === el.tagName);
        return siblingsWithSameTag.length > 1 ? Array.prototype.indexOf.call(siblingsWithSameTag, el) + 1 : 0;
    }

    var paths = [];
    for (; element && element.nodeType == 1; element = element.parentNode) {
        var idx = index(element);
        var id = (idx > 0 ? '[' + idx + ']' : '');
        paths.unshift(element.tagName.toLowerCase() + id);
    }
    return paths.length ? '/' + paths.join('/') : null;
}


//[DONE]
var keydownListener = function(event) {
    let key = event.key;
    let targetElement = event.target;
    let targetXPath = getFullXpath(targetElement);

    // Always add the new key to the sequence
    keySequence += key;

    // If there is a timeout scheduled, clear it
    if (resetKeySequenceTimer) {
        clearTimeout(resetKeySequenceTimer);
		resetKeySequenceTimer = null;
    }

    // Set a new timeout
    resetKeySequenceTimer = setTimeout(function() {
        if (keySequence !== '') {
            let log = {
                type: 'keydown',
                data: keySequence,
                target: {
                    xpath: targetXPath
                },
                url: window.location.href,
                timestamp: new Date().getTime()
            };
            logBuffer.push(log);
            console.log("keydown log:", log);
            chrome.runtime.sendMessage({command: "addLog", log: log});
            keySequence = '';
        }
    }, 1000);
};



//[DONE]
var clickListener = function(event) {
    let targetElement = event.target;
	console.log(event.target);
    let targetXPath = getFullXpath(targetElement);

    // If there is a key sequence to log, log it
    if (keySequence !== '') {
		
		// If there is a timeout scheduled, clear it
        if (resetKeySequenceTimer) {
            clearTimeout(resetKeySequenceTimer);
            resetKeySequenceTimer = null;
        }
		
        let log = {
            type: 'keydown',
            data: keySequence,
            target: {
                xpath: targetXPath
            },
            url: window.location.href,
            timestamp: new Date().getTime()
        };
        logBuffer.push(log);
        console.log("keydown log:", log);
        chrome.runtime.sendMessage({command: "addLog", log: log});
        keySequence = '';

    }

	if(scrollDifference != 0){
		
		if (resetWheellTimer) {
        clearTimeout(resetWheellTimer);
		resetWheellTimer = null;
		}
		let log = {
            type: 'scroll',
            data: scrollDifference,
            target: {
                xpath: getFullXpath(document)
            },
            url: window.location.href,
            timestamp: new Date().getTime()
        };
        logBuffer.push(log);
        console.log("scroll log:", log);
        chrome.runtime.sendMessage({command: "addLog", log: log});
		scrollDifference = 0
	}

    let log = {
        type: 'click',
        target: {
            xpath: targetXPath
        },
        url: window.location.href,
        timestamp: new Date().getTime()
    };
    logBuffer.push(log);
    console.log("click log:", log);
    chrome.runtime.sendMessage({command: "addLog", log: log});
};

//[DONE]
var scrollListener = function(event) {
    let currentScrollPosition = window.scrollY;
    scrollDifference += currentScrollPosition - scrollPosition;
    scrollPosition = currentScrollPosition;

    if (resetScrollTimer) {
        clearTimeout(resetScrollTimer);
		resetScrollTimer = null;
    }

    resetScrollTimer = setTimeout(function() {
        let log = {
            type: 'scroll',
            data: scrollDifference,
            target: {
                xpath: getFullXpath(document)
            },
            url: window.location.href,
            timestamp: new Date().getTime()
        };
        logBuffer.push(log);
        console.log("scroll log:", log);
        chrome.runtime.sendMessage({command: "addLog", log: log});
		scrollDifference = 0
    }, 500);
};

var wheelListener = function(event) {
    let scrollDirection = event.deltaY;
	scrollDifference += scrollDirection
    let targetElement = event.target;
    let targetXPath = getFullXpath(targetElement);

    if (resetWheellTimer) {
        clearTimeout(resetWheellTimer);
        resetWheellTimer = null;
    }

    resetWheellTimer = setTimeout(function() {
        let log = {
            type: 'wheel',
            by: scrollDifference,
            target: {
                xpath: targetXPath
            },
            url: window.location.href,
            timestamp: new Date().getTime()
        };
        logBuffer.push(log);
        console.log("wheel log:", log);
        chrome.runtime.sendMessage({command: "addLog", log: log});
		scrollDifference = 0;
    }, 500);
};

var contextmenuListener = function(event) {
    let targetElement = event.target;
    let targetXPath = getFullXpath(targetElement);
    let log = {
        type: 'contextmenu',
        target: {
            xpath: targetXPath
        },
        url: window.location.href,
        timestamp: new Date().getTime()
    };
    logBuffer.push(log);
	console.log("contextmenu log:", log);
    chrome.runtime.sendMessage({command: "addLog", log: log});
};

function startLogging() {
	console.log("Starting logging");
    // Get the logging state
    chrome.storage.local.get(['logging'], function(result) {
		console.log(result);
		// Changed not true to true
        if (result.logging) {
            console.log("Starting logging");
            // Set the logging state to true
            chrome.storage.local.set({logging: true}, function() {
                document.addEventListener('keydown', keydownListener);
                document.addEventListener('click', clickListener);
                window.addEventListener('wheel', wheelListener);
                document.addEventListener('contextmenu', contextmenuListener);
            });
        }
    });
}

function stopLogging() {
	console.log("Stopping logging");
    // Get the logging state
    chrome.storage.local.get(['logging'], function(result) {
		// Changed true to not true
        if (!result.logging) {
            console.log("Stopping logging");
            // Set the logging state to false
            chrome.storage.local.set({logging: false}, function() {
                document.removeEventListener('keydown', keydownListener);
                document.removeEventListener('click', clickListener);
                window.removeEventListener('wheel', wheelListener);
                document.removeEventListener('contextmenu', contextmenuListener);
            });
        }
    });
}


chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        if (request.command == "startLogging") {
            startLogging();
        } else if (request.command == "stopLogging") {
            stopLogging();
        }
    }
);
