export interface AppContext {
    readonly locations: AppContextLocations;
    uiContext?: AppUiContext;
}

export type AppContextLocations = Readonly<{
    readonly app: string;
    readonly browserWindowIcon: string;
    readonly browserWindowPage: string;
    readonly trayIcon: string;
    readonly renderer: Readonly<{
        readonly browserWindow: string;
    }>;
}>;

export interface AppUiContext {
    browserWindow: Electron.BrowserWindow;
    readonly tray: Electron.Tray;
}
