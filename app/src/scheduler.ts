import { getManager, Not, IsNull } from "typeorm";
import { Server } from "./entity/server";
import { CronJob } from "cron";
import Rollcaller from "./rollcaller";
import { Schedule } from "./entity/schedule";

class RosterScheduler {
    private cronJobs: Map<string, [CronJob, CronJob]> = new Map();

    async loadSchedules() {
        const em = getManager();
        const servers = await em.find(Server, { where: { dailyRollcallTime: Not(IsNull()) } });
        for (const s of servers) {
            this.startJobs(s);
        }
        console.info(`Schedules loaded: ${servers.length}`);
    }

    async clearSchedule(server: string) {

        // Remove jobs from runtime
        this.stopJobs(server);

        // Clear any existing rosters
        await Rollcaller.clear(server)

        // Remove schedule
        const em = getManager();
        let entity = await em.findOne(Server, server);
        if (entity) {
            entity.schedule = null;
            em.save(entity);
        }
    }

    async setSchedule(server: string, channel: string, rollcallTime: string[]) {

        const em = getManager();
        let entity = await em.findOne(Server, server);
        // If no server config exists at all, create one with a schedule
        if (!entity) {
            entity = new Server(server);
        } else {
            // Clear any existing schedule and roster
            await this.clearSchedule(server);

        }

        // Set new channel and time
        entity.schedule = new Schedule(channel, rollcallTime);
        await em.save(entity);

        // Start cron jobs for the server
        this.startJobs(entity);
    }

    private startJobs(server: Server) {

        this.stopJobs(server.server);

        // Create the rollcall and clear jobs
        const rollcall = new CronJob(`0 ${server.schedule.dailyRollcallTime[1]} \
                                        ${server.schedule.dailyRollcallTime[0]} * * *`,
            () => Rollcaller.rollcall(server.server), null, true, "UTC");

        const hrNum = parseInt(server.schedule.dailyRollcallTime[0]);
        const clearHr = wrap(hrNum + 12, 0, 23);
        const clear = new CronJob(`0 ${server.schedule.dailyRollcallTime[1]} ${clearHr} * * *`,
            () => { Rollcaller.clear(server.server) }, null, true, "UTC");

        rollcall.start();
        clear.start();
        this.cronJobs.set(server.server, [rollcall, clear]);
    }

    private stopJobs(server: string) {
        // Remove jobs from runtime
        if (this.cronJobs.has(server)) {
            const oldJobs = this.cronJobs.get(server);
            oldJobs[0].stop();
            oldJobs[1].stop();
            this.cronJobs.delete(server);
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
