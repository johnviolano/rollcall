import { Entity, Column, PrimaryColumn } from "typeorm";
import { Roster } from "./roster";

const ALL_IN_IMAGES = [
    "https://media.giphy.com/media/P8mXVA3KMqVgc/giphy.gif",
    "https://media.giphy.com/media/PkMt4UNvzpBUk/giphy.gif"
];
const ALL_OUT_IMAGES = [
    "https://media.giphy.com/media/3oEjI80DSa1grNPTDq/giphy.gif",
    "https://media.giphy.com/media/1BXa2alBjrCXC/giphy.gif"
];
const DEFAULT_SQUAD_SIZE = 4;
export const DEFAULT_IN_TOKENS = ["yes","down", "yeah", "ya", "yea", "y", "in"];
export const DEFAULT_OUT_TOKENS = ["no", "nope", "nah", "n", "out"];

@Entity()
export class Server {
    constructor(server: string, channel: string, rollcallTime?: string[]) {
        this.server = server;
        this.channel = channel;
        if(rollcallTime)
            this.dailyRollcallTime = rollcallTime;

        this.currentRoster = new Roster();
        this.allInGifUrls = ALL_IN_IMAGES;
        this.allOutGifUrls = ALL_OUT_IMAGES;
        this.squadSize = DEFAULT_SQUAD_SIZE;
        this.inTokens = DEFAULT_IN_TOKENS ;
        this.outTokens = DEFAULT_OUT_TOKENS;
        this.away = new Array<string>();
    }

    @PrimaryColumn({ update: false })
    server: string; // server ("guild.id") snowflake

    @Column({ update: false })
    channel: string; // channel snowflake

    @Column({ type: "simple-array", nullable: true })
    dailyRollcallTime: string[];

    @Column(type => Roster)
    currentRoster: Roster;

    @Column()
    squadSize: number;

    @Column("simple-array")
    allInGifUrls: string[];

    @Column("simple-array")
    allOutGifUrls: string[];

    @Column("simple-array")
    inTokens: string[];

    @Column("simple-array")
    outTokens: string[];

    @Column({ type: "simple-array" })
    away: string[];

}
