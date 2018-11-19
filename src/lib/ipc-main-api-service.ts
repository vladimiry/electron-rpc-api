import {IpcMain, IpcMessageEvent, IpcRenderer} from "electron";
import {Model, Service} from "pubsub-to-stream-api";

import {AnyType} from "./model";

export class IpcMainApiService<Api extends Model.ActionsRecord<Extract<keyof Api, string>>> extends Service<Api> {
    public static resolveActionContext(ctx: IpcMainApiActionContext): IpcMainApiActionContext[typeof Model.ACTION_CONTEXT_SYMBOL] {
        return ctx[Model.ACTION_CONTEXT_SYMBOL];
    }

    public registerApi(
        actions: Api,
        {ipcMain: instance, logger}: { ipcMain?: Pick<IpcMain, "addListener" | "removeListener" | "emit">; logger?: Model.Logger } = {},
    ) {
        const ipcMain = instance || require("electron").ipcMain;
        const em: Model.CombinedEventEmitter = {
            on: ipcMain.addListener.bind(ipcMain),
            off: ipcMain.removeListener.bind(ipcMain),
            emit: ipcMain.emit.bind(ipcMain),
        };
        const requestResolver: Model.RequestResolver = ({sender}, payload) => ({payload, emitter: {emit: sender.send.bind(sender)}});

        return this.register(actions, em, {requestResolver, logger});
    }

    public buildClient(
        {
            ipcRenderer: instance,
            options,
        }: {
            ipcRenderer?: Pick<IpcRenderer, "on" | "removeListener" | "send">;
            options?: Model.CallOptions;
        } = {},
    ) {
        const ipcRenderer = instance || require("electron").ipcRenderer;
        const em: Model.CombinedEventEmitter = {
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

export type IpcMainApiActionContext = Model.ActionContext<[IpcMessageEvent]>;
