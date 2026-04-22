const {
	EmbedBuilder,
	ActionRowBuilder,
	StringSelectMenuBuilder,
	StringSelectMenuOptionBuilder,
	PermissionFlagsBits,
    ApplicationCommandType,
    PermissionsBitField
} = require("discord.js");

module.exports = {
    name: "sticker",
    description: "Add a sticker to the server.",
    type: ApplicationCommandType.ChatInput,
    default_member_permissions: ['Administrator'],
    user_perms: ['Administrator'],
    bot_perms: ['Administrator'],
    cooldown: 1000,
    execute: async(client, interaction) => {

        await interaction.reply(`En attente de votre sticker...`)
        const filter = (m) => m.author.id === interaction.user.id;
        const collector = interaction.channel.createMessageCollector({filter: filter, time: 15000, max: 1});

        collector.on('collect', async m => {
            const sticker = m.stickers.first();

            const {guild} = interaction;
            
            if (m.stickers.size == 0) return await interaction.editReply(`c'est pas un sticker...`)

            if (sticker.url.endsWith('.json')) return await interaction.editReply(`sticker non valide...`)

            if (!guild.members.me.permissions.has(PermissionFlagsBits.ManageGuildExpressions)) return await interaction.editReply(`J'ai pas la permissions...`)
            try {
            const newSticker = await guild.stickers.create({
                name: sticker.name,
                description: sticker.description || '',
                tags: sticker.tags,
                file: sticker.url
            })

            await interaction.editReply(`Le stiker avec le nom **${newSticker.name}** à été crée!`)
        } catch (err) {
            console.log(err)
            await interaction.editReply(`Plus de place..`)
        }
            
        })

        collector.on('end', async reason => {
            if (reason === 'time') return await interaction.editReply(`Temp écouler..`)
            
        })
    }
}