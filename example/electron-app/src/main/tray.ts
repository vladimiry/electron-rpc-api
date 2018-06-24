import {app, Menu, Tray} from "electron";

import {AppContext} from "./model";
import {IpcMainApi} from "@src/shared/ipc-main-api-definition";
import {toggle as toggleBrowserWindow} from "./window";

export async function init(ctx: AppContext, api: IpcMainApi): Promise<Tray> {
    const tray = new Tray(ctx.locations.trayIcon);
    const toggleWindow = () => toggleBrowserWindow(ctx.uiContext);
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
                await api.quitApp(undefined).toPromise();
            },
        },
    ]);

    tray.setContextMenu(contextMenu);
    tray.on("click", toggleWindow);

    app.on("before-quit", () => tray.destroy());

    return tray;
}
