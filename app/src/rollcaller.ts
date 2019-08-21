import { getManager } from "typeorm";
import { Server } from "./entity/server";
import { Roster } from "./entity/roster";
import { RichEmbed, TextChannel, Message } from "discord.js";
import { DiscordClient } from "./discord-client";

export default class Rollcaller {
    static async rollcall(serverId: string) {

        const em = getManager();
        const server = await em.findOne(Server, serverId);

        if(!server || !server.schedule.isScheduled()) {
            console.error("There is no schedule for this channel, cannot rollcall!")
            return;
        }

        const embed = await Rollcaller.createEmbed(server);
        const mentions = Rollcaller.getMentions(server);
        const channel = DiscordClient.channels.get(server.schedule.channel) as TextChannel;

        const pins = await channel.fetchPinnedMessages();
        for (const p of pins.values()) {
            if (p.author === DiscordClient.user)
                p.delete();
        }

        const message = await channel.send(mentions, embed) as Message;
        message.pin();
        server.currentRoster.message = message.id;
        em.save(server);
    }

    static async update(serverId: string) {

        const em = getManager();
        const server = await em.findOne(Server, serverId);

        if(!server || !server.schedule.isScheduled()) {
            console.error("There is no schedule for this channel, cannot rollcall!")
            return;
        }

        if (!server.currentRoster.message) {
            Rollcaller.rollcall(serverId);
        }
        else {
            try {
                const channel = DiscordClient.channels.get(server.schedule.channel) as TextChannel;
                const message = await channel.fetchMessage(server.currentRoster.message);
                const embed = await Rollcaller.createEmbed(server);
                let mentions = "";
                // only send mentions if the rollcall already fired for the day, i.e. be less spammy
                if(message.content)
                    mentions = Rollcaller.getMentions(server);
                message.edit(mentions, embed);
            } catch(error) {
                console.info("Failed to find existing message. Attempting to recover by creating new message.");
                // Message may have been deleted by user
                Rollcaller.rollcall(serverId);
            }
        }
    }

    static async clear(serverId: string) {

        const em = getManager();
        const server = await em.findOne(Server, serverId);
        if (!server) return;

        server.currentRoster = new Roster();
        em.save(server);


        if(!server.schedule.isScheduled()) {
            console.error("There is no schedule for this channel, cannot clear rollcall!")
            return;
        }

        const channel = DiscordClient.channels.get(server.schedule.channel) as TextChannel;
        const pins = await channel.fetchPinnedMessages();
        for (const p of pins.values()) {
            if (p.author === DiscordClient.user)
                p.delete();
        }
    }

    private static async createEmbed(server: Server): Promise<RichEmbed> {

        let embed = new RichEmbed();
        embed.setColor("RED");

        const inIndicator = server.inTokens.slice(-1)[0];
        const outIndicator = server.outTokens.slice(-1)[0];

        let inUsers = "";
        let outUsers = "";

        // Some users in
        if (server.currentRoster.in.length > 0) {
            embed.setColor("GOLD");
        }

        // Full squad!
        if (server.currentRoster.in.length >= server.squadSize) {
            embed.setColor("GREEN");
            const randIndex = Math.floor(Math.random() * server.allInGifUrls.length);
            embed.setImage(server.allInGifUrls[randIndex]);
        }

        // Build list of in users
        for (const id of server.currentRoster.in) {
            const user = await DiscordClient.fetchUser(id);
            inUsers = inUsers.concat(" ", user.username);
        };

        // Special case for a user who is away but wants to mark themselves in anyway
        const definitelyAway = server.away.filter(m => !server.currentRoster.in.includes(m));

        // Build list of out and away users
        const outAndAway = new Set<string>([...server.currentRoster.out, ...definitelyAway]);
        if (outAndAway) {
            for (const id of outAndAway) {
                const user = await DiscordClient.fetchUser(id);
                outUsers = outUsers.concat(" ", user.username);
            };
        }

        // If a list is still empty give it a default null symbol
        if (inUsers.length === 0)
            inUsers = "∅";
        if (outUsers.length === 0)
            outUsers = "∅";

        embed.addField(inIndicator, inUsers);
        embed.addField(outIndicator, outUsers);

        return embed;
    }

    private static getMentions(server: Server): string {
        if(!server.schedule.isScheduled()) {
            console.error("There is no schedule for this channel, cannot get mentions!")
            return;
        }

        // Get all members of the channel
        const channel = DiscordClient.channels.get(server.schedule.channel) as TextChannel;
        let members = channel.members.filter(m => !m.user.bot);

        // Prune away members
        members = members.filter(m => !server.away.includes(m.user.id));

        // Prune already signed up members
        members = members.filter(m => !server.currentRoster.in.includes(m.user.id));
        members = members.filter(m => !server.currentRoster.out.includes(m.user.id));

        const mentions = members.map(m => `<@${m.id}>`).join(" ");
        return mentions;
    }
}
