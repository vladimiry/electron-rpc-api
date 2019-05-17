import * as Lib from "pubsub-to-rpc-api";
import {IpcMain, IpcMessageEvent, IpcRenderer} from "electron";

import * as PM from "./private/model";
import {requireIpcMain, requireIpcRenderer} from "./private/electron-require";

// TODO infer from Electron.IpcMain["on"] listener arguments
type ACA = [IpcMessageEvent, ...PM.Any[]];

type IpcMainEventEmittersCache = Pick<IpcMain, "on" | "removeListener" | "emit">;
type IpcRendererEventEmittersCache = Pick<IpcRenderer, "on" | "removeListener" | "send">;

const ipcMainEventEmittersCache = new WeakMap<IpcMainEventEmittersCache, Lib.Model.CombinedEventEmitter>();
const ipcRendererEventEmittersCache = new WeakMap<IpcRendererEventEmittersCache, Lib.Model.CombinedEventEmitter>();

export const createIpcMainApiService: <AD extends Lib.Model.ApiDefinition<AD>>(
    input: Lib.Model.CreateServiceInput<AD>,
) => {
    register: (
        actions: PM.Arguments<Lib.Model.CreateServiceReturn<AD, ACA>["register"]>[0],
        options?: {
            ipcMain?: IpcMainEventEmittersCache;
            logger?: Lib.Model.Logger;
        },
    ) => ReturnType<Lib.Model.CreateServiceReturn<AD, ACA>["register"]>;
    client: (
        arg?: {
            ipcRenderer?: IpcRendererEventEmittersCache;
            options?: Lib.Model.CallOptions;
        },
    ) => ReturnType<Lib.Model.CreateServiceReturn<AD, ACA>["caller"]>;
} = (...createServiceArgs) => {
    const baseService: Readonly<ReturnType<typeof Lib.createService>>
        = Lib.createService<(typeof createServiceArgs[0])["apiDefinition"], ACA>(...createServiceArgs);

    const clientOnEventResolver: Lib.Model.ClientOnEventResolver = (...[/* event */, payload]) => {
        return {payload};
    };

    return {
        register(actions, options) {
            const {
                ipcMain = requireIpcMain(),
                logger,
            } = options || {} as Exclude<typeof options, undefined>;
            const cachedEm: Lib.Model.CombinedEventEmitter = (
                ipcMainEventEmittersCache.get(ipcMain)
                ||
                (() => {
                    const em: typeof cachedEm = {
                        on: ipcMain.on.bind(ipcMain),
                        removeListener: ipcMain.removeListener.bind(ipcMain),
                        emit: ipcMain.emit.bind(ipcMain),
                    };

                    ipcMainEventEmittersCache.set(ipcMain, em);

                    return em;
                })()
            );
            const onEventResolver: Lib.Model.ProviderOnEventResolver<[IpcMessageEvent, ...PM.Any[]]> = ({sender}, payload) => {
                return {
                    payload,
                    emitter: {
                        emit: (...args) => {
                            if (!sender.isDestroyed()) {
                                return sender.send(...args);
                            }
                            if (logger) {
                                logger.warn(`[${PM.MODULE_NAME}]`, `Object has been destroyed: "sender"`);
                            }
                        },
                    },
                };
            };

            return baseService.register(
                actions as PM.Any, // TODO get rid of typecasting
                cachedEm,
                {
                    onEventResolver,
                    logger,
                },
            );
        },
        client(arg) {
            const {
                ipcRenderer = requireIpcRenderer(),
                options = {timeoutMs: PM.ONE_SECOND_MS * 3},
            } = arg || {} as Exclude<typeof arg, undefined>;
            const cachedEm: Lib.Model.CombinedEventEmitter = (
                ipcRendererEventEmittersCache.get(ipcRenderer)
                ||
                (() => {
                    const em: typeof cachedEm = {
                        on: ipcRenderer.on.bind(ipcRenderer),
                        removeListener: ipcRenderer.removeListener.bind(ipcRenderer),
                        emit: ipcRenderer.send.bind(ipcRenderer),
                    };

                    ipcRendererEventEmittersCache.set(ipcRenderer, em);

                    return em;
                })()
            );

            return baseService.caller(
                {emitter: cachedEm, listener: cachedEm},
                {onEventResolver: clientOnEventResolver, ...options},
            );
        },
    };
};
