import { getManager, Not, IsNull } from "typeorm";
import { Server } from "./entity/server";
import { CronJob } from "cron";
import Rollcaller from "./rollcaller";
import { Roster } from "./entity/roster";

class RosterScheduler {
    private cronJobs: Map<string, [CronJob,CronJob]> = new Map();

    async clearSchedule(server: string) {

        // Remove from runtime
        if(this.cronJobs.has(server)) {
            const oldJobs = this.cronJobs.get(server);
            oldJobs[0].stop();
            oldJobs[1].stop();
            this.cronJobs.delete(server);
        }

        // Remove from db
        const em = getManager();
        let entity = await em.findOne(Server, server);
        if(entity) {
            entity.dailyRollcallTime = null;
            entity.currentRoster = new Roster();
            em.save(entity);
        }
    }

    async setSchedule(server: string, channel: string, rollcallTime: string[]) {

        const em = getManager();
        let entity = await em.findOne(Server, server);
        if (!entity)
            entity = new Server(server, channel, rollcallTime);
        else
            entity.dailyRollcallTime = rollcallTime;

        await em.save(entity);

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
