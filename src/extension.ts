import * as vscode from 'vscode';
import * as fs from 'fs';

class LiveBrowserViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'liveBrowser.view';
  private _view?: vscode.WebviewView;
  private _currentFilePath?: string;

  constructor(private readonly _extensionUri: vscode.Uri) {}

  resolveWebviewView(webviewView: vscode.WebviewView) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.file('/')]
    };

    const url = vscode.workspace
      .getConfiguration('liveBrowser')
      .get<string>('url', 'https://example.com');

    webviewView.webview.html = this._getIframeHtml(url);
  }

  // Load a URL via iframe
  public goToUrl(url: string) {
    if (this._view) {
      this._currentFilePath = undefined; // clear any watched file
      vscode.workspace
        .getConfiguration('liveBrowser')
        .update('url', url, vscode.ConfigurationTarget.Global);

      this._view.webview.html = this._getIframeHtml(url);
    }
  }

  // Load a local HTML file directly into the webview
  public loadFile(filePath: string) {
    if (this._view) {
      this._currentFilePath = filePath;
      const fileContent = fs.readFileSync(filePath, 'utf8');
      this._view.webview.html = fileContent;
    }
  }

  // Reload the current file if one is loaded
  public reloadIfWatching(savedFilePath: string) {
    if (this._currentFilePath && this._currentFilePath === savedFilePath) {
      this.loadFile(this._currentFilePath);
    }
  }

  // Get the currently watched file path
  public get currentFilePath(): string | undefined {
    return this._currentFilePath;
  }

  private _getIframeHtml(url: string): string {
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

export function activate(context: vscode.ExtensionContext) {
  const provider = new LiveBrowserViewProvider(context.extensionUri);

  // Register the bottom panel webview
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      LiveBrowserViewProvider.viewType,
      provider
    )
  );

  // Command: Open a URL
  context.subscriptions.push(
    vscode.commands.registerCommand('liveBrowser.open', async () => {
      const url = await vscode.window.showInputBox({
        prompt: 'Enter URL',
        placeHolder: 'https://...',
        value: vscode.workspace
          .getConfiguration('liveBrowser')
          .get<string>('url', ''),
      });

      if (url) {
        provider.goToUrl(url);
        vscode.commands.executeCommand('liveBrowser.view.focus');
      }
    })
  );

  // Command: Open a local HTML file
  context.subscriptions.push(
    vscode.commands.registerCommand('liveBrowser.openFile', async () => {
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
    })
  );

  // Auto-reload on save
  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument(document => {
      provider.reloadIfWatching(document.fileName);
    })
  );
}

export function deactivate() {}