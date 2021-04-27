import {app, BrowserWindow, ipcMain, IpcMainEvent, IpcMainInvokeEvent, WebContents} from 'electron';
import * as _ from "lodash";
import {IpcChannelInterface} from ".././ipc/IpcChannelInterface";
import { AttributeApi_ } from '../ipc/AttributesApi';
import { AttributeChannel } from '../ipc/AttributesChannel';
import { CloseChannel } from '../ipc/CloseChannel';
import { FileChannel } from '../ipc/FileChannel';
import { FileApi_ } from '../ipc/FilesApi';
import { IpcMainChannel } from '../ipc/IpcMainChannel';
import { IpcSender } from '../ipc/IpcSender';
import { QueryChannel } from '../ipc/QueryChannel';
import { QueryRequest } from '../ipc/QueryRequest';
import { ClassMethods, MethodArgumentTypes, RemoteApi } from '../ipc/RemoteApi';
import { WorkspaceWinApi,WorkspaceApi_ } from '../ipc/WorkspaceApi';
import { WorkspaceChannel } from '../ipc/WorkspaceChannel';

//auto reload view from source changes, dev only
if (_.isEqual(_.last(process.argv),"reload")){
    try {
      require('electron-reloader')(module)
    } catch (_) {}
}

const openedWP = new Map<number,string>();

export class Workspace implements WorkspaceApi_{
  private closeChan ?: CloseChannel;
  constructor(){ 
    app.on('ready', this.createWindow);
    app.on('window-all-closed', this.onWindowAllClosed);
    app.on('activate', this.onActivate);
    //this.createWorkspace.bind(this);
    //this.closeWorkspace.bind(this);
  }

  private wpListWindow?: BrowserWindow;

  private onWindowAllClosed = () => {
     if (process.platform !== 'darwin') {
       app.quit();
     }
  }

  private onActivate = () => {
    if (!this.wpListWindow) {
      this.createWindow();
    }
  }

  private createWindow = () => {
    this.wpListWindow = new BrowserWindow({
      height: 600,
      width: 800,
      title: `Yet another Electron Application`,
      webPreferences: {
        nodeIntegration: true, // makes it possible to use `require` within our index.html
        enableRemoteModule : true, // remove remove after debugging!
      },
      show : false
    });
    this.wpListWindow.loadFile('./src/app/workspaces.html');
    this.wpListWindow.once('ready-to-show', () => {
      this.wpListWindow!.show();
    })
  }

  public closeWorkspace(params : {ev : IpcMainInvokeEvent}){
    const wpWin = BrowserWindow.fromWebContents(params.ev.sender)!;
    openedWP.delete(wpWin.webContents.id);
    wpWin.close();
    //this.wp = null;
    const updateParams : WorkspaceWinApi<"updateWorkspace"> = { method: "updateWorkspace", params: [{}]};
    IpcSender.send(WorkspaceChannel.WORKSPACE_CHANNEL,this.wpListWindow!,updateParams);
    //this.wpListWindow!.webContents.send("Workspaces","updateWP");
    this.wpListWindow!.show();
  }

  public getWorkspace(params : {ev: IpcMainInvokeEvent}){
    const webConID = params.ev.sender.id;     
    const wp = AttributeApi_.prototype["getWorkspace"]({wpID : openedWP.get(webConID)});
    return wp;
  }

  public createWorkspace(params : {ev ?: IpcMainInvokeEvent,wpID : string}){
      const wpWin = this.createWorkspaceWin();  
      wpWin.once('ready-to-show', () => {
        this.wpListWindow!.hide();
        setTimeout(() => {
              wpWin.show();
            }, 500);
      })
      // wpWin.webContents.on('dom-ready', () => {
      //   setTimeout(() => {
      //     this.wpListWindow!.hide();
      //     wpWin.show();
      //   }, 500);
      // })
      wpWin.once('close', (e) => {
        e.preventDefault();
        //this.send();
        const saveParams : WorkspaceWinApi<"saveWorkspace"> = { method: "saveWorkspace", params: [{}]};
        IpcSender.send(WorkspaceChannel.WORKSPACE_CHANNEL,wpWin,saveParams);
        //wpWin.webContents.send(WorkspaceChannel.WORKSPACE_CHANNEL,"saveWP");
      })
      //this.closeChan!.send(win);
      openedWP.set(wpWin.webContents.id,params.wpID);
  }; 
  noArgs(params?: any){};

  private createWorkspaceWin(){
    const wpWin = new BrowserWindow({
      height: 600,
      width: 800,
      title: `Yet another Electron Application`,
      webPreferences: {
        nodeIntegration: true, // makes it possible to use `require` within our index.html
        enableRemoteModule : true, // remove remove after debugging!
      },
      show : false
    });
    //wpWin.webContents.openDevTools();
    wpWin.loadFile('./src/app/index.html');
    wpWin.maximize();
    return wpWin;
  }


}

function registerIpcChannels(ipcChannels: IpcChannelInterface[]) {
  ipcChannels.forEach(channel => ipcMain.handle(channel.getName(), (event, request) => channel.handle(event, request)));
}

//update files status
FileApi_.prototype["checkDocsExist"]({});

const wp = new Workspace();

registerIpcChannels([new QueryChannel(),new AttributeChannel(), new FileChannel(),new WorkspaceChannel(wp)]);