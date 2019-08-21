import { getManager, Not, IsNull } from "typeorm";
import { Server } from "./entity/server";
import { CronJob } from "cron";
import Rollcaller from "./rollcaller";
import { Schedule } from "./entity/schedule";

class RosterScheduler {
    private cronJobs: Map<string, [CronJob, CronJob]> = new Map();

    async loadSchedules() {
        const em = getManager();
        const servers = await em.find(Server);
        for (const s of servers) {
            this.startJobs(s);
        }
    }

    async clearSchedule(serverId: string) {

        // Remove jobs from runtime
        this.stopJobs(serverId);

        // Clear any existing rosters
        await Rollcaller.clear(serverId)

        // Remove schedule
        const em = getManager();
        let server = await em.findOne(Server, serverId);
        if (server) {
            server.schedule.clear();
            await em.save(server);
        }
    }

    async setSchedule(serverId: string, channel: string, rollcallTime: string[], rollcallDays: string[]) {

        const em = getManager();
        let server = await em.findOne(Server, serverId);
        // If no server config exists at all, create one with a schedule
        if (!server) {
            server = new Server(serverId);
        } else {
            // Clear any existing schedule and roster
            await this.clearSchedule(serverId);

        }

        // Set new channel and time
        server.schedule = new Schedule(channel, rollcallTime, rollcallDays);
        console.log(server.schedule);
        await em.save(server);

        // Start cron jobs for the server
        this.startJobs(server);
    }

    private startJobs(server: Server) {

        this.stopJobs(server.server);

        if(!server.schedule.isScheduled()) return;

        const hrNum = parseInt(server.schedule.dailyRollcallTime[0]);
        const minNum = parseInt(server.schedule.dailyRollcallTime[1]);

        let days = "*";
        if(server.schedule.rollcallDays)
            days = server.schedule.rollcallDays.join(); 

        // Create the rollcall and clear jobs
        const rollcallJob = new CronJob(`0 ${minNum} ${hrNum} * * ${days}`,
            () => Rollcaller.rollcall(server.server), null, true, "UTC");

        const clearHrNum = wrap(hrNum + 12, 0, 23);
        const clearJob = new CronJob(`0 ${minNum} ${clearHrNum} * * ${days}`,
            () => { Rollcaller.clear(server.server) }, null, true, "UTC");

        rollcallJob.start();
        clearJob.start();
        this.cronJobs.set(server.server, [rollcallJob, clearJob]);
    }

    private stopJobs(serverId: string) {
        // Remove jobs from runtime
        if (this.cronJobs.has(serverId)) {
            const oldJobs = this.cronJobs.get(serverId);
            oldJobs[0].stop();
            oldJobs[1].stop();
            this.cronJobs.delete(serverId);
        }
    }
};

// Time helper to add 12 to any hour and wrap around within a 24 hour clock, 12:30 + 12 = 00:30
function wrap(kX: number, kLowerBound: number, kUpperBound: number) {
    const range_size = kUpperBound - kLowerBound + 1;
    if (kX < kLowerBound)
        kX += range_size * ((kLowerBound - kX) / range_size + 1);
    return kLowerBound + (kX - kLowerBound) % range_size;
}

export const Scheduler = new RosterScheduler();
