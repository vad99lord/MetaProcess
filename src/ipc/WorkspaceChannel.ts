import {IpcChannelInterface} from "./IpcChannelInterface";
import {BrowserWindow, IpcMainInvokeEvent} from 'electron';
import { QueryRequest } from "./QueryRequest";
import { ClassMethods, MethodArgumentTypes } from "./RemoteApi";
import { WorkspaceApi, WorkspaceApi_, WorkspaceWinApi, WorkspaceWinApi_ } from "./WorkspaceApi";
import * as _ from "lodash";
import { Workspace } from "../app/main";

export class WorkspaceChannel implements IpcChannelInterface {
  public static readonly WORKSPACE_CHANNEL = 'WORKSPACE_CHANNEL'
  getName(): string {
    return WorkspaceChannel.WORKSPACE_CHANNEL;
  }
  private wp : Workspace;
  constructor (wp : Workspace){
      this.wp = wp;
  }
  
  public async handle(event: IpcMainInvokeEvent, request: QueryRequest): Promise<any> {
    let userReq = request as WorkspaceApi<ClassMethods<WorkspaceApi_>>;
    const userReqParams = _.merge(userReq.params[0],{ev : event});
    const response = this.wp[userReq.method](userReqParams);
    return response;
  }
}