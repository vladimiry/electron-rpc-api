// TODO webpack v5: remove "require/var-requires"-based imports

declare class MiniCssExtractPluginClass {
    public static readonly loader: string;

    constructor();

    apply(compiler: import("webpack").Compiler): void;
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
export const MiniCssExtractPlugin: typeof MiniCssExtractPluginClass
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-var-requires
    = require("mini-css-extract-plugin");
