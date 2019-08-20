import { Column } from "typeorm";

export class Schedule {
    constructor(channel: string, dailyRollcallTime: string[]) {
        this.channel = channel;
        this.dailyRollcallTime = dailyRollcallTime;
    }


    @Column()
    channel: string; // channel snowflake


    @Column({ type: "simple-array" })
    dailyRollcallTime: string[];
}
