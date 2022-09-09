import {IpcMessageEvent, IpcRenderer} from "electron";
import * as Lib from "pubsub-to-rpc-api";
import UUID from "pure-uuid";

import {curryOwnFunctionMembers} from "./private/util";
import * as PM from "./private/model";
import {requireIpcRenderer} from "./private/electron-require";

// TODO infer as PM.Arguments<(PM.Arguments<Electron.WebviewTag["on"]>)[1]> (listener is currently defined by Electron as a raw function)
type ACA2 = [IpcMessageEvent, ...PM.Any[]]; // used by "pubsub-to-rpc-api" like Lib.Model.ActionContext<ACA2>

type RegisterApiIpcRenderer = Pick<IpcRenderer, "on" | "removeListener" | "sendToHost">;

const ipcRendererEventEmittersCache = new WeakMap<RegisterApiIpcRenderer, Lib.Model.CombinedEventEmitter>();
const webViewTagEventEmittersCache = new WeakMap<Electron.WebviewTag, Lib.Model.CombinedEventEmitter>();

const clientIpcMessageEventName = "ipc-message";
const clientIpcMessageListenerBundleProp = Symbol(`[${PM.MODULE_NAME}] clientIpcMessageListenerBundleProp symbol`);

export function createWebViewApiService<AD extends Lib.Model.ApiDefinition<AD>>(
    createServiceArg: Lib.Model.CreateServiceInput<AD>,
): {
    register: (
        actions: PM.Arguments<Lib.Model.CreateServiceReturn<AD, ACA2>["register"]>[0],
        options?: Lib.Model.CreateServiceRegisterOptions<AD, ACA2> & { ipcRenderer?: RegisterApiIpcRenderer; },
    ) => ReturnType<Lib.Model.CreateServiceReturn<AD, ACA2>["register"]>;
    client: (
        webView: Electron.WebviewTag,
        params?: { options?: Partial<Lib.Model.CallOptions<AD, ACA2>> },
    ) => ReturnType<Lib.Model.CreateServiceReturn<AD, ACA2>["caller"]>;
} {
    const baseService = Lib.createService<AD, ACA2>(createServiceArg);
    const clientIpcMessageOnEventResolver: Lib.Model.ClientOnEventResolver<AD, ACA2> = (ipcMessageEvent) => {
        const [payload] = ipcMessageEvent.args;
        return {payload};
    };

    return {
        register(
            actions,
            {
                logger,
                ipcRenderer = requireIpcRenderer(),
            }: Lib.Model.CreateServiceRegisterOptions<AD, ACA2> & { ipcRenderer?: RegisterApiIpcRenderer; } = {},
        ) {
            const cachedEm: Lib.Model.CombinedEventEmitter = (
                ipcRendererEventEmittersCache.get(ipcRenderer)
                ||
                (() => {
                    const em: Lib.Model.CombinedEventEmitter = {
                        on: ipcRenderer.on.bind(ipcRenderer),
                        removeListener: ipcRenderer.removeListener.bind(ipcRenderer),
                        emit: ipcRenderer.sendToHost.bind(ipcRenderer),
                    };

                    ipcRendererEventEmittersCache.set(ipcRenderer, em);

                    return em;
                })()
            );

            return baseService.register(
                actions,
                cachedEm,
                {
                    logger,
                    onEventResolver: (...[/* event */, payload]) => {
                        return {
                            payload,
                            emitter: cachedEm,
                        };
                    },
                },
            );
        },
        client(
            webView,
            {
                options: {
                    timeoutMs = PM.BASE_TIMEOUT_MS,
                    logger: _logger_ = createServiceArg.logger || PM.LOG_STUB, // tslint:disable-line:variable-name
                    ...callOptions
                } = {},
            }: {
                options?: Partial<Lib.Model.CallOptions<AD, ACA2>>;
            } = {},
        ) {
            const logger = curryOwnFunctionMembers(_logger_, `[${PM.MODULE_NAME}]`, "createWebViewApiService() [client]");
            const cachedEm: Lib.Model.CombinedEventEmitter = (
                webViewTagEventEmittersCache.get(webView)
                ||
                (() => {
                    type IpcMessageListenerBundleProp = Readonly<{
                        uid: string;
                        created: Date;
                        originalEventName: PM.Arguments<Lib.Model.CombinedEventEmitter["on"]>[0];
                        actualListener: [
                            typeof clientIpcMessageEventName,
                            (...args: PM.Arguments<typeof clientIpcMessageOnEventResolver>) => void];
                    }>;

                    interface IpcMessageListenerBundlePropAware {
                        [clientIpcMessageListenerBundleProp]?: IpcMessageListenerBundleProp;
                    }

                    const em: Lib.Model.CombinedEventEmitter = {
                        on: (originalEventName, originalListener) => {
                            const ipcMessageListenerBundle: IpcMessageListenerBundleProp = {
                                uid: new UUID(4).format(),
                                created: new Date(),
                                originalEventName,
                                actualListener: [
                                    clientIpcMessageEventName,
                                    (ipcMessageEvent) => {
                                        if (ipcMessageEvent.channel !== originalEventName) {
                                            return;
                                        }
                                        originalListener(clientIpcMessageOnEventResolver(ipcMessageEvent).payload);
                                    },
                                ],
                            };

                            webView.addEventListener(...ipcMessageListenerBundle.actualListener);

                            // TODO consider keeping actual listeners in a WeakMap<typeof originalListener, IpcMessageListenerBundleProp>
                            // link actual listener to the original listener, so we then could remove the actual listener
                            // we know that "listener" function is not locked for writing props as it's constructed by "pubsub-to-rpc-api"
                            (originalListener as IpcMessageListenerBundlePropAware)[clientIpcMessageListenerBundleProp]
                                = ipcMessageListenerBundle;

                            logger.debug(
                                `[cache] add event listener`,
                                JSON.stringify({
                                    originalEventName,
                                    uid: ipcMessageListenerBundle.uid,
                                    created: ipcMessageListenerBundle.created,
                                }),
                            );

                            return em;
                        },
                        removeListener: (...[originalEventName, originalListener]) => {
                            const ipcMessageListenerBundlePropAware = originalListener as IpcMessageListenerBundlePropAware;
                            const ipcMessageListenerBundle = ipcMessageListenerBundlePropAware[clientIpcMessageListenerBundleProp];

                            if (
                                !ipcMessageListenerBundle
                                ||
                                ipcMessageListenerBundle.originalEventName !== originalEventName
                            ) {
                                return em;
                            }

                            const logData = JSON.stringify({
                                originalEventName,
                                uid: ipcMessageListenerBundle.uid,
                                created: ipcMessageListenerBundle.created,
                            });

                            if (webView.isConnected) {
                                webView.removeEventListener(...ipcMessageListenerBundle.actualListener);
                                logger.debug(`[cache] remove event listener`, logData);
                            } else {
                                logger.debug(`[cache] remove event listener: skipped since "webView" is not attached to the DOM`, logData);
                            }

                            delete ipcMessageListenerBundlePropAware[clientIpcMessageListenerBundleProp];

                            return em;
                        },
                        emit: (...args) => {
                            if (webView.isConnected) {
                                // tslint:disable-next-line:no-floating-promises
                                webView.send(...args);
                            } else {
                                logger.debug(`"webView.send()" call skipped since "webView" is not attached to the DOM`);
                            }
                        },
                    };

                    webViewTagEventEmittersCache.set(webView, em);

                    return em;
                })()
            );

            return baseService.caller(
                {emitter: cachedEm, listener: cachedEm},
                {
                    ...callOptions,
                    timeoutMs,
                },
            );
        },
    };
}
