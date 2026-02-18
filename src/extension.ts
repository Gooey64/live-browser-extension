import * as vscode from 'vscode';

class LiveBrowserViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'liveBrowser.view';
  private _view?: vscode.WebviewView;

  constructor(private readonly _extensionUri: vscode.Uri) {}

  resolveWebviewView(webviewView: vscode.WebviewView) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
    };

    const url = vscode.workspace
      .getConfiguration('liveBrowser')
      .get<string>('url', 'https://example.com');

    webviewView.webview.html = this._getHtml(url);
  }

  public goToURL(url: string) {
    if (this._view) {
      // Save to settings
      vscode.workspace
        .getConfiguration('liveBrowser')
        .update('url', url, vscode.ConfigurationTarget.Global);

      // Re-render the webview with the new URL
      this._view.webview.html = this._getHtml(url);
    }
  }

  private _getHtml(url: string): string {
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
    <button onclick="goToURL()">Go</button>
    <button onclick="reload()">↺</button>
  </div>
  <div id="frame-container">
    <iframe id="frame" src="${url}" sandbox="allow-scripts allow-same-origin allow-forms allow-popups"></iframe>
  </div>

  <script>
    const frame = document.getElementById('frame');
    const input = document.getElementById('url-input');

    function goToURL() {
      let url = input.value.trim();
      if (!url.startsWith('http')) url = 'https://' + url;
      frame.src = url;
    }

    function reload() {
      frame.src = frame.src;
    }

    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') goToURL();
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

  // Command to prompt for a URL and goToURL
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
        provider.goToURL(url);
        // Make the panel visible
        vscode.commands.executeCommand('liveBrowser.view.focus');
      }
    })
  );
}

export function deactivate() {}