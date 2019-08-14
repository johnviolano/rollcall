import { Command } from "../command-interface"
import { Message, RichEmbed } from "discord.js";
import { getManager } from "typeorm";
import { Server } from "../entity/server";

export default class Away implements Command {
    readonly name = "away";
    async getDescription(server?: string): Promise<string> {
        return `Toggle if you want to be pinged by Roll Call.
                Example - @Roll Call away`} 

    async exec(message: Message, args: string[]) {
        const embed = new RichEmbed();
        embed.setTitle("Away");
        const em = getManager();
        const entity = await em.findOne(Server, message.guild.id);

        const i = entity.away.indexOf(message.member.id);
        if (i > -1) {
            // User returning
            entity.away.splice(i, 1);
            embed.setDescription(`Welcome back ${message.author}! You will be pinged daily.`);
        } else {
            // User departing
            if (!entity.away.includes(message.member.id))
                entity.away.push(message.member.id);
            embed.setDescription(`OK ${message.author}, you won't be pinged until you tell me to.`);
        }

        message.channel.send(embed)
        em.save(entity);
    }
};