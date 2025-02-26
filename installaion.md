# Installing the Qutebrowser Style Firefox Extension

## Prepare the extension files

1. Create a new directory for your extension
2. Create the following files in that directory:
   - `manifest.json`
   - `background.js`
   - `content.js`
   - `styles.css`
3. Create an `icons` directory and add icon files:
   - `icon16.png` (16x16 pixels)
   - `icon48.png` (48x48 pixels)
   - `icon128.png` (128x128 pixels)
   
## Install the extension in Firefox

1. Open Firefox
2. Enter `about:debugging` in the address bar
3. Click "This Firefox" on the left sidebar
4. Click "Load Temporary Add-on..."
5. Navigate to your extension directory and select the `manifest.json` file
6. The extension should now be loaded and active

## For permanent installation

To create a permanently installable extension:

1. Zip all the files (manifest.json, js files, css files, and icons folder)
2. Rename the zip file to have a `.xpi` extension
3. Submit to the Firefox Add-ons store or self-host for distribution

## Usage

Once installed, the extension will work on all web pages:

- The mode indicator will appear in the bottom-right corner
- By default, you start in normal mode (blue indicator)
- Press `i` to enter insert mode (green indicator)
- Press `Escape` to return to normal mode
- Use qutebrowser keybindings to navigate
