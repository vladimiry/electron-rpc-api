import os from "os";
import path from "path";
import url from "url";
import {app} from "electron";

import {AppContext} from "./model";
import {IpcMainApi} from "src/shared/ipc-main-api-definition";
import {init as initBrowserWindow} from "./window";
import {init as initTray} from "./tray";
import {register as registerApi} from "./ipc-main-api";

const development = process.env.NODE_ENV === "development";

initApp(
    initContext(),
    registerApi(),
);

async function initApp(ctx: AppContext, api: IpcMainApi) {
    if (development) {
        app.on("web-contents-created", (webContentsCreatedEvent, contents) => {
            contents.openDevTools();
        });
    }

    app.on("ready", async () => {
        const uiContext = ctx.uiContext = {
            browserWindow: initBrowserWindow(ctx),
            tray: await initTray(ctx, api),
        };

        app.on("activate", () => {
            if (!uiContext.browserWindow || uiContext.browserWindow.isDestroyed()) {
                uiContext.browserWindow = initBrowserWindow(ctx);
            }
        });
    });
}

function initContext(): AppContext {
    const appRoot = path.join(__dirname, "./../../../app");
    const appRelative = (value: string = "") => path.join(appRoot, value);
    const formatFileUrl = (pathname: string) => url.format({pathname, protocol: "file:", slashes: true});
    const browserWindowIcon = "./assets/icons/icon.png";
    const browserWindowPage = development
        ? "http://localhost:8080/renderer/browser-window/index.html"
        : formatFileUrl(appRelative("./generated/renderer/browser-window/index.html"));
    const trayIcon = appRelative(os.platform() === "darwin" ? "./assets/icons/mac/icon.png" : browserWindowIcon);

    return {
        locations: {
            app: appRelative(),
            browserWindowIcon: appRelative(browserWindowIcon),
            browserWindowPage,
            trayIcon,
            renderer: {
                browserWindow: appRelative("./generated/renderer/browser-window/index.js"),
            },
        },
    };
}
