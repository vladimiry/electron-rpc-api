import {Configuration} from "webpack";
import HtmlWebpackPlugin from "html-webpack-plugin";
import {Options} from "tsconfig-paths-webpack-plugin/lib/options";
import packageJson from "package.json";
import path from "path";
import {TsconfigPathsPlugin} from "tsconfig-paths-webpack-plugin";
import {merge as webpackMerge} from "webpack-merge";

import {MiniCssExtractPlugin} from "webpack-configs/require-import";

const production = process.env.NODE_ENV !== "development";
const rootPath = (value = ""): string => path.join(process.cwd(), value);
const outputPath = (value = ""): string => path.join(rootPath("./app/generated"), value);

const buildConfig = (configPatch: Configuration, tsOptions: Partial<Options> = {}): Configuration => {
    return webpackMerge(
        configPatch,
        {
            mode: production ? "production" : "development",
            devtool: false,
            output: {
                filename: "[name].js",
                path: outputPath(),
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
                alias: {
                    "msgpackr": rootPath("./node_modules/msgpackr/index.js"),
                },
                plugins: [
                    new TsconfigPathsPlugin(tsOptions),
                ],
                fallback: {
                    "path": false,
                    "fs": false,
                },
            },
            node: {
                __dirname: false,
                __filename: false,
            },
            optimization: {
                minimize: false,
                chunkIds: "named",
                moduleIds: "named",
            },
        },
    );
};

const configurations = [
    buildConfig(
        {
            target: "electron-main",
            entry: {
                "main/index": rootPath("./src/main/index.ts"),
            },
            externals: Object.keys(packageJson.dependencies).map((value) => `commonjs ${value}`),
        },
        {
            configFile: rootPath("./src/main/tsconfig.json"),
        },
    ),
    buildConfig(
        {
            entry: {
                "renderer/browser-window-preload/index": rootPath("./src/renderer/browser-window-preload/index.ts"),
            },
            target: "electron-renderer",
        },
        {
            configFile: rootPath("./src/renderer/browser-window-preload/tsconfig.json"),
        },
    ),
    buildConfig(
        {
            entry: {
                "renderer/browser-window/index": rootPath("./src/renderer/browser-window/index.ts"),
            },
            ...(production ? {} : {
                devServer: {
                    client: {
                        logging: "error",
                        progress: true,
					},
                    devMiddleware: {
                        stats: "minimal",
					},
                },
            }),
            target: "web",
            module: {
                rules: [
                    {
                        test: /\.css$/,
                        use: [
                            MiniCssExtractPlugin.loader,
                            {
                                loader: "css-loader",
                                options: {
                                    esModule: false,
                                },
                            },
                        ],
                    },
                    {
                        test: /\.scss/,
                        use: [
                            MiniCssExtractPlugin.loader,
                            {
                                loader: "css-loader",
                                options: {
                                    esModule: false,
                                },
                            },
                            "sass-loader",
                        ],
                    },
                ],
            },
            plugins: [
                new MiniCssExtractPlugin(),
                new HtmlWebpackPlugin({
                    template: rootPath("./src/renderer/browser-window/index.html"),
                    filename: outputPath("./renderer/browser-window/index.html"),
                    title: packageJson.description,
                    minify: false,
                    hash: false,
                }),
            ],
        },
        {
            configFile: rootPath("./src/renderer/browser-window/tsconfig.json"),
        },
    ),
];

export default configurations;
