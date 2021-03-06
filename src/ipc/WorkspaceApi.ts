import { Prisma, Workspace } from '@prisma/client';
import { IpcMainInvokeEvent } from 'electron';
import { ClassMethods, MethodArgumentTypes, RemoteApi } from './RemoteApi';

export interface WorkspaceApi<T extends ClassMethods<WorkspaceApi_>> extends RemoteApi{
    method : T,
    params : MethodArgumentTypes<WorkspaceApi_[T]>,
};
export type WorkspaceApiReturn<T extends keyof WorkspaceApi_> = Prisma.PromiseReturnType<WorkspaceApi_[T]>

export interface WorkspaceApi_ {

    closeWorkspace(params : {ev ?: IpcMainInvokeEvent}) : any;
    getWorkspace(params : {ev ?: IpcMainInvokeEvent}): Promise<Workspace | null>;
    createWorkspace(params : {ev ?: IpcMainInvokeEvent,wpID : string}): any;
    
    //unused method for type resolving in channels
    noArgs(params?: any): any;
}

export interface WorkspaceWinApi<T extends ClassMethods<WorkspaceWinApi_>> extends RemoteApi{
    method : T,
    params : MethodArgumentTypes<WorkspaceWinApi_[T]>,
};
//export type WorkspaceApiReturn<T extends keyof WorkspaceApi_> = ReturnType<WorkspaceWinApi_[T]>



export interface WorkspaceWinApi_{
    saveWorkspace(params?: any) : void;
    closeWorkspace(params?: any) : void;
    findInWorkspace(params?: any) : void;
    updateWorkspace(params?: any) : void;
}