import { getManager, Not, IsNull } from "typeorm";
import { Server } from "./entity/server";
import { CronJob } from "cron";
import Rollcaller from "./rollcaller";
import { Roster } from "./entity/roster";

class RosterScheduler {
    private cronJobs: Map<string, [CronJob,CronJob]> = new Map();

    async clearSchedule(server: string) {

        // Remove jobs from runtime
        if(this.cronJobs.has(server)) {
            const oldJobs = this.cronJobs.get(server);
            oldJobs[0].stop();
            oldJobs[1].stop();
            this.cronJobs.delete(server);
        }

        // Clear any existing rosters
        await Rollcaller.clear(server)

        // Remove schedule
        const em = getManager();
        let entity = await em.findOne(Server, server);
        if(entity) {
            entity.dailyRollcallTime = null;
            entity.channel = null;
            em.save(entity);
        }
    }

    async setSchedule(server: string, channel: string, rollcallTime: string[]) {

        const em = getManager();
        let entity = await em.findOne(Server, server);
        // If no server config exists at all, create one with a schedule
        if (!entity) {
            entity = new Server(server, channel, rollcallTime);
        } else {
            // Clear any existing schedule and roster
            await this.clearSchedule(server);

            // Set new channel and time
            entity.channel = channel;
            entity.dailyRollcallTime = rollcallTime;
        }
        await em.save(entity);

        // Create the rollcall and clear jobs
        const rollcall = new CronJob(`0 ${rollcallTime[1]} ${rollcallTime[0]} * * *`,
                () => Rollcaller.rollcall(server), null, true, "UTC");

        const hrNum = parseInt(rollcallTime[0]);
        const clearHr = wrap(hrNum + 12, 0, 23);
        const clear = new CronJob(`0 ${rollcallTime[1]} ${clearHr} * * *`,
                () =>{ Rollcaller.clear(server) }, null, true, "UTC");

        rollcall.start();
        clear.start();
        this.cronJobs.set(server, [rollcall, clear]);
    }

    async loadSchedules() {
        const em = getManager();
        const servers = await em.find(Server, { where: { dailyRollcallTime: Not(IsNull()) } });
        for(const s of servers) {
            this.setSchedule( s.server, s.channel, s.dailyRollcallTime)
        }
        console.info(`Schedules loaded: ${servers.length}`);
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
