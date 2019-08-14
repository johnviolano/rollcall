import { Message } from "discord.js";

export interface Command {
    readonly name: string;
    getDescription(server?: string): Promise<string>;
    exec(message: Message, args: string[]): Promise<void>;
}