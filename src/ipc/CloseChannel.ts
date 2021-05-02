import { BrowserWindow, IpcMainEvent } from 'electron';
import { IpcMainChannel } from "./IpcMainChannel";

export class CloseChannel implements IpcMainChannel{
  public static readonly CLOSE_CHANNEL = 'CLOSE_CHANNEL';
  private readonly workspaces: BrowserWindow;
  private readonly wpMap: Map<number, string>;
  getName(): string {
    return CloseChannel.CLOSE_CHANNEL;
  }
  constructor(main : BrowserWindow, wpMap : Map<number,string>){
    this.workspaces = main;
    this.wpMap = wpMap;
  }

  send(toWin: BrowserWindow, args?: any): void {
    toWin.once('close', (e) => {
      e.preventDefault();
      //this.send();
      toWin.webContents.send(this.getName());
    })
  }

  once(event: IpcMainEvent, response: any): void {}
  
  on(event: IpcMainEvent, response: any) : void {
    const wpWin = BrowserWindow.fromWebContents(event.sender)!;
    this.wpMap.delete(wpWin.webContents.id);
    wpWin.close();
    //this.wp = null;
    this.workspaces.webContents.send("Workspaces","updateWP");
    this.workspaces.show();
  }
}
