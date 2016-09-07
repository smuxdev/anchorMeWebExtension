// Al clickar el botón de la aplicación ejecutar el método 'handleClick'
chrome.browserAction.onClicked.addListener(handleClick);
chrome.runtime.onMessage.addListener(anchorListener);

// Inyecta el js principal en la página
function handleClick() {
    chrome.tabs.executeScript(null, {
        file: "/content_scripts/anchorMe.js"
    });

    // TODO: No se inserta el CSS. En el debug del add-on aparece un error
    chrome.tabs.insertCSS({file: "/css/anchorMe.css"});

    // En principio no me hace falta hablar con el script de la página
    /*chrome.tabs.query({
        active: true,
        currentWindow: true},
        function (tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {jQueryURL: chrome.extension.getURL("libs/jquery-3.1.0.min.js")});
    });*/
}

// Recive mensajes desde el script de la página
function anchorListener (request) {
    // Si la página no disponde de jQuery hay que inyectarlo
    if(!request.isJQuery) {
        chrome.tabs.executeScript(null, {
            file: "/libs/jquery-3.1.0.min.js"
        });
    }
}
