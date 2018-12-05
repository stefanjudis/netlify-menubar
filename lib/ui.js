const { ipcMain, BrowserWindow } = require('electron');

let win;

const editAccessToken = async ({ accessToken, message }) => {
  return new Promise(resolve => {
    if (!win) {
      win = new BrowserWindow({
        width: 600,
        height: 400,
        title: 'Authorize Netlify',
        backgroundColor: '#000758',
        resizable: false,
        frame: false
      });
    }

    win.show();
    win.accessToken = accessToken;
    win.message = message;

    ipcMain.on('TOKEN_SAVED', (event, token) => {
      win.hide();
      resolve(token);
    });

    ipcMain.on('CLOSE_WINDOW', _ => {
      win.hide();
    });

    win.loadURL(`file://${__dirname}/../index.html`);
  });
};

module.exports = {
  editAccessToken
};
