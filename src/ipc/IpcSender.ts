import { BrowserWindow } from 'electron';
import { QueryRequest } from './QueryRequest';

export class IpcSender{

    public static send(channel: string, toWin: BrowserWindow, request: QueryRequest) : void{
        toWin.webContents.send(channel,request);
    }
}