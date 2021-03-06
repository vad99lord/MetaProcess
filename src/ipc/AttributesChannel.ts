import { IpcMainInvokeEvent } from 'electron';
import { AttributeApi, AttributeApi_ } from "./AttributesApi";
import { IpcChannelInterface } from "./IpcChannelInterface";
import { QueryRequest } from "./QueryRequest";
import { ClassMethods } from "./RemoteApi";

export class AttributeChannel implements IpcChannelInterface {
  public static readonly ATTRIBUTE_CHANNEL = 'ATTRIBUTE_CHANNEL'
  getName(): string {
    return AttributeChannel.ATTRIBUTE_CHANNEL;
  }

  async handle(event: IpcMainInvokeEvent, request: QueryRequest): Promise<any> {
    const userReq = request as AttributeApi<ClassMethods<AttributeApi_>>;
    const response = AttributeApi_.prototype[userReq.method](userReq.params[0]);
    return response;
  }
}