import _import from "eslint-plugin-import";
import { defineConfig } from "eslint/config";
import { fileURLToPath } from "node:url";
import { fixupConfigRules, fixupPluginRules } from "@eslint/compat";
import { FlatCompat } from "@eslint/eslintrc";
import js from "@eslint/js";
import path from "node:path";
import sonarjs from "eslint-plugin-sonarjs";
import tsParser from "@typescript-eslint/parser";
import typescriptEslint from "@typescript-eslint/eslint-plugin";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default defineConfig([{
    languageOptions: {
        parser: tsParser,
        ecmaVersion: 2020,
        sourceType: "module",

        parserOptions: {
            project: "./tsconfig.json",
        },
    },
}, {
    files: ["**/*.ts"],

    extends: fixupConfigRules(compat.extends(
        "eslint:recommended",
        "plugin:import/errors",
        "plugin:import/warnings",
        "plugin:@typescript-eslint/recommended",
        "plugin:@typescript-eslint/recommended-requiring-type-checking",
    )),

    plugins: {
        import: fixupPluginRules(_import),
        "@typescript-eslint": fixupPluginRules(typescriptEslint),
        sonarjs: fixupPluginRules(sonarjs),
    },

    rules: {
        "max-len": ["error", {
            code: 140,
        }],

        "no-console": "error",
        "no-else-return": "error",
        "no-lonely-if": "error",
        "no-return-await": "error",
        "no-unused-expressions": "error",
        "no-useless-return": "error",

        "no-restricted-imports": ["error", {
            patterns: ["rxjs/*", "!rxjs/operators"],
        }],

        "prefer-destructuring": "error",
        semi: "error",
        "import/no-unresolved": "off",
        "import/no-relative-parent-imports": "error",
        "sonarjs/prefer-immediate-return": "off",
        "sonarjs/cognitive-complexity": "off",
        "sonarjs/no-duplicate-string": "off",
        "@typescript-eslint/no-floating-promises": "error",
        "@typescript-eslint/no-unsafe-return": "error",
        "@typescript-eslint/promise-function-async": "error",
        "@typescript-eslint/require-await": "off",

        "@typescript-eslint/no-misused-promises": ["error", {
            checksVoidReturn: false,
        }],

        "@typescript-eslint/explicit-function-return-type": ["warn", {
            allowExpressions: true,
        }],
    },
}]);
