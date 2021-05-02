import { IpcMainInvokeEvent } from 'electron';
import { IpcChannelInterface } from "./IpcChannelInterface";
import { QueryRequest } from "./QueryRequest";
import { ClassMethods } from "./RemoteApi";
import { VertexApi, VertexApi_ } from "./VerticesApi";

export class QueryChannel implements IpcChannelInterface {
  public static readonly QEURY_CHANNEL = 'QUERY_CHANNEL'
  getName(): string {
    return QueryChannel.QEURY_CHANNEL;
  }

  async handle(event: IpcMainInvokeEvent, request: QueryRequest): Promise<any> {
    const userReq = request as VertexApi<ClassMethods<VertexApi_>>;
    const response = VertexApi_.prototype[userReq.method](userReq.params[0]);
    return response;
  }
}