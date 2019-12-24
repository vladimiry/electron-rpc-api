import HtmlWebpackPlugin from "html-webpack-plugin";
import MiniCssExtractPlugin from "mini-css-extract-plugin";
import nodeExternals from "webpack-node-externals";
import path from "path";
import webpackMerge from "webpack-merge";
import {Configuration} from "webpack";
import {Options} from "tsconfig-paths-webpack-plugin/lib/options";
import {TsconfigPathsPlugin} from "tsconfig-paths-webpack-plugin";

import packageJson from "./package.json";

const production = process.env.NODE_ENV !== "development";
const root = (value: string = "") => path.join(process.cwd(), value);
const output = (value: string = "") => path.join(root("./app/generated"), value);

const buildConfig = (configPatch: Configuration, tsOptions: Partial<Options> = {}): Configuration => {
    return webpackMerge(
        configPatch,
        {
            mode: production ? "production" : "development",
            devtool: false,
            output: {
                filename: "[name].js",
                path: output(),
            },
            module: {
                rules: [
                    {
                        test: /\.ts$/,
                        use: {
                            loader: "ts-loader",
                            options: {
                                configFile: tsOptions.configFile,
                            },
                        },
                    },
                ],
            },
            resolve: {
                extensions: ["*", ".js", ".ts"],
                plugins: [
                    new TsconfigPathsPlugin(tsOptions),
                ],
            },
            node: {
                __dirname: false,
                __filename: false,
            },
            optimization: {
                minimize: false,
                namedChunks: true,
                namedModules: true,
            },
        },
    );
};

const configurations = [
    buildConfig(
        {
            target: "electron-main",
            entry: {
                "main/index": root("./src/main/index.ts"),
            },
            externals: [
                nodeExternals({
                    modulesFromFile: {
                        exclude: ["devDependencies"],
                        include: ["dependencies"],
                    },
                }),
            ],
        },
        {
            configFile: root("./src/main/tsconfig.json"),
        },
    ),
    buildConfig(
        {
            entry: {
                "renderer/browser-window-preload/index": root("./src/renderer/browser-window-preload/index.ts"),
            },
            target: "electron-renderer",
        },
        {
            configFile: root("./src/renderer/browser-window-preload/tsconfig.json"),
        },
    ),
    buildConfig(
        {
            entry: {
                "renderer/browser-window/index": root("./src/renderer/browser-window/index.ts"),
            },
            ...(production ? {} : {
                devServer: {
                    inline: true,
                    stats: "minimal",
                    clientLogLevel: "error",
                },
            }),
            target: "web",
            node: {
                path: "empty",
                fs: "empty",
                __dirname: false,
                __filename: false,
                Buffer: false,
                global: false,
                process: false,
                setImmediate: false,
            },
            module: {
                rules: [
                    {
                        test: /\.css$/,
                        use: [
                            MiniCssExtractPlugin.loader,
                            "css-loader",
                        ],
                    },
                    {
                        test: /\.scss/,
                        use: [
                            MiniCssExtractPlugin.loader,
                            "css-loader",
                            "sass-loader",
                        ],
                    },
                ],
            },
            plugins: [
                new MiniCssExtractPlugin(),
                new HtmlWebpackPlugin({
                    template: root("./src/renderer/browser-window/index.html"),
                    filename: output("./renderer/browser-window/index.html"),
                    title: packageJson.description,
                    minify: false,
                    hash: false,
                }),
            ],
        },
        {
            configFile: root("./src/renderer/browser-window/tsconfig.json"),
        },
    ),
];

export default configurations;
