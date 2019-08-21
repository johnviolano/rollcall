import { Command } from "../command-interface"
import { Message, RichEmbed } from "discord.js";
import { getManager } from "typeorm";
import { Server, DEFAULT_OUT_TOKENS} from "../entity/server";
import Rollcaller from "../rollcaller";

export default class Out implements Command {
    readonly name = "out";
    async getDescription(serverId?: string): Promise<string> {
        const em = getManager();
        const server = await em.findOne(Server, serverId);
        let tokens = "";
        if(server)
            tokens = server.outTokens.join(" | ");
        else
            tokens = DEFAULT_OUT_TOKENS.join(" | ");
        return `Adds your name to the out list.
                Example - @Roll Call [ ${tokens} ]`;
    }

    async exec(message: Message, args: string[]) {
        const em = getManager();
        const server = await em.findOne(Server, message.guild.id);
        const embed = new RichEmbed();
        embed.setTitle(`**${this.name}**`);
        if (!server || !server.schedule.isScheduled()) {
            embed.setDescription("No roll call scheduled for this channel.")
            message.channel.send(embed);
            return;
        }

        // Only add if user isn't already in list
        if (!server.currentRoster.out.includes(message.member.id))
            server.currentRoster.out.push(message.member.id);

        // check for swap
        const i = server.currentRoster.in.indexOf(message.member.id);
        if (i > -1)
            server.currentRoster.in.splice(i, 1);
        await em.save(server);
        Rollcaller.update(message.guild.id);
    }
};
