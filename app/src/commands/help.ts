import { Command } from "../command-interface"
import { Message, RichEmbed } from "discord.js";
import { readdirSync } from "fs"

export default class Help implements Command {
    readonly name = "help";
    async getDescription(server?: string): Promise<string> {
        return `This help text...`;
    }

    async exec(message: Message, args: string[]) {
        let text = "";

        // called from _within_ commands dir
        const commandFiles = readdirSync(__dirname).filter(file => file.endsWith(".ts"));
        for (const file of commandFiles) {
            const module = await import(`${__dirname}/${file}`);
            const command = new module.default; // tomfoolery
            text = text + `**${command.name}**
                           ${await command.getDescription(message.guild.id)}\n\n`;
        }

        const embed = new RichEmbed();
        embed.setDescription(text).setTitle("Roll Call Help");
        message.channel.send(embed);
    }
};