import {app, BrowserWindow} from "electron";

import {AppContext, AppUiContext} from "./model";

export async function init({locations}: AppContext): Promise<BrowserWindow> {
    const browserWindow = new BrowserWindow({
        icon: locations.browserWindowIcon,
        webPreferences: {
            sandbox: true,
            contextIsolation: true,
            nodeIntegration: false,
            preload: locations.browserWindowPreload,
        },
    });

    browserWindow.on("closed", () => {
        browserWindow.destroy();

        if (process.platform !== "darwin") {
            app.quit();
        }
    });

    await browserWindow.loadURL(locations.browserWindowPage);
    browserWindow.setMenu(null);

    return browserWindow;
}

export function activate(uiContext?: AppUiContext): void {
    if (!uiContext || !uiContext.browserWindow) {
        return;
    }

    uiContext.browserWindow.show();
    uiContext.browserWindow.focus();
}

export function toggle(uiContext?: AppUiContext, forceVisibilityState?: boolean): void {
    if (!uiContext || !uiContext.browserWindow) {
        return;
    }

    if (typeof forceVisibilityState !== "undefined" ? forceVisibilityState : !uiContext.browserWindow.isVisible()) {
        activate(uiContext);
    } else {
        uiContext.browserWindow.hide();
    }
}
