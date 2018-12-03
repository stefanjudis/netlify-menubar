const { ipcMain, BrowserWindow } = require('electron');

let win;

const editAccessToken = async token => {
  return new Promise(resolve => {
    if (!win) {
      win = new BrowserWindow({
        width: 500,
        height: 300,
        title: 'Authorize Netlify',
        backgroundColor: '#000758',
        resizable: false,
        frame: false
      });
    }

    win.show();
    win.accessToken = token;

    ipcMain.on('TOKEN_SAVED', (event, token) => {
      win.hide();
      resolve(token);
    });

    ipcMain.on('CLOSE_WINDOW', (event, token) => {
      win.hide();
    });

    win.loadURL(`file://${__dirname}/../index.html`);
  });
};

module.exports = {
  editAccessToken
};
