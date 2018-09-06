import {ApiMethod, ApiMethodNoArgument, IpcMainApiService} from "electron-rpc-api";

export interface IpcMainApi {
    ping: ApiMethod<{ domain: string, times: number }, { domain: string, value: number }>;
    quitApp: ApiMethodNoArgument<null>;
}

export const IPC_MAIN_API_SERVICE = new IpcMainApiService<IpcMainApi>({channel: "some-ipcMain-channel"});
