import {IpcChannelInterface} from "./IpcChannelInterface";
import {IpcMainInvokeEvent} from 'electron';
import { QueryRequest } from "./QueryRequest";
import { ClassMethods, MethodArgumentTypes } from "./RemoteApi";
import { FileApi, FileApi_ } from "./FilesApi";

export class FileChannel implements IpcChannelInterface {
  public static readonly FILE_CHANNEL = 'FILE_CHANNEL'
  getName(): string {
    return FileChannel.FILE_CHANNEL;
  }

  async handle(event: IpcMainInvokeEvent, request: QueryRequest): Promise<any> {
    const userReq = request as FileApi<ClassMethods<FileApi_>>;
    const response = FileApi_.prototype[userReq.method](userReq.params[0]);
    return response;
  }
}