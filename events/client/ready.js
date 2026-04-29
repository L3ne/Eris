const AsciiTable = require('ascii-table/ascii-table');
require('dotenv').config()
var colors = require('colors');
const { ActivityType, Events } = require('discord.js');
const mongoose = require('mongoose');
const gradient = require('gradient-string');
const WhitelistManager = require('../../utils/whitelist');
let join = (cmd, prefix) => {
    if(!cmd) return ' '
    return `${prefix}${cmd}`
}

let ascii = `             ,\\             
             \\\\\\,_        
              \\\` ,\\       
         __,.-" =__)         I like..
       ."        )           Discord.js v14
    ,_/   ,    \\/\\_        
    \\_|    )_-\\ \\_-\`     
       \`-----\` \`--\`      `

module.exports = {
    name: Events.ClientReady,
    execute: async (client) => {
        let table = new AsciiTable()
        table.setBorder(['│'], ['─'])
        table.setHeading('Events', 'Commands', 'Slash Commands', 'Apps')

        let ev = [...client.events.keys()].length
        let cmd = [...client.commands.keys()].length
        let slash = [...client.slashCommands.filter(s => s.type == 1).keys()].length
        let apps = [...client.slashCommands.filter(s => s.type !== 1).keys()].length

        for(var i = 0; i < Math.max(ev, cmd, slash, apps)+1; i++) {

            let events = [...client.events.keys()]
            let commands = [...client.commands.keys()]
            let slashCommands = [...client.slashCommands.filter(s => s.type == 1).keys()]
            let apps = [...client.slashCommands.filter(s => s.type !== 1).keys()]

            table.addRow(events[i], join(commands[i], client.config.prefix), join(slashCommands[i], '/'), apps[i])

        }

        mongoose.connect(process.env.MONGOURL, {
        }).then(() => {
            console.log(gradient.rainbow('Connected to MongoDB'));
            // Initialize whitelist after MongoDB is connected
            client.whitelistManager = new WhitelistManager();
        }).catch(err => {
            console.error('Failed to connect to MongoDB', err);
        });

        console.log(gradient('cyan', 'pink')(ascii+'\n'+table.toString()))

        console.log(gradient('cyan', 'pink')(`| ${client.user.username} Online! --> Users: ${client.users.cache.size}, Guilds: ${client.guilds.cache.size}`))

        const activities = [
            { name: `${client.users.cache.size} users`, type: ActivityType.Streaming, url: 'https://twitch.tv/aaaaaaaaaaaaaaaaaaaa' },
            { name: `Ayachi`, type: ActivityType.Streaming, url: 'https://twitch.tv/aaaaaaaaaaaaaaaaaaaa' }
        ]

        setInterval(() => {
            client.user.setActivity(activities[Math.floor(Math.random()*activities.length)])
            client.user.setStatus(`online`)
        }, 10000);
    } 
}