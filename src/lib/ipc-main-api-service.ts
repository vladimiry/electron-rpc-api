import {IpcMain, IpcMessageEvent, IpcRenderer} from "electron";
import {Model, Service} from "pubsub-to-stream-api";

import {AnyType} from "./model";

type RegisterApiIpcMain = Pick<IpcMain, "addListener" | "removeListener" | "emit">;
type BuildClientIpcRenderer = Pick<IpcRenderer, "on" | "removeListener" | "send">;

const registerApiEventEmitters = new WeakMap<RegisterApiIpcMain, Model.CombinedEventEmitter>();
const buildClientEventEmitters = new WeakMap<BuildClientIpcRenderer, Model.CombinedEventEmitter>();

export class IpcMainApiService<Api extends Model.ActionsRecord<Extract<keyof Api, string>>> extends Service<Api> {
    public static resolveActionContext(ctx: IpcMainApiActionContext): IpcMainApiActionContext[typeof Model.ACTION_CONTEXT_SYMBOL] {
        return ctx[Model.ACTION_CONTEXT_SYMBOL];
    }

    public registerApi(
        actions: Api,
        {
            ipcMain = require("electron").ipcMain,
            logger,
        }: {
            ipcMain?: RegisterApiIpcMain;
            logger?: Model.Logger;
        } = {},
    ) {
        let em = registerApiEventEmitters.get(ipcMain);

        if (!em) {
            em = {
                on: ipcMain.addListener.bind(ipcMain) as AnyType,
                off: ipcMain.removeListener.bind(ipcMain) as AnyType,
                emit: ipcMain.emit.bind(ipcMain),
            };
            registerApiEventEmitters.set(ipcMain, em);
        }

        const requestResolver: Model.RequestResolver = ({sender}, payload) => ({
            payload,
            emitter: {
                emit: (...args) => {
                    if (!sender.isDestroyed()) {
                        return sender.send.apply(sender, args);
                    }

                    const {name, type, uid}: Partial<Pick<Model.RequestPayload<string>, "name" | "type" | "uid">>
                        = typeof payload === "object"
                        ? payload
                        : {};
                    const message = [
                        `[electron-rpc-api] `,
                        `Object has been destroyed: "sender". Request payload info: ${JSON.stringify({name, type, uid})}`,
                    ].join();

                    if (logger) {
                        logger.error(message);
                    } else {
                        // tslint:disable-next-line no-console
                        (console.error || console.log)(message);
                    }
                },
            },
        });

        return this.register(actions, em, {requestResolver, logger});
    }

    public buildClient(
        {
            ipcRenderer = require("electron").ipcRenderer,
            options,
        }: {
            ipcRenderer?: BuildClientIpcRenderer;
            options?: Model.CallOptions;
        } = {},
    ) {
        let em: Model.CombinedEventEmitter | undefined = buildClientEventEmitters.get(ipcRenderer);

        if (!em) {
            const newEm: Model.CombinedEventEmitter = {
                on: (event, listener) => {
                    ipcRenderer.on(event, (...args: AnyType[]) => listener(args[1]));
                    return newEm;
                },
                off: ipcRenderer.removeListener.bind(ipcRenderer) as AnyType,
                emit: ipcRenderer.send.bind(ipcRenderer) as AnyType,
            };
            buildClientEventEmitters.set(ipcRenderer, newEm);
            em = newEm;
        }

        return this.caller({emitter: em, listener: em}, options);
    }
}

export type IpcMainApiActionContext = Model.ActionContext<[IpcMessageEvent]>;
