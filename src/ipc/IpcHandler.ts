import { IpcRenderer, IpcRendererEvent } from 'electron';
import * as _ from 'lodash';

export class IpcHandler {
  private ipcRenderer: IpcRenderer;

  constructor(ipcRenderer: IpcRenderer){
    this.ipcRenderer = ipcRenderer;
  }

  public handle(channel: string, cb: (event: IpcRendererEvent, req: any) => Promise<any>): void{
    this.ipcRenderer.on(channel,this.handler(channel,cb));
  }

  public handleOnce(channel: string, cb: (event: IpcRendererEvent, req: any) => Promise<any>): void{
    this.ipcRenderer.once(channel,this.handler(channel,cb));
  }

  private handler(channel: string, cb : (event: IpcRendererEvent, req: any) => Promise<any>) : (event: IpcRendererEvent, req: any) => void{
    let handler = (event: IpcRendererEvent, req: any) =>{
      cb(event,req).then((response)=>{
        if (!_.isNil(response)){
          this.send(channel,response);
        }
      });
    };  
    return handler;
  }

  private send(channel: string, response: any) {
    this.ipcRenderer.send(channel,response);
  }
}