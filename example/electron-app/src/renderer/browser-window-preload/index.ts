import {contextBridge} from "electron";

import {ElectronWindow} from "src/shared/model";
import {IPC_MAIN_API_SERVICE} from "src/shared/ipc-main-api-definition";

const electronWindow: ElectronWindow = {
    __ELECTRON_EXPOSURE__: {
        buildIpcMainClient: IPC_MAIN_API_SERVICE.client.bind(IPC_MAIN_API_SERVICE),
    },
};

const exposeKey: keyof typeof electronWindow = "__ELECTRON_EXPOSURE__";

contextBridge.exposeInMainWorld(exposeKey, electronWindow[exposeKey]);
