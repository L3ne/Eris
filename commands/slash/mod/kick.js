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
    name: "kick",
    description: "Kick un utilisateur du serveur.",
    type: ApplicationCommandType.ChatInput,
    default_member_permissions: ['KickMembers'],
    user_perms: ['KickMembers'],
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
            description: "Raisons du kick.",
            type: ApplicationCommandOptionType.String,
            required: false
        }
    ],

    execute: async (client, interaction) => {

        const user = interaction.options.getUser("user");
        const reason = interaction.options.getString("raisons") || 'Pas de raison donnée.';

        // Récupérer le membre à partir de l'utilisateur pour accéder à ses rôles
        const targetUser = interaction.guild.members.cache.get(user.id);

        // Vérifier si le bot a les permissions nécessaires pour kick des membres
        if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.KickMembers)) {
            return interaction.reply("Je n'ai pas la permission de kick des membres.");
        }

        // Vérification des rôles
        const targetUserRolePosition = targetUser.roles.highest.position;
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
            .setCustomId("confirmkick")
            .setLabel("Confirmer le Kick")
            .setStyle(ButtonStyle.Success);

        const cancel = new ButtonBuilder()
            .setCustomId("cancelkick")
            .setLabel("Annuler le Kick")
            .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder().addComponents(confirm, cancel);
        await interaction.reply({
            content: `Êtes-vous sûr de vouloir **kick** ${user}?`,
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

            if (i.customId === "confirmkick") {
                try {
                    // Envoyer un message privé à l'utilisateur avant de le kick
                    await user.send(`Vous avez été expulsé du serveur **${interaction.guild.name}** pour la raison suivante : ${reason}.`);
                } catch (error) {
                    console.error(`Impossible d'envoyer un MP à ${user.tag}: ${error}`);
                }

                await interaction.guild.members.kick(user, { reason: `${reason} (Expulsé par ${interaction.user.username})` });

                const replyEmbed = new EmbedBuilder()
                    .setTitle('Expulsé avec succès')
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
            } else if (i.customId === "cancelkick") {
                await interaction.editReply({
                    content: "Vous avez annulé le kick.",
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
