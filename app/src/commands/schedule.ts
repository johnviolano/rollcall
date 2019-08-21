import { Command } from "../command-interface"
import { Message, RichEmbed } from "discord.js";
import { Scheduler } from "../scheduler";
import { getManager } from "typeorm";
import { Server } from "../entity/server";

export default class Schedule implements Command {
    readonly name = "schedule";
    async getDescription(server?: string): Promise<string> {
        return `Schedule or clear a recuring roll call in GMT for this channel (one per server) or print schedule.
                Example - @Roll Call schedule [ clear | HH:MM [Sun,Mon,Tue,Wed,Thu,Fri] ]`;
    }

    async exec(message: Message, args: string[]) {

        const embed = new RichEmbed();
        embed.setTitle(`**${this.name}**`);
        embed.setDescription(await this.getDescription());

        if (args.length === 0) {
            const em = getManager();
            const server = await em.findOne(Server, message.guild.id);
            if(server && server.schedule.isScheduled()) {
                const hr = server.schedule.dailyRollcallTime[0].padStart(2,"0");
                const min = server.schedule.dailyRollcallTime[1].padStart(2,"0");

                let days = "daily";
                if(server.schedule.rollcallDays)
                    days = server.schedule.rollcallDays.join(); 
                embed.setDescription(`Roll call scheduled in this channel for ${hr}:${min} GMT ${days}.`);
            }
            else {
                embed.setDescription("No roll call scheduled for this channel.")
            }
            message.channel.send(embed);
            return;
        }

        // Clear existing schedule
        if (args.includes("clear")) {
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

        // Time/DoW strings can be in either order
        const options = args.join();

        // Test time exists
        const time = options.match(/\b(0[0-9]|1[0-9]|2[0-3]|[0-9]):[0-5][0-9]\b/g);
        if (!time) {
            message.channel.send(embed);
            return;
        }

        let timeArray = time[0].split(":");
        let hour = parseInt(timeArray[0]);
        let min = parseInt(timeArray[1]);

        // Test time validity
        if (hour < 0 || hour > 24 || min < 0 || min > 59) {
            message.channel.send(embed);
            return;
        }

        const rollcallTime = [String(hour), String(min)];

        // Test for day of week specificity
        let rollcallDays = options.match(/(mon|tue|wed|thu|fri|sat|sun)(?!.*\1)/gi);

        // Update schedule
        try {
            await Scheduler.setSchedule(message.guild.id, message.channel.id, rollcallTime, rollcallDays);
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
