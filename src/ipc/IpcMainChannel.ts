import {BrowserWindow, IpcMainEvent} from 'electron';

export interface IpcMainChannel {
  getName(): string;
  
  send(toWin : BrowserWindow, args ?: any) : void;

  once?(event: IpcMainEvent, response: any): void;

  on?(event: IpcMainEvent, response: any) : void;
}