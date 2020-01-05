import { DiscordClient } from "./discord-client"
import { Message, User } from "discord.js"
import { Command } from "./command-interface"
import { readdirSync } from "fs"
import { getManager } from "typeorm";
import { Server } from "./entity/server";

class DiscordListener {

  private readonly commands: Map<string, Command> = new Map();

  async loadCommands() {

    // slurp all commands into map
    const commandFiles = readdirSync("./src/commands").filter(file => file.endsWith(".ts"));
    for (const file of commandFiles) {
      const module = await import(`./commands/${file}`);
      const command = new module.default; // tomfoolery
      Listener.commands.set(command.name, command);
      console.info(`Loaded command: ${command.name}`);
    }
  }

  async handleMessage(msg: Message) {

    if (msg.author.bot) return;

    // Must be @Roll Call
    if (!msg.isMentioned(DiscordClient.user.id)) return;

    // Sanatize input
    let args = this.prepCommandArray(msg);
    let firstWord = args.shift();


    // Command did not start with bot mention, probably not a command
    if(!firstWord.includes(DiscordClient.user.id) return;

    let cmd = args.shift();

    if (!Listener.commands.has(cmd)) {
      // Handle custom in/out commands, doing this after trying for standard commands as optimization
      // TODO: use a cache
      const em = getManager();
      const server = await em.findOne(Server, msg.guild.id);
      if(server && server.inTokens.includes(cmd)) cmd = "in";
      else if (server && server.outTokens.includes(cmd)) cmd = "out";
      else return; // Standard command or custom token not present
    }

    const command: Command = Listener.commands.get(cmd);
    command.exec(msg, args)
  }

  private prepCommandArray(msg: Message) : string[] {
    let args = msg.content.trim().split(/ +/);
    args = args.filter(arg => arg.trim() != "");
    args = args.map(arg => arg.trim().toLowerCase());
    return args;
  }
}

export const Listener = new DiscordListener();
