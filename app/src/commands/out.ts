import { Command } from "../command-interface"
import { Message } from "discord.js";
import { getManager } from "typeorm";
import { Server, DEFAULT_OUT_TOKENS} from "../entity/server";
import Rollcaller from "../rollcaller";

export default class Out implements Command {
    readonly name = "out";
    async getDescription(server?: string): Promise<string> {
        const em = getManager();
        const entity = await em.findOne(Server, server);
        let tokens = "";
        if(entity)
            tokens = entity.outTokens.join(" | ");
        else
            tokens = DEFAULT_OUT_TOKENS.join(" | ");
        return `Adds your name to the out list.
                Example - @Roll Call [ ${tokens} ]`;
    }

    async exec(message: Message, args: string[]) {
        const em = getManager();
        const entity = await em.findOne(Server, message.guild.id);
        if (!entity || !entity.schedule) {
            message.channel.send("No roll call scheduled for this channel.")
            return;
        }

        // Only add if user isn't already in list
        if (!entity.currentRoster.out.includes(message.member.id))
            entity.currentRoster.out.push(message.member.id);

        // check for swap
        const i = entity.currentRoster.in.indexOf(message.member.id);
        if (i > -1)
            entity.currentRoster.in.splice(i, 1);
        await em.save(entity);
        Rollcaller.update(message.guild.id);
    }
};
