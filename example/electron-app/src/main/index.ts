import os from "os";
import path from "path";
import url from "url";
import {app} from "electron";

import {AppContext} from "./model";
import {ScannedIpcMainApiService} from "src/shared/ipc-main-api-definition";
import {init as initBrowserWindow} from "./window";
import {init as initTray} from "./tray";
import {register as registerApi} from "./ipc-main-api";

const development = process.env.NODE_ENV === "development";

// tslint:disable-next-line:no-floating-promises
(async () => {
    await initApp(
        initContext(),
        registerApi(),
    );
})();

async function initApp(
    ctx: AppContext,
    api: ScannedIpcMainApiService["ApiClient"],
) {
    if (development) {
        app.on("web-contents-created", (...[, contents]) => {
            contents.openDevTools();
        });
    }

    app.on("ready", async () => {
        const uiContext = ctx.uiContext = {
            browserWindow: await initBrowserWindow(ctx),
            tray: await initTray(ctx, api),
        };

        app.on("activate", async () => {
            if (!uiContext.browserWindow || uiContext.browserWindow.isDestroyed()) {
                uiContext.browserWindow = await initBrowserWindow(ctx);
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
    const trayIcon = appRelative(
        os.platform() === "darwin"
            ? "./assets/icons/mac/icon.png"
            : (
                os.platform() !== "win32"
                    // 32x32 on non-macOS/non-Windows systems (eg Linux)
                    // https://github.com/electron/electron/issues/21445#issuecomment-565710027
                    ? "./assets/icons/icon-32x32.png"
                    : browserWindowIcon
            ),
    );

    return {
        locations: {
            app: appRelative(),
            browserWindowIcon: appRelative(browserWindowIcon),
            browserWindowPage,
            browserWindowPreload: appRelative("./generated/renderer/browser-window-preload/index.js"),
            trayIcon,
            renderer: {
                browserWindow: appRelative("./generated/renderer/browser-window/index.js"),
            },
        },
    };
}
