import { Command } from "../command-interface"
import { Message, RichEmbed } from "discord.js";
import { getManager } from "typeorm";
import { Server } from "../entity/server";
import { probe } from "probe-image-size"

export default class Config implements Command {
    readonly name = "config";
    async getDescription(server?: string): Promise<string> {
        return `Sets a configuration value.
                Example - @Roll Call config [ squad-size | add-in | add-out | add-hype ] <value>`; 
    }

    async exec(message: Message, args: string[]) {
        const embed = new RichEmbed();
        embed.setTitle("Config");
        embed.setDescription(await this.getDescription);

        if (args.length === 1) {
            message.channel.send(embed);
            return;
        }

        const em = getManager();
        let entity = await em.findOne(Server, message.guild.id);
        if (!entity)
            entity = new Server(message.guild.id);

        const sub = args.shift();
        switch (sub) {
            case "squad-size": {
                const size = parseInt(args.shift());
                if (Number.isNaN(size)) {
                    break;
                } else {
                    entity.squadSize = size;
                    embed.setDescription("Squad size updated for channel.");
                    message.channel.send(embed);
                    em.save(entity);
                    return;
                }
            }
            case "add-in": {
                const token = args.shift();
                if (!token)
                    break;
                entity.inTokens.push(token);
                embed.setDescription(`${token} added as in indicator for server.`);
                message.channel.send(embed);
                em.save(entity);
                return;
            }
            case "add-out": {
                const token = args.shift();
                if (!token)
                    break;
                entity.outTokens.push(token);
                embed.setDescription(`${token} added as out indicator for server.`);
                message.channel.send(embed);
                em.save(entity);
                return;
            }
            case "add-hype": {
                const token = args.shift();
                if (!token)
                    break;
                try {
                    await probe(token);
                    entity.allInGifUrls.push(token);
                    embed.setDescription(`${token} added as a hype image for server.`);
                    message.channel.send(embed);
                } catch {
                    message.channel.send(embed);
                }
                return;
            }
        }
        // on parse error
        message.channel.send(embed);
    }
};