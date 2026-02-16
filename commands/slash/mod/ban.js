const {
    EmbedBuilder,
    PermissionsBitField,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
    ApplicationCommandOptionType,
    ApplicationCommandType
} = require("discord.js");

module.exports = {
    name: "ban",
    description: "Ban un utilisateur du serveur.",
    type: ApplicationCommandType.ChatInput,
    default_member_permissions: ['BanMembers'],
    user_perms: ['BanMembers'],
    bot_perms: ['Administrator'],
    cooldown: 1000,
    options: [
        {
            name: "user",
            description: "Identifiant de l'utilisateur.",
            type: ApplicationCommandOptionType.User,
            required: true
        },
        {
            name: "raisons",
            description: "Raisons du ban.",
            type: ApplicationCommandOptionType.String,
            required: false
        }
    ],

    execute: async (client, interaction) => {

        const user = interaction.options.getUser("user");
        const reason = interaction.options.getString("raisons") || 'Pas de raison donnée.';

        // Vérifier si le bot a les permissions nécessaires pour bannir des membres
        if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.BanMembers)) {
            return interaction.reply("Je n'ai pas la permission de bannir des membres.");
        }

        // Vérification des rôles
        const targetMember = interaction.guild.members.cache.get(user.id);

		if (!targetMember) {
    		return interaction.reply({
        		content: "Cet utilisateur n'est pas dans le serveur.",
        		ephemeral: true
    		});
		}

// Vérification des rôles
const targetUserRolePosition = targetMember.roles.highest.position;
const requestUserRolePosition = interaction.member.roles.highest.position;
const botRolePosition = interaction.guild.members.me.roles.highest.position;

if (targetUserRolePosition >= requestUserRolePosition) {
    return interaction.reply({
        content: "Vous ne pouvez pas expulser cet utilisateur car il a un rôle égal ou supérieur au vôtre.",
        ephemeral: true
    });
}

if (targetUserRolePosition >= botRolePosition) {
    return interaction.reply({
        content: "Je ne peux pas expulser cet utilisateur car il a un rôle égal ou supérieur au mien.",
        ephemeral: true
    });
}

        const confirm = new ButtonBuilder()
            .setCustomId("confirmban")
            .setLabel("Confirmer le Ban")
            .setStyle(ButtonStyle.Success);

        const cancel = new ButtonBuilder()
            .setCustomId("cancelban")
            .setLabel("Annuler le Ban")
            .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder().addComponents(confirm, cancel);
        await interaction.reply({
            content: `Êtes-vous sûr de vouloir **ban** ${user}?`,
            components: [row],
            ephemeral: false,
        });

        const filter = (i) => i.user.id === interaction.user.id;

        const collector = interaction.channel.createMessageComponentCollector({
            filter,
            componentType: ComponentType.Button,
            time: 3_600_000,
        });

        collector.on("collect", async (i) => {
            await i.deferUpdate();

            if (i.customId === "confirmban") {
                try {
                    // Envoyer un message privé à l'utilisateur avant de le bannir
                    await user.send(`Vous avez été banni du serveur **${interaction.guild.name}** pour la raison suivante : ${reason}.`);
                } catch (error) {
                    console.error(`Impossible d'envoyer un MP à ${user.tag}: ${error}`);
                }

                await interaction.guild.members.ban(user, { reason: `${reason} (Banni par ${interaction.user.username})` });

                const replyEmbed = new EmbedBuilder()
                    .setTitle('Banni avec succès')
                    .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 1024 }))
                    .addFields(
                        { name: 'Utilisateur', value: `${user} (\`${user.tag}\`)`, inline: false },
                        { name: 'Raison', value: reason, inline: false }
                    )
                    .setTimestamp();

                await interaction.editReply({
                    content: "",
                    embeds: [replyEmbed],
                    components: [],
                });
                collector.stop();
            } else if (i.customId === "cancelban") {
                await interaction.editReply({
                    content: "Vous avez annulé le ban.",
                    components: [],
                });
                collector.stop();
            }
        });

        collector.on("end", (collected, reason) => {
            if (reason === 'time') {
                interaction.editReply({
                    content: "Confirmation non reçue dans le délai imparti, annulation.",
                    components: [],
                });
            }
        });
    },
};