import {app, Menu, Tray} from "electron";

import {AppContext} from "./model";
import {ScannedIpcMainApiService} from "src/shared/ipc-main-api-definition";
import {toggle as toggleBrowserWindow} from "./window";

export async function init(ctx: AppContext, api: ScannedIpcMainApiService["ApiClient"]): Promise<Tray> {
    const tray = new Tray(ctx.locations.trayIcon);
    const toggleWindow = (): void => toggleBrowserWindow(ctx.uiContext);
    const contextMenu = Menu.buildFromTemplate([
        {
            label: "Toggle Window",
            click: toggleWindow,
        },
        {
            type: "separator",
        },
        {
            label: "Quit",
            async click() {
                await api.quitApp();
            },
        },
    ]);

    tray.setContextMenu(contextMenu);
    tray.on("click", toggleWindow);

    app.on("before-quit", () => tray.destroy());

    return tray;
}
