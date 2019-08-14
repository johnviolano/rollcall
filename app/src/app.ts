import "reflect-metadata";
import { createConnection, getConnectionOptions } from "typeorm";
import { Server } from "./entity/server";
import { DiscordClient } from "./discord-client";
import { Listener } from "./message-handler";
import { MysqlConnectionOptions } from "typeorm/driver/mysql/MysqlConnectionOptions";
import { readFileSync } from 'fs';
import { Scheduler } from "./roster-scheduler";

async function run() {
    // Connect to database
    try {
        const connectionOptions = await getConnectionOptions() as MysqlConnectionOptions;
        Object.assign(connectionOptions, { password: readFileSync(process.env.MYSQL_PASSWORD_FILE, "utf8").trim() });
        const connection = await createConnection(connectionOptions);
        const servers = await connection.manager.find(Server);
        if (servers)
            console.info("Server configurations loaded: ", servers.length);
    } catch (error) {
        console.error(error)
        process.exit(1);
    }

    // Connect to discord
    DiscordClient.on("error", error => {
        console.error(error);
    });
    DiscordClient.on("ready", async () => {
        console.info("Roll Call starting...");
        // Listen for commands
        await Listener.loadCommands();
        await Scheduler.loadSchedules();
        DiscordClient.on("message", msg => Listener.handleMessage(msg));
    });
    try {
        await DiscordClient.login(readFileSync(process.env.DISCORD_TOKEN_FILE, "utf8").trim());
    } catch (error) {
        console.error(error)
        process.exit(1);
    }

}


run();
