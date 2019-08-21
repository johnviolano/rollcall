import { Command } from "../command-interface"
import { Message, RichEmbed } from "discord.js";
import { Scheduler } from "../scheduler";
import { getManager } from "typeorm";
import { Server } from "../entity/server";

export default class Schedule implements Command {
    readonly name = "schedule";
    async getDescription(server?: string): Promise<string> {
        return `Schedule or clear a recuring roll call in GMT for this channel (one per server) or print schedule.
                Example - @Roll Call schedule [ clear | HH:MM ]`;
    }

    async exec(message: Message, args: string[]) {

        const embed = new RichEmbed();
        embed.setTitle(`**${this.name}**`);
        embed.setDescription(await this.getDescription());

        if (args.length === 0) {
            const em = getManager();
            const server = await em.findOne(Server, message.guild.id);
            if(server && server.schedule.isScheduled()) {
                embed.setDescription(`Roll call scheduled in this channel for \
                    ${server.schedule.dailyRollcallTime[0]}:${server.schedule.dailyRollcallTime[1].padStart(2, '0')}`);
            }
            else {
                embed.setDescription("No roll call scheduled for this channel.")
            }
            message.channel.send(embed);
            return;
        }

        let command = args.shift();

        // Clear existing schedule
        if (command === "clear") {
            try {
                Scheduler.clearSchedule(message.guild.id);
                embed.setDescription("Roll call unscheduled in this channel.");
                message.channel.send(embed);
            } catch (error) {
                console.error(`Failed to clear schedule\n${error}`);
                embed.setDescription("Failed to clear schedule.");
                message.channel.send(embed);
            }
            return;
        }

        // Test time validity
        if (!command.includes(":")) {
            message.channel.send(embed);
            return;
        }
        let timeArray = command.split(":");
        let hour = parseInt(timeArray[0]);
        let min = parseInt(timeArray[1]);
        if (hour < 0 || hour > 24 || min < 0 || min > 59) {
            message.channel.send(embed);
            return;
        }

        // Update schedule
        try {
            const rollcallTime = [String(hour), String(min)];
            Scheduler.setSchedule(message.guild.id, message.channel.id, rollcallTime);
            embed.setDescription("Roll call scheduled in this channel.");
            message.channel.send(embed);
            return;
        } catch (error) {
            console.error(`Failed to schedule roll call\n${error}`);
            embed.setDescription("Failed schedule roll call.");
            message.channel.send(embed);
        }
    }
};
