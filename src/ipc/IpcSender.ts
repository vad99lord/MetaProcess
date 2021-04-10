import {BrowserWindow, IpcRenderer} from 'electron';
import {IpcRequest} from "./IpcRequest";
import { QueryRequest } from './QueryRequest';

export class IpcSender{

    public static send(channel: string, toWin: BrowserWindow, request: QueryRequest) : void{
        toWin.webContents.send(channel,request);
    }
}