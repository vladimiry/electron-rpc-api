import * as Lib from "pubsub-to-rpc-api";
import uuid from "uuid-browser";
import {IpcMessageEvent, IpcRenderer, WebviewTag} from "electron";

import * as PM from "./private/model";
import {curryOwnFunctionMembers} from "./private/util";
import {requireIpcRenderer} from "./private/electron-require";

type RegisterApiIpcRenderer = Pick<IpcRenderer, "on" | "removeListener" | "sendToHost">;

const ipcRendererEventEmittersCache = new WeakMap<RegisterApiIpcRenderer, Lib.Model.CombinedEventEmitter>();
const webViewTagEventEmittersCache = new WeakMap<WebviewTag, Lib.Model.CombinedEventEmitter>();

const clientIpcMessageEventName = "ipc-message";
const clientIpcMessageListenerBundleProp = Symbol(`[${PM.MODULE_NAME}] clientIpcMessageListenerBundleProp symbol`);
const clientIpcMessageOnEventResolver: Lib.Model.ClientOnEventResolver<[IpcMessageEvent]> = ({args: [payload]}) => {
    // first argument of the IpcMessageEvent.args is the needed payload
    return {payload};
};

export const createWebViewApiService: <AD extends Lib.Model.ApiDefinition<AD>>(
    createServiceInput: Lib.Model.CreateServiceInput<AD>,
) => {
    register: (
        actions: PM.Arguments<Lib.Model.CreateServiceReturn<AD>["register"]>[0],
        options?: {
            ipcRenderer?: RegisterApiIpcRenderer;
            logger?: Lib.Model.Logger;
        },
    ) => ReturnType<Lib.Model.CreateServiceReturn<AD>["register"]>;
    client: (
        webView: WebviewTag,
        arg?: { options?: Lib.Model.CallOptions },
    ) => ReturnType<Lib.Model.CreateServiceReturn<AD>["caller"]>;
} = (createServiceInput) => {
    const clientLogger = createServiceInput.logger
        ? curryOwnFunctionMembers(createServiceInput.logger, `[${PM.MODULE_NAME}]`, "createWebViewApiService()", "client()")
        : PM.LOG_STUB;
    const baseService: Readonly<ReturnType<typeof Lib.createService>> = Lib.createService(createServiceInput);

    return {
        register(actions, options) {
            const {
                ipcRenderer = requireIpcRenderer(),
                logger,
            } = options || {} as Exclude<typeof options, undefined>;
            const cachedEm: Lib.Model.CombinedEventEmitter = (
                ipcRendererEventEmittersCache.get(ipcRenderer)
                ||
                (() => {
                    const em: typeof cachedEm = {
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
        client(webView, params) {
            const {options} = params || {} as Exclude<typeof params, undefined>;
            const cachedEm: Lib.Model.CombinedEventEmitter = (
                webViewTagEventEmittersCache.get(webView)
                ||
                (() => {
                    type IpcMessageListener = (ipcMessageEvent: IpcMessageEvent) => void;

                    type IpcMessageListenerBundleProp = Readonly<{
                        uid: ReturnType<typeof uuid.v4>;
                        created: Date;
                        originalEventName: PM.Arguments<Lib.Model.CombinedEventEmitter["on"]>[0];
                        actual: [typeof clientIpcMessageEventName, IpcMessageListener];
                    }>;

                    interface IpcMessageListenerBundlePropAware {
                        [clientIpcMessageListenerBundleProp]?: IpcMessageListenerBundleProp;
                    }

                    const em: typeof cachedEm = {
                        on: (originalEventName, originalListener) => {
                            const ipcMessageListenerBundle: IpcMessageListenerBundleProp = {
                                uid: uuid.v4(),
                                created: new Date(),
                                originalEventName,
                                actual: [
                                    clientIpcMessageEventName,
                                    (ipcMessageEvent) => {
                                        if (ipcMessageEvent.channel !== originalEventName) {
                                            return;
                                        }
                                        originalListener(clientIpcMessageOnEventResolver(ipcMessageEvent).payload);
                                    },
                                ],
                            };

                            webView.addEventListener(...ipcMessageListenerBundle.actual);

                            // TODO consider keeping actual listeners in a WeakMap<typeof originalListener, IpcMessageListenerBundleProp>
                            // link actual listener to the original listener, so we then could remove the actual listener
                            // we know that "listener" function is not locked for writing props as it's constructed by "pubsub-to-rpc-api"
                            (originalListener as IpcMessageListenerBundlePropAware)[clientIpcMessageListenerBundleProp]
                                = ipcMessageListenerBundle;

                            clientLogger.debug(`em: addEventListener(), uid=${ipcMessageListenerBundle.uid}`);

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

                            if (webView.isConnected) {
                                webView.removeEventListener(...ipcMessageListenerBundle.actual);
                            } else {
                                clientLogger.warn(`em: skip "webView.removeEventListener()" since "webView" is not attached to the DOM`);
                            }

                            delete ipcMessageListenerBundlePropAware[clientIpcMessageListenerBundleProp];

                            const {uid, created} = ipcMessageListenerBundle;
                            clientLogger.debug(`em: removeEventListener(), uid=${uid}, created=${created}`);

                            return em;
                        },
                        emit: (...args) => {
                            if (webView.isConnected) {
                                webView.send(...args);
                            } else {
                                clientLogger.warn(`em: skip "webView.send()" since "webView" is not attached to the DOM`);
                            }
                        },
                    };

                    webViewTagEventEmittersCache.set(webView, em);

                    return em;
                })()
            );

            return baseService.caller(
                {emitter: cachedEm, listener: cachedEm},
                options,
            );
        },
    };
};
