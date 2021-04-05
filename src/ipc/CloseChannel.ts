import {IpcChannelInterface} from "./IpcChannelInterface";
import {App, BrowserWindow, IpcMainEvent, IpcMainInvokeEvent} from 'electron';
import { IpcMainChannel } from "./IpcMainChannel";
import { send } from "process";

export class CloseChannel implements IpcMainChannel{
  public static readonly CLOSE_CHANNEL = 'CLOSE_CHANNEL';
  private window: BrowserWindow|null;
  private app: App|null;
  getName(): string {
    return CloseChannel.CLOSE_CHANNEL;
  }
  constructor(window : BrowserWindow, app : App){
    this.window = window;
    this.app = app;
    this.window?.once('close', (e) => {
        e.preventDefault();
        this.send();
      })
  }

  send(args ?: any) : void{
    this.window?.webContents.send(this.getName());
  }

  once(event: IpcMainEvent, response: any): void {
    this.window = null;
    if (process.platform !== 'darwin') {
      this.app?.quit();
      this.app = null;
    }
  }
  // on(event: IpcMainEvent, response: any) : void {}
}