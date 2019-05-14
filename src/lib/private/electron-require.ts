import {IpcMain, IpcRenderer} from "electron";

export function requireIpcMain(): IpcMain {
    return require("electron").ipcMain;
}

export function requireIpcRenderer(): IpcRenderer {
    return require("electron").ipcRenderer;
}
