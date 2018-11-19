import * as sinon from "sinon";
import anyTest, {TestInterface} from "ava";
import rewiremock from "rewiremock";
import {of} from "rxjs";

import {AnyType} from "../src/lib/model";
import {ApiMethod, IpcMainApiService, WebViewApiService} from "./../dist";

interface TestContext {
    mocks: ReturnType<typeof buildMocks>;
}

const test = anyTest as TestInterface<TestContext>;
const buildMocks = () => {
    const emptyFn = () => {
        // NOOP
    };
    const prepareBindStub = () => ({bind: sinon.stub().returns(emptyFn)});

    return {
        electron: {
            ipcMain: {
                addListener: prepareBindStub(),
                emit: prepareBindStub(),
                removeListener: prepareBindStub(),
            },
            ipcRenderer: {
                on: prepareBindStub(),
                removeListener: prepareBindStub(),
                send: prepareBindStub(),
            },
        },
        webView: {
            addEventListener: prepareBindStub(),
            removeEventListener: prepareBindStub(),
            send: prepareBindStub(),
        },
    };
};

interface Api {
    stringToNumber: ApiMethod<string, number>;
}

const API: Api = {
    stringToNumber: (input) => of(Number(input)),
};

test.beforeEach((t) => {
    t.context.mocks = buildMocks();
    rewiremock("electron").with(t.context.mocks.electron);
    rewiremock.enable();
});

test.serial(IpcMainApiService.name, async (t) => {
    const apiService = new IpcMainApiService<Api>({channel: "ch1"});
    const registerStub = sinon.stub(apiService, "register");
    const callerStub = sinon.stub(apiService, "caller");
    const {ipcMain, ipcRenderer} = t.context.mocks.electron;

    // registerApi
    t.true(registerStub.notCalled);
    apiService.registerApi(API);
    t.is(1, registerStub.callCount);
    t.true((registerStub.calledWith as AnyType)(API));
    t.true(ipcMain.addListener.bind.calledWithExactly(ipcMain));
    t.true(ipcMain.emit.bind.calledWithExactly(ipcMain));
    t.true(ipcMain.removeListener.bind.calledWithExactly(ipcMain));

    // registerApi with custom ipcMain
    const {ipcMain: ipcMainOption} = buildMocks().electron;
    apiService.registerApi(API, {ipcMain: ipcMainOption} as AnyType);
    t.is(2, registerStub.callCount);
    t.true(ipcMainOption.addListener.bind.calledWithExactly(ipcMainOption));
    t.true(ipcMainOption.emit.bind.calledWithExactly(ipcMainOption));
    t.true(ipcMainOption.removeListener.bind.calledWithExactly(ipcMainOption));

    // buildClient
    t.true(callerStub.notCalled);
    apiService.buildClient();
    t.is(1, callerStub.callCount);
    t.true(ipcRenderer.removeListener.bind.calledWithExactly(ipcRenderer));
    t.true(ipcRenderer.send.bind.calledWithExactly(ipcRenderer));

    // buildClient with custom ipcRenderer
    const {ipcRenderer: ipcRendererOption} = buildMocks().electron;
    apiService.buildClient({ipcRenderer: ipcRendererOption} as AnyType);
    t.is(2, callerStub.callCount);
    t.true(ipcRendererOption.removeListener.bind.calledWithExactly(ipcRendererOption));
    t.true(ipcRendererOption.send.bind.calledWithExactly(ipcRendererOption));
});

test.serial(WebViewApiService.name, async (t) => {
    const apiService = new WebViewApiService<Api>({channel: "ch1"});
    const registerStub = sinon.stub(apiService, "register");
    const callerStub = sinon.stub(apiService, "caller");
    const {ipcRenderer} = t.context.mocks.electron;
    const webView = t.context.mocks.webView;

    // registerApi
    t.true(registerStub.notCalled);
    apiService.registerApi(API);
    t.is(1, registerStub.callCount);
    t.true((registerStub.calledWith as AnyType)(API));
    t.true(ipcRenderer.removeListener.bind.calledWithExactly(ipcRenderer));

    // registerApi with custom ipcMain
    const {ipcRenderer: ipcRendererOption} = buildMocks().electron;
    apiService.registerApi(API, {ipcRenderer: ipcRendererOption} as AnyType);
    t.is(2, registerStub.callCount);
    t.true(ipcRendererOption.removeListener.bind.calledWithExactly(ipcRendererOption));

    // buildClient
    t.true(callerStub.notCalled);
    apiService.buildClient(webView as AnyType);
    t.is(1, callerStub.callCount);
    t.true(webView.send.bind.calledWithExactly(webView));
});
