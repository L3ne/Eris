const { EmbedBuilder, PermissionsBitField } = require("discord.js");

module.exports = {
    name: "say",
    aliases: [],
    description: "Displays all the commands that are available to the user",
    default_member_permissions: ['Administrator'],
    user_perms: ['Administrator'],
    bot_perms: ['Administrator'],
    cooldown: 1000,
    execute: async (client, message, args) => {

		message.delete();
            if (args.join(" ") == '@everyone') return;
            message.channel.send({ content: args.join(" ") });
    }
}