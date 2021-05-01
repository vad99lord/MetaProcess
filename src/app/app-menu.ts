import { App, Menu, MenuItemConstructorOptions, Shell } from "electron";
import { IpcSender } from "../ipc/IpcSender";
import { WorkspaceWinApi } from "../ipc/WorkspaceApi";
import { WorkspaceChannel } from "../ipc/WorkspaceChannel";

export function createMenu(app: App, shell: Shell) {
  const isMac = process.platform === 'darwin'

  const appMenu : MenuItemConstructorOptions | null = isMac ? { role: 'appMenu' } : null;
  
  const fileMenu : MenuItemConstructorOptions = {
    label: 'File',
    submenu: [{
      label: 'Save',
      accelerator: 'CommandOrControl+S',
      click: (item,win,key) => {
        // console.log("save");
        if (!win){
          return;
        }
        const saveParams : WorkspaceWinApi<"saveWorkspace"> = { method: "saveWorkspace", params: [{}]};
        IpcSender.send(WorkspaceChannel.WORKSPACE_CHANNEL,win,saveParams);
      }
    },
    { role: 'close' }
    ]
  };

  const editMenu : MenuItemConstructorOptions = {
    label: 'Edit',
    submenu: [{
      label: 'Find',
      accelerator: 'CommandOrControl+F',
      click: (item,win,key) => {
        // console.log("find");
        if (!win){
          return;
        }
        const findParams : WorkspaceWinApi<"findInWorkspace"> = { method: "findInWorkspace", params: [{}]};
        IpcSender.send(WorkspaceChannel.WORKSPACE_CHANNEL,win,findParams);
      },
    }]
  };

  const viewMenu : MenuItemConstructorOptions = {
    label: 'View',
    submenu: [
      { role: 'togglefullscreen' },
      { role: 'toggleDevTools' }
    ]
  }
  
  const winMenu: MenuItemConstructorOptions = isMac ? {
    label: 'Window',
    submenu: [
      { role: 'minimize' },
      { type: 'separator' },
      { role: 'front' },
      { type: 'separator' },
      { role: 'window' }
    ]
  } : {
    label: 'Window',
    submenu: [
      { role: 'minimize' },
      { role: 'close' }
    ]
  }

  const template: MenuItemConstructorOptions[] = [];
  if (appMenu)
    template.push(appMenu);
  template.push(fileMenu,editMenu,viewMenu,winMenu);
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}