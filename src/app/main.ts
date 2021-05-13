import { app, BrowserWindow, ipcMain, IpcMainInvokeEvent, shell } from 'electron';
import * as dotenv from "dotenv";
import path from "path"
dotenv.config({path: path.join(app.getAppPath(),".env")}); //get env variables
require('hazardous'); //fix asar app paths
import * as _ from "lodash";
import { IpcChannelInterface } from ".././ipc/IpcChannelInterface";
import { AttributeApi_ } from '../ipc/AttributesApi';
import { AttributeChannel } from '../ipc/AttributesChannel';
import { CloseChannel } from '../ipc/CloseChannel';
import { FileChannel } from '../ipc/FileChannel';
import { FileApi_ } from '../ipc/FilesApi';
import { IpcSender } from '../ipc/IpcSender';
import { QueryChannel } from '../ipc/QueryChannel';
import { WorkspaceApi_, WorkspaceWinApi } from '../ipc/WorkspaceApi';
import { WorkspaceChannel } from '../ipc/WorkspaceChannel';
import { createMenu } from './app-menu';

//auto reload view from source changes, dev only
if (process.argv.includes("reload")){
    try {
      require('electron-reloader')(module)
    } catch (_) {}
}
const openedWP = new Map<number,string>();

export class Workspace implements WorkspaceApi_{
  private closeChan ?: CloseChannel;
  constructor(){ 
    app.on('ready', this.onReady);
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

  private onReady = () => {
    createMenu(app,shell);
    this.createWindow();
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
      show : false,
      resizable: false
    });
    this.wpListWindow.loadFile('./src/static/html/workspaces.html');
    //no menu for start window
    if (!process.argv.includes("reload") && !process.argv.includes("dev")){
        this.wpListWindow.removeMenu();
    }
    app.dock?.hide(); //hide menu bar for macOS  
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
      });
      wpWin.once('close', (e) => {
        e.preventDefault();
        //this.send();
        const closeParams : WorkspaceWinApi<"closeWorkspace"> = { method: "closeWorkspace", params: [{}]};
        IpcSender.send(WorkspaceChannel.WORKSPACE_CHANNEL,wpWin,closeParams);
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
    wpWin.loadFile('./src/static/html/index.html');
    // wpWin.removeMenu();
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