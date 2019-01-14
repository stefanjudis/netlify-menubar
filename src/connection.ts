import { BrowserWindow, ipcMain } from 'electron'; // tslint:disable-line no-implicit-dependencies
import { EventEmitter } from 'events';

export default class Connection extends EventEmitter {
  private status: string;
  private statusWindow: BrowserWindow;

  public constructor() {
    super();

    this.status = 'PENDING';
    this.statusWindow = new BrowserWindow({
      height: 0,
      show: false,
      width: 0
    });
    this.statusWindow.loadURL(`data:text/html;charset=utf-8,<!DOCTYPE html>
    <html>
      <body>
        <script>
          const { ipcRenderer } = require('electron');
          const update = () => ipcRenderer.send('status-changed', navigator.onLine);
          window.addEventListener('online',  update);
          window.addEventListener('offline',  update);
          update()
        </script>
      </body>
    </html>`);

    ipcMain.on('status-changed', (event, status) => {
      this.status = status ? 'ONLINE' : 'OFFLINE';
      this.emit('status-changed', this);
    });
  }

  public get isOnline(): boolean {
    return this.status === 'ONLINE';
  }
}
