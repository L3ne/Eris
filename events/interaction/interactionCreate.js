const { EmbedBuilder, Collection, PermissionsBitField, InteractionType, MessageFlags, Events } = require('discord.js');
const ms = require('ms')
const config = require('../../config.json')
const cooldowns = new Collection();

module.exports = {
    name: Events.InteractionCreate,
    execute: async(client, interaction) => {
        if(interaction.type !== InteractionType.ApplicationCommand) return;

        const command = client.slashCommands.get(interaction.commandName)
        if(!command) return client.slashCommands.delete(interaction.commandName)

        // Function to send a message inside embed to save time and code
        // Only if the interaction is already replied.
        interaction.embed = (text) => {
            let embed = new EmbedBuilder()
                .setColor(client.color)
                .setDescription(text);

            interaction.editReply({ embeds: [embed] })
        }

        try {
            // Vérifier si l'utilisateur est owner du bot ou whitelist
            const isOwner = interaction.user.id === config.ownerID;
            const isWhitelisted = client.whitelistManager ? client.whitelistManager.isWhitelisted(interaction.user.id) : false;

            if(command.cooldown && cooldowns.has(`${interaction.user.id}|${command.commandName}`)) 
                return interaction.reply({ content: `You are on a **${ms(cooldowns.get(`${interaction.user.id}|${command.commandName}`) - Date.now(), {long : true})}** cooldown.` })

            if(command.user_perms || command.bot_perms) {
                // Vérifier si le member existe (DM ou autre)
                if(!interaction.member) {
                    return interaction.reply({ content: `This command can only be used in a server.`, flags: MessageFlags.Ephemeral });
                }
                
                if(!isOwner && !isWhitelisted && !interaction.member.permissions.has(PermissionsBitField.resolve(command.user_perms || []))) 
                    return interaction.reply({ content: `You don't have the required permissions to run this command.`, flags: MessageFlags.Ephemeral })
                if(!interaction.guild.members.cache.get(client.user.id).permissions.has(PermissionsBitField.resolve(command.bot_perms || []))) 
                    return interaction.reply({ content: `The bot doesn't have the required permissions to run this command.`, flags: MessageFlags.Ephemeral })
            }

            try {
                await command.execute(client, interaction)
            } catch(err) {
                console.log(err)
                interaction.reply({ content: `The bot ran into an error executing that command.` })
                console.log(`Failed to execute command /${command.name} --> ${err.message}`)
            }

            if(command.cooldown) {
                cooldowns.set(`${interaction.user.id}|${command.commandName}`, Date.now() + command.cooldown)
                setTimeout(() => {
                    cooldowns.delete(`${interaction.user.id}|${command.commandName}`)
                }, command.cooldown);
            }

        } catch(err) {
            console.log(err)
        }
    }
}