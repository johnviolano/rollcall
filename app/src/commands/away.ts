import { Command } from "../command-interface"
import { Message, RichEmbed } from "discord.js";
import { getManager } from "typeorm";
import { Server } from "../entity/server";
import { DiscordClient } from "../discord-client";

export default class Away implements Command {
    readonly name = "away";
    async getDescription(server?: string): Promise<string> {
        return `Toggle if you (or target user) should be pinged by Roll Call.
                Example - @Roll Call away [ @user ]`} 

    async exec(message: Message, args: string[]) {
        const embed = new RichEmbed();
        embed.setTitle(`**${this.name}**`);
        const em = getManager();
        const server = await em.findOne(Server, message.guild.id);
        if (!server) {
            embed.setDescription("No roll call scheduled for this channel.")
            message.channel.send(embed)
            return;
        }

        let userId = message.member.id;
        if(args.length > 0) {
            let argument = args.shift();
            try {
                let input = argument.match(/[0-9]+/g);
                const user = await DiscordClient.fetchUser(input[0]);
                userId = user.id;
            } catch {
                console.error("No user found for id");
                embed.setDescription("Invalid user argument");
                message.channel.send(embed)
                return;
            }
        }

        const i = server.away.indexOf(userId);
        if (i > -1) {
            // User returning
            server.away.splice(i, 1);
            embed.setDescription(`Welcome back <@${userId}>! You will be pinged daily.`);
        } else {
            // User departing
            if (!server.away.includes(userId))
                server.away.push(userId);
            embed.setDescription(`OK, <@${userId}> won't be pinged until you tell me to.`);
        }

        message.channel.send(embed)
        em.save(server);
    }
};
