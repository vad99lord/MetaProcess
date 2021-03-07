import {IpcRenderer} from 'electron';
import {IpcRequest} from "./IpcRequest";
import { QueryRequest } from './QueryRequest';

export class IpcService {
  private ipcRenderer: IpcRenderer;

  constructor(ipcRenderer: IpcRenderer){
    this.ipcRenderer = ipcRenderer;
  }

  public async send<T>(channel: string, request: QueryRequest): Promise<T> {
    const response = await this.ipcRenderer.invoke(channel,request);
    return response;
  }
}