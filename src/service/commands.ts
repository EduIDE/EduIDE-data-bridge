import { type, type Type } from "arktype";
import * as vscode from "vscode";
import { getEnvSchema } from "../schema";
import type DataService from "./data";
import logger from "./logger";

// manages VSCode commands
export default class CommandRegistry {
    private context: vscode.ExtensionContext;
    private dataService: DataService;
    private static readonly COMMAND_PREFIX = "dataBridge";

    constructor(context: vscode.ExtensionContext, dataService: DataService) {
        this.context = context;
        this.dataService = dataService;
    }

    // registers all VSCode commands in the context
    public registerCommands() {
        this.registerCommand("getEnv", getEnvSchema, (request) => {
            return this.dataService.getEnvVars(request);
        });

        // Register command to return the full injected environment plus a readiness
        // flag (no arguments, so it bypasses the schema-validating helper).
        const getEnvStateDisposable = vscode.commands.registerCommand(
            `${CommandRegistry.COMMAND_PREFIX}.getEnvState`,
            () => {
                return this.dataService.getEnvState();
            },
        );
        this.context.subscriptions.push(getEnvStateDisposable);

        // Register command to show logs (no validation needed)
        const showLogsDisposable = vscode.commands.registerCommand(
            `${CommandRegistry.COMMAND_PREFIX}.showLogs`,
            () => {
                logger.show();
            },
        );
        this.context.subscriptions.push(showLogsDisposable);
    }

    private registerCommand<T extends Type>(
        name: string,
        schema: T,
        callback: (request: T["infer"]) => void,
    ) {
        const disposable = vscode.commands.registerCommand(
            `${CommandRegistry.COMMAND_PREFIX}.${name}`,
            (args) => {
                // we enforce a single argument for the command
                const request = schema(args);
                if (request instanceof type.errors) {
                    logger.error(`Invalid request for command ${name}`, new Error(request.summary));
                    return request.summary;
                }
                logger.debug(`Executing command ${name}`, args);
                return callback(request);
            },
        );
        this.context.subscriptions.push(disposable);
    }
}
