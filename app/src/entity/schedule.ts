import { Column } from "typeorm";

export class Schedule {
    constructor(channel: string, dailyRollcallTime: string[], rollcallDays: string[]) {
        this.channel = channel;
        this.dailyRollcallTime = dailyRollcallTime;
        this.rollcallDays = rollcallDays;
    }

    // Typeorm weirdness, cannot have a nullable embedded type (Schedule)
    // so need to indicate validity of the object manually
    isScheduled() : boolean { return this.channel != null; }

    clear() {
        this.channel = null;
        this.dailyRollcallTime = null;
        this.rollcallDays = null;
    }

    @Column({ nullable: true })
    channel: string; // channel snowflake


    @Column({ type: "simple-array", nullable: true })
    dailyRollcallTime: string[];

    @Column({ type: "simple-array", nullable: true })
    rollcallDays: string[];
}
