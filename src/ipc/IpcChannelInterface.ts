import {IpcMainInvokeEvent} from 'electron';

export interface IpcChannelInterface {
  getName(): string;

  handle(event: IpcMainInvokeEvent, request: any): Promise<any>;
}