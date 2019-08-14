import { Command } from "../command-interface"
import { Message } from "discord.js";
import { getManager } from "typeorm";
import { Server, DEFAULT_IN_TOKENS } from "../entity/server";
import Rollcaller from "../rollcaller";

export default class In implements Command {
    readonly name = "in";
    async getDescription(server?: string): Promise<string> {
        const em = getManager();
        const entity = await em.findOne(Server, server);
        let tokens = "";
        if(entity)
            tokens = entity.inTokens.join(" | ");
        else
            tokens = DEFAULT_IN_TOKENS.join(" | ");
        return `Adds your name to the down list.
                Example - @Roll Call [ ${tokens} ]`;
    }

    async exec(message: Message, args: string[]) {
        const em = getManager();
        const entity = await em.findOne(Server, message.guild.id);
        if (!entity || !entity.channel || (entity.channel != message.channel.id)) {
            message.channel.send("No roll call scheduled for this channel.")
            return;
        }

        // Only add if user isn't already in list
        if (!entity.currentRoster.in.includes(message.member.id))
            entity.currentRoster.in.push(message.member.id);

        // check for swap
        const i = entity.currentRoster.out.indexOf(message.member.id);
        if (i > -1)
            entity.currentRoster.out.splice(i, 1);
        await em.save(entity);
        Rollcaller.update(message.guild.id);
    }
};
