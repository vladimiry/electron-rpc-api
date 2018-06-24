import {app, BrowserWindow} from "electron";

import {AppContext, AppUiContext} from "./model";

export function init({locations}: AppContext): BrowserWindow {
    const browserWindow = new BrowserWindow({
        icon: locations.browserWindowIcon,
    });

    browserWindow.on("closed", () => {
        browserWindow.destroy();

        if (process.platform !== "darwin") {
            app.quit();
        }
    });

    browserWindow.loadURL(locations.browserWindowPage);
    browserWindow.setMenu(null);

    return browserWindow;
}

export function activate(uiContext?: AppUiContext) {
    if (!uiContext || !uiContext.browserWindow) {
        return;
    }

    uiContext.browserWindow.show();
    uiContext.browserWindow.focus();
}

export function toggle(uiContext?: AppUiContext, forceVisibilityState?: boolean) {
    if (!uiContext || !uiContext.browserWindow) {
        return;
    }

    if (typeof forceVisibilityState !== "undefined" ? forceVisibilityState : !uiContext.browserWindow.isVisible()) {
        activate(uiContext);
    } else {
        uiContext.browserWindow.hide();
    }
}
