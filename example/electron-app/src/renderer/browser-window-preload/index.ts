import {contextBridge} from "electron";

import {ElectronWindow} from "src/shared/model";
import {IPC_MAIN_API_SERVICE} from "src/shared/ipc-main-api-definition";

export const __ELECTRON_EXPOSURE__: ElectronWindow["__ELECTRON_EXPOSURE__"] = {
    buildIpcMainClient: IPC_MAIN_API_SERVICE.client.bind(IPC_MAIN_API_SERVICE),
};

contextBridge.exposeInMainWorld("__ELECTRON_EXPOSURE__", __ELECTRON_EXPOSURE__);
