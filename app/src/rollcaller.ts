import { getManager } from "typeorm";
import { Server } from "./entity/server";
import { RichEmbed, TextChannel, Message } from "discord.js";
import { DiscordClient } from "./discord-client";
import { Roster } from "./entity/roster";

export default class Rollcaller {
    static async rollcall(server: string) {

        const em = getManager();
        const entity = await em.findOne(Server, server);
        const embed = await Rollcaller.createEmbed(entity);
        const mentions = Rollcaller.getMentions(entity);
        const channel = DiscordClient.channels.get(entity.channel) as TextChannel;

        const pins = await channel.fetchPinnedMessages();
        for (const p of pins.values()) {
            if (p.author === DiscordClient.user)
                p.delete();
        }

        const message = await channel.send(mentions, embed) as Message;
        message.pin();
        entity.currentRoster.message = message.id;
        em.save(entity);
    }

    static async update(server: string) {

        const em = getManager();
        const entity = await em.findOne(Server, server);

        if (entity.currentRoster.message === null) {
            Rollcaller.rollcall(server);
        }
        else {
            const channel = DiscordClient.channels.get(entity.channel) as TextChannel;
            const message = await channel.fetchMessage(entity.currentRoster.message);
            message.edit(this.getMentions(entity), await this.createEmbed(entity));
        }
    }

    static async clear(server: string) {

        const em = getManager();
        const entity = await em.findOne(Server, server);
        if (!entity) return;
        entity.currentRoster = new Roster();
        em.save(entity);

        const channel = DiscordClient.channels.get(entity.channel) as TextChannel;
        const pins = await channel.fetchPinnedMessages();
        for (const p of pins.values()) {
            if (p.author === DiscordClient.user)
                p.delete();
        }
    }

    private static async createEmbed(server: Server): Promise<RichEmbed> {

        var embed = new RichEmbed();
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
        // Get all members of the channel
        const channel = DiscordClient.channels.get(server.channel) as TextChannel;
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