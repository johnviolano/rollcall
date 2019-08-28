import { Command } from "../command-interface"
import { Message, RichEmbed } from "discord.js";
import { getManager } from "typeorm";
import { Server, DEFAULT_IN_TOKENS, DEFAULT_OUT_TOKENS } from "../entity/server";
import probe = require( "probe-image-size");

export default class Config implements Command {
    readonly name = "config";
    async getDescription(server?: string): Promise<string> {
        return `Sets a configuration value.
                Example - @Roll Call config [ squad-size | add-in | add-out | add-hype | remove-in | remove-out ] <value> | list-hype | remove-hype <index>`;
    }

    async exec(message: Message, args: string[]) {
        const embed = new RichEmbed();
        embed.setTitle(`**${this.name}**`);
        embed.setDescription(await this.getDescription());

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
                    em.save(server);
                    break;
                }
            }
            case "add-in": {
                const token = args.shift();
                if (!token)
                    break;
                server.inTokens.push(token);
                embed.setDescription(`${token} added as in indicator for server.`);
                em.save(server);
                break;
            }
            case "add-out": {
                const token = args.shift();
                if (!token)
                    break;
                server.outTokens.push(token);
                embed.setDescription(`${token} added as out indicator for server.`);
                em.save(server);
                break;
            }
            case "add-hype": {
                const token = args.shift();
                if (!token)
                    break;
                try {
                    await probe(token);
                    server.allInGifUrls.push(token);
                    embed.setDescription(`${token} added as a hype image for server.`);
                    break;
                } catch (error) {
                    console.error(`Failed to set hype image\n${error}`);
                    break;
                }
            }
            case "remove-in": {
                const token = args.shift();
                if (!token)
                    break;
                if(DEFAULT_IN_TOKENS.includes(token)) {
                    embed.setDescription("Cannot remove default indicator");
                    break;
                }
                const i = server.inTokens.indexOf(token);
                if(i < 0) {
                    embed.setDescription("No such indicator in list");
                    break;
                }
                server.inTokens.splice(i, 1);
                embed.setDescription(`${token} removed as in indicator for server.`);
                em.save(server);
                break;
            }
            case "remove-out": {
                const token = args.shift();
                if (!token)
                    break;
                if(DEFAULT_OUT_TOKENS.includes(token)) {
                    embed.setDescription("Cannot remove default indicator");
                    break;
                }
                const i = server.outTokens.indexOf(token);
                if(i < 0) {
                    embed.setDescription("No such indicator in list");
                    break;
                }
                server.outTokens.splice(i, 1);
                embed.setDescription(`${token} removed as out indicator for server.`);
                em.save(server);
                break;
            }
            case "list-hype" : {
                const list = server.allInGifUrls.map((gif, i) => `${i} : ${gif}`);
                const msg = `\`\`\`${list.join('\n')}\`\`\``
                embed.setDescription(msg)
                break;
            }
            case "remove-hype" : {
                const token = args.shift();
                if (!token)
                    break;

                const i = parseInt(token);
                if(i < 0 || i >= server.allInGifUrls.length) {
                    embed.setDescription("Invalid index")
                    break;
                }

                if(server.allInGifUrls.length ===1) {
                    embed.setDescription("Must have at least one hype gif. What kind of monster are you?")
                    break;
                }

                server.allInGifUrls.splice(i, 1);
                embed.setDescription(`Removed hype gif ${i}`);
                em.save(server);
                break;
            }
            case "message" : {
                if(args.length === 0) {
                    server.message = null;
                    em.save(server);
                    embed.setDescription("Removed rollcall message");
                    break;
                }
                server.message = args.join(' ');
                em.save(server);
                embed.setDescription("Rollcall message set");
                break;
            }
        }

        message.channel.send(embed);
    }
};