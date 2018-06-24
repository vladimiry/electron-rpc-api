import {IpcMain, IpcRenderer} from "electron";
import {Model, Service} from "pubsub-to-stream-api";

import {AnyType, CombinedEventEmitter} from "./model";

export class IpcMainApiService<Api extends Model.ActionsRecord<Extract<keyof Api, string>>> extends Service<Api> {

    public registerApi(actions: Api, {ipcMain: instance}: { ipcMain?: IpcMain } = {}) {
        const ipcMain = instance || require("electron").ipcMain;
        const em: CombinedEventEmitter = {
            on: ipcMain.addListener.bind(ipcMain),
            off: ipcMain.removeListener.bind(ipcMain),
            emit: ipcMain.emit.bind(ipcMain),
        };
        const requestResolver: Model.RequestResolver = ({sender}, payload) => ({payload, emitter: {emit: sender.send.bind(sender)}});

        return this.register(actions, em, {requestResolver});
    }

    public buildClient({ipcRenderer: instance, options}: { ipcRenderer?: IpcRenderer, options?: Model.CallOptions } = {}) {
        const ipcRenderer = instance || require("electron").ipcRenderer;
        const em: CombinedEventEmitter = {
            on: (event, listener) => {
                ipcRenderer.on(event, (...args: AnyType[]) => listener(args[1]));
                return em;
            },
            off: ipcRenderer.removeListener.bind(ipcRenderer),
            emit: ipcRenderer.send.bind(ipcRenderer),
        };

        return this.caller({emitter: em, listener: em}, options);
    }

}
