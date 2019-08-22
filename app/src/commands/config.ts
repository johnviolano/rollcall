import { Command } from "../command-interface"
import { Message, RichEmbed } from "discord.js";
import { getManager } from "typeorm";
import { Server } from "../entity/server";
import probe = require( "probe-image-size");

export default class Config implements Command {
    readonly name = "config";
    async getDescription(server?: string): Promise<string> {
        return `Sets a configuration value.
                Example - @Roll Call config [ squad-size | add-in | add-out | add-hype ] <value>`;
    }

    async exec(message: Message, args: string[]) {
        const embed = new RichEmbed();
        embed.setTitle(`**${this.name}**`);
        embed.setDescription(await this.getDescription());

        if (args.length === 1) {
            message.channel.send(embed);
            return;
        }

        const em = getManager();
        let server = await em.findOne(Server, message.guild.id);
        if (!server)
            server = new Server(message.guild.id);

        const sub = args.shift();
        switch (sub) {
            case "squad-size": {
                const size = parseInt(args.shift());
                if (Number.isNaN(size)) {
                    break;
                } else {
                    server.squadSize = size;
                    embed.setDescription("Squad size updated for channel.");
                    message.channel.send(embed);
                    em.save(server);
                    return;
                }
            }
            case "add-in": {
                const token = args.shift();
                if (!token)
                    break;
                server.inTokens.push(token);
                embed.setDescription(`${token} added as in indicator for server.`);
                message.channel.send(embed);
                em.save(server);
                return;
            }
            case "add-out": {
                const token = args.shift();
                if (!token)
                    break;
                server.outTokens.push(token);
                embed.setDescription(`${token} added as out indicator for server.`);
                message.channel.send(embed);
                em.save(server);
                return;
            }
            case "add-hype": {
                const token = args.shift();
                if (!token)
                    break;
                try {
                    await probe(token);
                    server.allInGifUrls.push(token);
                    embed.setDescription(`${token} added as a hype image for server.`);
                    message.channel.send(embed);
                } catch (error) {
                    console.error(`Failed to set hype image\n${error}`);
                    message.channel.send(embed);
                }
                return;
            }
        }
        // on parse error
        message.channel.send(embed);
    }
};