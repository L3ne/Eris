require('dotenv').config();
const fs = require('fs');
const { Client, Collection, GatewayIntentBits, Partials } = require('discord.js');
const config = require('./config.json');

const { Player } = require('discord-player');

const client = new Client({
    intents: Object.values(GatewayIntentBits).slice(0, 22),
    partials: Object.values(Partials),
});

client.config = {
    prefix: config.prefix,
    color: config.color,
};
client.color = "#dac7bb";
client.commands = new Collection();
client.events = new Collection();
client.aliases = new Collection();
client.slashCommands = new Collection();
client.modals = new Collection();
client.snipes = new Map();
require('./events/logs/Invite')(client);
module.exports = client;

client.on('messageDelete', function (message) {
    client.snipes.set(message.channel.id, {
        content: message.content,
        author: message.author,
        image: message.attachments.first() ? message.attachments.first().proxyURL : null,
    });
});

const player = new Player(client, {
    ytdlOptions: {
        filter: "audioonly",
        quality: "highestaudio",
        highWaterMark: 1 << 25
    }
});
client.player = player;

var handlers = fs.readdirSync('./handlers');
handlers = handlers.filter(f => f.endsWith('js') && !f.startsWith('-'));
for (let i in handlers) {
    let handler = require(`./handlers/${handlers[i]}`);
    if (handler) handler.execute(client);
}

process.on("uncaughtException", (err) => {
    console.log(err);
});
process.on('unhandledRejection', (reason, err) => {
    const a = [10008, 10062, 23284, 7072];
    const m = ["Message ID not found", "INTERACTION_TIMEOUT", "Invalid Intent", "clientReady"];
    if (m.includes(reason.message)) return;
    if (a.includes(reason.code)) return;
    console.log(reason, err);
});
process.on('uncaughtExceptionMonitor', (err) => {
    console.log(err);
});

(async () => {
    await client.login(process.env.TOKEN);
})();
