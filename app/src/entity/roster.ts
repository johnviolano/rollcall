import { Column } from "typeorm";

export class Roster {
    constructor() {
        this.in = new Array<string>();
        this.out = new Array<string>();
    }

    @Column({ nullable: true })
    message: string; // Message snowflake

    @Column({ type: "simple-array" })
    in: string[];

    @Column({ type: "simple-array" })
    out: string[];
}
