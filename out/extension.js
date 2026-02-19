"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
class LiveBrowserViewProvider {
    _extensionUri;
    static viewType = 'liveBrowser.view';
    _view;
    _currentFilePath;
    constructor(_extensionUri) {
        this._extensionUri = _extensionUri;
    }
    resolveWebviewView(webviewView) {
        this._view = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [vscode.Uri.file('/')]
        };
        const url = vscode.workspace
            .getConfiguration('liveBrowser')
            .get('url', 'https://example.com');
        webviewView.webview.html = this._getIframeHtml(url);
    }
    // Load a URL via iframe
    goToUrl(url) {
        if (this._view) {
            this._currentFilePath = undefined; // clear any watched file
            vscode.workspace
                .getConfiguration('liveBrowser')
                .update('url', url, vscode.ConfigurationTarget.Global);
            this._view.webview.html = this._getIframeHtml(url);
        }
    }
    // Load a local HTML file directly into the webview
    loadFile(filePath) {
        if (this._view) {
            this._currentFilePath = filePath;
            const fileContent = fs.readFileSync(filePath, 'utf8');
            this._view.webview.html = fileContent;
        }
    }
    // Reload the current file if one is loaded
    reloadIfWatching(savedFilePath) {
        if (this._currentFilePath && this._currentFilePath === savedFilePath) {
            this.loadFile(this._currentFilePath);
        }
    }
    // Get the currently watched file path
    get currentFilePath() {
        return this._currentFilePath;
    }
    _getIframeHtml(url) {
        return `<!DOCTYPE html>
<html style="height:100%; margin:0; padding:0;">
<head>
  <meta http-equiv="Content-Security-Policy" content="default-src *; script-src * 'unsafe-inline'; style-src * 'unsafe-inline'; img-src * data:;">
  <style>
    body, html { height: 100%; margin: 0; padding: 0; overflow: hidden; }
    iframe { width: 100%; height: 100%; border: none; display: block; }
    #toolbar {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 8px;
      background: var(--vscode-editor-background);
      border-bottom: 1px solid var(--vscode-panel-border);
    }
    input {
      flex: 1;
      padding: 3px 6px;
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border);
      border-radius: 3px;
      font-size: 12px;
    }
    button {
      padding: 3px 10px;
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      border-radius: 3px;
      cursor: pointer;
      font-size: 12px;
    }
    button:hover { background: var(--vscode-button-hoverBackground); }
    #frame-container { height: calc(100% - 34px); }
  </style>
</head>
<body>
  <div id="toolbar">
    <input id="url-input" type="text" value="${url}" placeholder="https://..." />
    <button onclick="goToUrl()">Go</button>
    <button onclick="reload()">↺</button>
  </div>
  <div id="frame-container">
    <iframe id="frame" src="${url}" sandbox="allow-scripts allow-same-origin allow-forms allow-popups"></iframe>
  </div>

  <script>
    const frame = document.getElementById('frame');
    const input = document.getElementById('url-input');

    function goToUrl() {
      let url = input.value.trim();
      if (!url.startsWith('http')) url = 'https://' + url;
      frame.src = url;
    }

    function reload() {
      frame.src = frame.src;
    }

    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') goToUrl();
    });
  </script>
</body>
</html>`;
    }
}
function activate(context) {
    const provider = new LiveBrowserViewProvider(context.extensionUri);
    // Register the bottom panel webview
    context.subscriptions.push(vscode.window.registerWebviewViewProvider(LiveBrowserViewProvider.viewType, provider));
    // Command: Open a URL
    context.subscriptions.push(vscode.commands.registerCommand('liveBrowser.open', async () => {
        const url = await vscode.window.showInputBox({
            prompt: 'Enter URL',
            placeHolder: 'https://...',
            value: vscode.workspace
                .getConfiguration('liveBrowser')
                .get('url', ''),
        });
        if (url) {
            provider.goToUrl(url);
            vscode.commands.executeCommand('liveBrowser.view.focus');
        }
    }));
    // Command: Open a local HTML file
    context.subscriptions.push(vscode.commands.registerCommand('liveBrowser.openFile', async () => {
        const fileUri = await vscode.window.showOpenDialog({
            canSelectFiles: true,
            canSelectFolders: false,
            canSelectMany: false,
            filters: { 'HTML Files': ['html'] }
        });
        if (fileUri && fileUri[0]) {
            provider.loadFile(fileUri[0].fsPath);
            vscode.commands.executeCommand('liveBrowser.view.focus');
        }
    }));
    // Auto-reload on save
    context.subscriptions.push(vscode.workspace.onDidSaveTextDocument(document => {
        provider.reloadIfWatching(document.fileName);
    }));
}
function deactivate() { }
//# sourceMappingURL=extension.js.map