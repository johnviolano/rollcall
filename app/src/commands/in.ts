import { Command } from "../command-interface"
import { Message, RichEmbed } from "discord.js";
import { getManager } from "typeorm";
import { Server, DEFAULT_IN_TOKENS } from "../entity/server";
import Rollcaller from "../rollcaller";

export default class In implements Command {
    readonly name = "in";
    async getDescription(serverId?: string): Promise<string> {
        const em = getManager();
        const server = await em.findOne(Server, serverId);
        let tokens = "";
        if(server)
            tokens = server.inTokens.join(" | ");
        else
            tokens = DEFAULT_IN_TOKENS.join(" | ");
        return `Adds your name to the down list.
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
        if (!server.currentRoster.in.includes(message.member.id))
            server.currentRoster.in.push(message.member.id);

        // check for swap
        const i = server.currentRoster.out.indexOf(message.member.id);
        if (i > -1)
            server.currentRoster.out.splice(i, 1);
        await em.save(server);
        Rollcaller.update(message.guild.id);
    }
};
