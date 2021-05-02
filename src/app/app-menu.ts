import { App, Menu, MenuItemConstructorOptions, Shell } from "electron";
import { IpcSender } from "../ipc/IpcSender";
import { WorkspaceWinApi } from "../ipc/WorkspaceApi";
import { WorkspaceChannel } from "../ipc/WorkspaceChannel";

export function createMenu(app: App, shell: Shell) {
  const isMac = process.platform === 'darwin'

  const appMenu : MenuItemConstructorOptions | null = isMac ? { role: 'appMenu' } : null;
  
  const fileMenu : MenuItemConstructorOptions = {
    label: 'Файл',
    submenu: [{
      label: 'Сохранить',
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
    { label: 'Закрыть', role: 'close' }
    ]
  };

  const editMenu : MenuItemConstructorOptions = {
    label: 'Редактирование',
    submenu: [{
      label: 'Найти',
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
    label: 'Вид',
    submenu: [
      { label : "Полноэкранный Режим",role: 'togglefullscreen' },
      { role: 'toggleDevTools' }
    ]
  }
  
  const winMenu: MenuItemConstructorOptions = isMac ? {
    label: 'Окно',
    submenu: [
      { label : "Свернуть", role: 'minimize' },
      { type: 'separator' },
      { label : "На передний план", role: 'front' },
      { type: 'separator' },
      { label : "Окно", role: 'window' }
    ]
  } : {
    label: 'Окно',
    submenu: [
      { label : "Свернуть", role: 'minimize' },
      { label : "Закрыть", role: 'close' }
    ]
  }

  const template: MenuItemConstructorOptions[] = [];
  if (appMenu)
    template.push(appMenu);
  template.push(fileMenu,editMenu,viewMenu,winMenu);
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}