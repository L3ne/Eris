const { EmbedBuilder, Collection, PermissionFlagsBits, Events } = require('discord.js');
const ms = require('ms')
const config = require('../../config.json')

const cooldowns = new Collection();

module.exports = {
    name: Events.MessageCreate,
    execute: async (client, message) => {
        if(message.author.bot) return;
        if(!message.content.startsWith(client.config.prefix)) return;
        var args = message.content.slice(client.config.prefix.length).trim().split(/ +/g)
        var command = args.shift().toLowerCase()
        
        if(!command) return;
        command = client.commands.get(command)|| client.commands.get(client.aliases.get(command))

        message.return = async(text, color = client.color) => {
            return message.reply({ embeds: [
                new EmbedBuilder()
                    .setColor(color)
                    .setDescription(text)
            ] })
        }
        message.error = (text) => message.return(text, '#fc3c35')
        
        if(command) {
            // Vérifier si l'utilisateur est owner du bot ou whitelist
            const isOwner = message.author.id === config.ownerID;
            const isWhitelisted = client.whitelistManager ? client.whitelistManager.isWhitelisted(message.author.id) : false;

            if(command.cooldown && cooldowns.has(`${message.author.id}|${command.name}`)) 
                return message.error(`You are on a **${ms(cooldowns.get(`${message.author.id}|${command.name}`) - Date.now(), {long : true})}** cooldown.`)
            
            if(command.user_perms || command.bot_perms) {
                if(!isOwner && !isWhitelisted && !message.member.permissions.has(PermissionFlagsBits[command.user_perms || []])) 
                return message.error(`You don't have the required permissions to run this command.`)
                if(!message.guild.members.cache.get(client.user.id).permissions.has(PermissionFlagsBits[command.bot_perms || []])) 
                return message.error(`The bot doesn't have the required permissions to run this command.`)
            }
            
            try {
                command.execute(client, message, args)
            } catch (err) {
                console.log(err)
                message.error(`The bot ran into an error executing that command.`)
            }
            
            if(command.cooldown) {
                cooldowns.set(`${message.author.id}|${command.name}`, Date.now() + command.cooldown)
                setTimeout(() => {
                    cooldowns.delete(`${message.author.id}|${command.name}`)
                }, command.cooldown);
            }
        }
    }
}