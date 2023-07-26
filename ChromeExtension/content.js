var keySequence = '';
var resetKeySequenceTimer, resetScrollTimer;
var scrollPosition = window.scrollY;
var logging = false;
var logBuffer = [];
var lastEventTime = 0;
var scrollDifference = 0;


function getFullSelector(element) {
    var pieces = [];
    while (element && element.tagName !== 'HTML') {
        var piece = element.tagName.toLowerCase();
        if (element.id) {
            piece += '#' + element.id;
        } else if (element.className && typeof element.className === 'string') {
            piece += '.' + element.className.split(' ').join('.');
        }
        pieces.unshift(piece);
        element = element.parentNode;
    }
    return pieces.join(' > ');
}



function getCssSelector(element) {
    if (element === document) {
        return "document";
    } else {
	var pieces = [];
    while (element && element.tagName !== 'HTML') {
        var piece = element.tagName.toLowerCase();
        if (element.id) {
            piece += '#' + element.id;
        } else if (element.className && typeof element.className === 'string') {
            piece += '.' + element.className.split(' ').join('.');
        }
        pieces.unshift(piece);
        element = element.parentNode;
    }
    return pieces.join(' > ');
	}

}

function getElementXPath(element) {
    if (element === document) {
        return "/html/body";
    } else {
		var xpath = '';
		while (element && element.nodeType === 1) {
			var id = Array.prototype.indexOf.call(element.parentNode.childNodes, element);
			id = id > 0 ? '[' + id + ']' : '';
			xpath = '/' + element.nodeName.toLowerCase() + id + xpath;
			element = element.parentNode;
		}
		return xpath;
	}
}

//[DONE]
var keydownListener = function(event) {
    let key = event.key;
    let targetElement = event.target;
    let targetXPath = getElementXPath(targetElement);
    let targetSelector = getCssSelector(targetElement);

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
                    xpath: targetXPath,
                    selector: ''//targetSelector
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
    let targetXPath = getElementXPath(targetElement);
    let targetSelector = getCssSelector(targetElement);

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
                xpath: targetXPath,
                selector: '' //getCssSelector(document.activeElement)
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
		
		if (resetScrollTimer) {
        clearTimeout(resetScrollTimer);
		resetScrollTimer = null;
		}
		let log = {
            type: 'scroll',
            data: scrollDifference,
            target: {
                xpath: getElementXPath(document),
                selector: ''//getCssSelector(document)
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
            xpath: targetXPath,
            selector: ''//targetSelector
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
                xpath: getElementXPath(document),
                selector: ''//getCssSelector(document)
            },
            url: window.location.href,
            timestamp: new Date().getTime()
        };
        logBuffer.push(log);
        console.log("scroll log:", log);
        chrome.runtime.sendMessage({command: "addLog", log: log});
		scrollDifference = 0
    }, 1000);
};


var contextmenuListener = function(event) {
    let targetElement = event.target;
    let targetXPath = getElementXPath(targetElement);
    let targetSelector = getCssSelector(targetElement);
    let log = {
        type: 'contextmenu',
        target: {
            xpath: targetXPath,
            selector: ''//targetSelector
        },
        url: window.location.href,
        timestamp: new Date().getTime()
    };
    logBuffer.push(log);
	console.log("contextmenu log:", log);
    chrome.runtime.sendMessage({command: "addLog", log: log});
};

function startLogging() {
    if (!logging) {
		console.log("Starting logging");
        logging = true;
        document.addEventListener('keydown', keydownListener);
        document.addEventListener('click', clickListener);
        window.addEventListener('scroll', scrollListener);
        document.addEventListener('contextmenu', contextmenuListener);
    }
}

function stopLogging() {
    if (logging) {
		console.log("Stopping logging");
        logging = false;
        document.removeEventListener('keydown', keydownListener);
        document.removeEventListener('click', clickListener);
        window.removeEventListener('scroll', scrollListener);
        document.removeEventListener('contextmenu', contextmenuListener);
    }
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
