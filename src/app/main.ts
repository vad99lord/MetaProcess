import {app, BrowserWindow, ipcMain, IpcMainEvent, IpcMainInvokeEvent, WebContents} from 'electron';
import * as _ from "lodash";
import {IpcChannelInterface} from ".././ipc/IpcChannelInterface";
import { AttributeApi_ } from '../ipc/AttributesApi';
import { AttributeChannel } from '../ipc/AttributesChannel';
import { CloseChannel } from '../ipc/CloseChannel';
import { FileChannel } from '../ipc/FileChannel';
import { IpcMainChannel } from '../ipc/IpcMainChannel';
import { IpcSender } from '../ipc/IpcSender';
import { QueryChannel } from '../ipc/QueryChannel';
import { QueryRequest } from '../ipc/QueryRequest';
import { ClassMethods, MethodArgumentTypes, RemoteApi } from '../ipc/RemoteApi';
import { WorkspaceWinApi,WorkspaceApi_ } from '../ipc/WorkspaceApi';
import { WorkspaceChannel } from '../ipc/WorkspaceChannel';

//auto reload view from source changes, dev only
/*try {
  require('electron-reloader')(module)
} catch (_) {}*/


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
    });
    //this.closeChan = new CloseChannel(this.wpListWindow!,openedWP)
    //registerIpcMainChannels([this.closeChan!])
    // this.wpWindow.webContents.openDevTools();
    this.wpListWindow.loadFile('./src/app/workspaces.html');

    /*
    //get workspace by renderer window
    ipcMain.handle("Workspace",(ev,req: string)=>{
      if (!_.isEqual(req,"getWP"))
          return;
      const webConID = ev.sender.id;     
      const wp = AttributeApi_.prototype["getWorkspace"]({wpID : openedWP.get(webConID)});
      return wp;
    });
    //create new workspace by id
    ipcMain.on("Workspace",(event, request : string)=>{
      /*if (_.isEqual(request,"chooseWP")){
          this.wpWindow!.show();
          return;
      }
  
      const wpID = request;
      this.wpListWindow!.hide();
      const win = createWorkspaceWin();
      this.closeChan!.send(win);
      openedWP.set(win.webContents.id,wpID);
    });

    */
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
      this.wpListWindow!.hide();
      const wpWin = this.createWorkspaceWin();
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
    });
    //wpWin.webContents.openDevTools();
    wpWin.loadFile('./src/app/index.html');
    return wpWin;
  }


}

/*
function createWorkspaceWin(){
  const wpWin = new BrowserWindow({
    height: 600,
    width: 800,
    title: `Yet another Electron Application`,
    webPreferences: {
      nodeIntegration: true, // makes it possible to use `require` within our index.html
      enableRemoteModule : true, // remove remove after debugging!
    },
  });
  wpWin.once('close', (e) => {
    e.preventDefault();
    //this.send();
    const saveParams : WorkspaceWinApi<"saveWorkspace"> = { method: "saveWorkspace", params: [{}]};
    IpcSender.send(WorkspaceChannel.WORKSPACE_CHANNEL,wpWin,saveParams);
    wpWin.webContents.send("Workspace","saveWP");
  })
  //wpWin.webContents.openDevTools();
  wpWin.loadFile('./src/app/index.html');
  return wpWin;
}*/


/*
class Main {

  constructor(){  
    this.createWindow();
    //app.on('ready', this.createWindow);
    //app.on('window-all-closed', this.onWindowAllClosed);
    //app.on('activate', this.onActivate);
    //this.registerIpcChannels(ipcChannels);
  }

  public mainWindow?: BrowserWindow;

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

  public getWebContentsID(){
    return this.mainWindow?.webContents.id
  }

  private createWindow() {
    
  }

  private registerIpcChannels(ipcChannels: IpcChannelInterface[]) {
    ipcChannels.forEach(channel => ipcMain.handle(channel.getName(), (event, request) => channel.handle(event, request)));
  }
  
  public static registerIpcMainChannels(ipcMainChannels: IpcMainChannel[]) {
    _.forEach(ipcMainChannels, (mainChannel) => {
      if (!_.isNil(mainChannel.on)){
        ipcMain.on(mainChannel.getName(),(e, res) => mainChannel.on!(e, res));
      }
      if (!_.isNil(mainChannel.once)){
        ipcMain.once(mainChannel.getName(),(e, res) => mainChannel.once!(e, res));
      }
    });
  }

}*/

function registerIpcMainChannels(ipcMainChannels: IpcMainChannel[]) {
  _.forEach(ipcMainChannels, (mainChannel) => {
    if (!_.isNil(mainChannel.on)){
      ipcMain.on(mainChannel.getName(),(e, res) => mainChannel.on!(e, res));
    }
    if (!_.isNil(mainChannel.once)){
      ipcMain.once(mainChannel.getName(),(e, res) => mainChannel.once!(e, res));
    }
  });
}

function registerIpcChannels(ipcChannels: IpcChannelInterface[]) {
  ipcChannels.forEach(channel => ipcMain.handle(channel.getName(), (event, request) => channel.handle(event, request)));
}

// Here we go!
//new Main([new QueryChannel(),new AttributeChannel(), new FileChannel()]);
//console.log("regging");
const wp = new Workspace();

registerIpcChannels([new QueryChannel(),new AttributeChannel(), new FileChannel(),new WorkspaceChannel(wp)]);