# windowExtension

A VSCode extension that displays a live browser panel at the bottom of your editor.

## Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- [VSCode](https://code.visualstudio.com/)

## Setup

1. Clone the repo:
```bash
   git clone <your-repo-url>
   cd windowExtension
```

2. Install dependencies:
```bash
   npm install
```

3. Compile the extension:
```bash
   npm run compile
```

## Running the Extension

1. Open the project in VSCode
2. Press **F5** to launch the Extension Development Host
3. In the new window, open the Command Palette (`Ctrl+Shift+P`)
4. Type **"Live Browser: Open URL in Panel"** and enter a URL
5. You can also change the URL by typing in the URL line that appears in the 
   Live Browser window.

## Development

After making changes to `src/extension.ts`, recompile before relaunching:
```bash
npm run compile
```
Then press F5 again.