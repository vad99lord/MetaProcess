import {app, BrowserWindow, ipcMain} from 'electron';
import {IpcChannelInterface} from ".././ipc/IpcChannelInterface";
import { QueryChannel } from '../ipc/QueryChannel';
class Main {

  constructor(ipcChannels: IpcChannelInterface[]){  
    app.on('ready', this.createWindow);
    app.on('window-all-closed', this.onWindowAllClosed);
    app.on('activate', this.onActivate);
    this.registerIpcChannels(ipcChannels);
  }
  private mainWindow?: BrowserWindow;

  private onWindowAllClosed() {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  }

  private onActivate() {
    if (!this.mainWindow) {
      this.createWindow();
    }
  }

  private createWindow() {
    this.mainWindow = new BrowserWindow({
      height: 600,
      width: 800,
      title: `Yet another Electron Application`,
      webPreferences: {
        nodeIntegration: true // makes it possible to use `require` within our index.html
      }
    });

    this.mainWindow.webContents.openDevTools();
    this.mainWindow.loadFile('./src/app/index.html');
  }

  private registerIpcChannels(ipcChannels: IpcChannelInterface[]) {
    ipcChannels.forEach(channel => ipcMain.handle(channel.getName(), (event, request) => channel.handle(event, request)));
  }

}

// Here we go!
new Main([new QueryChannel()]);