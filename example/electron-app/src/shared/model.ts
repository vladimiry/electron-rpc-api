export interface ElectronWindow {
    readonly __ELECTRON_EXPOSURE__: {
        readonly buildIpcMainClient: (typeof import("./ipc-main-api-definition").IPC_MAIN_API_SERVICE)["client"];
    };
}
