import {IpcMain, IpcMainEvent, IpcRenderer} from "electron";
import * as Lib from "pubsub-to-rpc-api";

import {curryOwnFunctionMembers} from "./private/util";
import * as PM from "./private/model";
import {requireIpcMain, requireIpcRenderer} from "./private/electron-require";

// TODO infer from Electron.IpcMain["on"] listener arguments
type DefACA = [IpcMainEvent, ...PM.Any[]];

type IpcMainEventEmittersCache = Pick<IpcMain, "on" | "removeListener" | "emit">;
type IpcRendererEventEmittersCache = Pick<IpcRenderer, "on" | "removeListener" | "send">;

const ipcMainEventEmittersCache = new WeakMap<IpcMainEventEmittersCache, Lib.Model.CombinedEventEmitter>();
const ipcRendererEventEmittersCache = new WeakMap<IpcRendererEventEmittersCache, Lib.Model.CombinedEventEmitter>();

export function createIpcMainApiService<AD extends Lib.Model.ApiDefinition<AD>, ACA2 extends DefACA = DefACA>(
    createServiceArg: Lib.Model.CreateServiceInput<AD>,
): {
    register: (
        actions: PM.Arguments<Lib.Model.CreateServiceReturn<AD, ACA2>["register"]>[0],
        options?: {
            ipcMain?: IpcMainEventEmittersCache;
            logger?: Lib.Model.Logger;
        },
    ) => ReturnType<Lib.Model.CreateServiceReturn<AD, ACA2>["register"]>;
    client: (
        clientOptions?: {
            ipcRenderer?: IpcRendererEventEmittersCache;
            options?: PM.Omit<Partial<Lib.Model.CallOptions<AD, ACA2>>, "onEventResolver">;
        },
    ) => ReturnType<Lib.Model.CreateServiceReturn<AD, ACA2>["caller"]>;
} {
    const baseService = Lib.createService<AD, ACA2>(createServiceArg);

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

            return baseService.register(
                actions,
                cachedEm,
                {
                    onEventResolver: (...[event, payload]) => {
                        return {
                            payload,
                            emitter: {
                                emit: (...args) => {
                                    if (!event.sender.isDestroyed()) {
                                        event.reply(...args);
                                        return;
                                    }
                                    if (logger) {
                                        logger.debug(`[${PM.MODULE_NAME}]`, `Object has been destroyed: "sender"`);
                                    }
                                },
                            },
                        };
                    },
                    logger,
                },
            );
        },
        client(
            {
                ipcRenderer = requireIpcRenderer(),
                options: {
                    timeoutMs = PM.BASE_TIMEOUT_MS,
                    logger: _logger_ = createServiceArg.logger || PM.LOG_STUB, // tslint:disable-line:variable-name
                    ...callOptions
                } = {},
            }: {
                ipcRenderer?: IpcRendererEventEmittersCache;
                options?: PM.Omit<Partial<Lib.Model.CallOptions<AD, ACA2>>, "onEventResolver">;
            } = {},
        ) {
            const logger = curryOwnFunctionMembers(_logger_, `[${PM.MODULE_NAME}]`, "createIpcMainApiService() [client]");
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
                {
                    emitter: cachedEm,
                    listener: cachedEm,
                },
                {
                    ...callOptions,
                    timeoutMs,
                    logger,
                    onEventResolver: (...[/* event */, payload]) => {
                        return {payload};
                    },
                },
            );
        },
    };
}
