const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    StringSelectMenuBuilder, 
    ButtonBuilder, 
    ButtonStyle 
} = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'help',
    description: 'Affiche la liste des commandes.',
    aliases: ['h', 'commands'],
    cooldown: 3000,
    async execute(client, message, args, interaction = null) {
        const prefix = client.config.prefix || '!';

        const input = args[0] || (interaction?.options?.getString('commande'));
        if (input) {
            const name = input.toLowerCase();
            const cmd = client.commands.get(name) || client.commands.find(c => c.aliases?.includes(name));
            if (!cmd) return (interaction ? interaction.reply({ content: "❌ Commande inconnue.", ephemeral: true }) : message.reply("❌ Commande inconnue."));

            const embed = new EmbedBuilder()
                .setColor(client.color)
                .setTitle(`Commande: ${cmd.name}`)
                .addFields(
                    { name: "Description", value: cmd.description || "Aucune" },
                    { name: "Aliases", value: cmd.aliases?.join(", ") || "Aucun" },
                    { name: "Cooldown", value: `${cmd.cooldown || 0}ms` }
                )
                .setFooter({ text: `Utilise ${prefix}help pour voir toutes les commandes` });

            return interaction ? interaction.reply({ embeds: [embed], ephemeral: true }) : message.reply({ embeds: [embed] });
        }

        const commandsPath = path.join(__dirname, '../../message');
        const categories = fs.readdirSync(commandsPath).filter(f => fs.lstatSync(path.join(commandsPath, f)).isDirectory());

        const mainEmbed = new EmbedBuilder()
            .setColor(client.color)
            .setTitle(`📖 Commandes de ${client.user.username}`)
            .setDescription(`Prefix: \`${prefix}\`\nUtilise \`${prefix}help <commande>\` pour plus d'infos\n\nChoisis une catégorie dans le menu ci-dessous :`)
            .setTimestamp()
            .setFooter({ text: `Demandé par ${interaction ? interaction.user.username : message.author.username}`, iconURL: interaction ? interaction.user.displayAvatarURL() : message.author.displayAvatarURL() });

        const menuOptions = [];
        const categoryCommands = {};

        for (const category of categories) {
            const categoryPath = path.join(commandsPath, category);
            const files = fs.readdirSync(categoryPath).filter(file => file.endsWith(".js"));
            if (!files.length) continue;

            const cmds = files.map(file => {
                const cmd = require(`${categoryPath}/${file}`);
                return { name: cmd.name, description: cmd.description || "Aucune description" };
            });

            categoryCommands[category] = cmds;

            menuOptions.push({
                label: category.charAt(0).toUpperCase() + category.slice(1),
                value: category,
                description: `${cmds.length} commandes`,
            });
        }

        const limitedOptions = menuOptions.slice(0, 25);

        const selectMenu = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('help_select')
                .setPlaceholder('Sélectionne une catégorie')
                .addOptions(limitedOptions)
        );

        const backButton = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('help_back')
                .setLabel('Retour au menu')
                .setStyle(ButtonStyle.Secondary)
        );

        // Envoie du message initial
        const sendMsg = async (emb, comps) => {
            if (interaction) return await interaction.reply({ embeds: [emb], components: comps, ephemeral: true });
            else return await message.reply({ embeds: [emb], components: comps });
        };

        const msg = await sendMsg(mainEmbed, [selectMenu]);

        const collector = msg.createMessageComponentCollector({ time: 120000 });

        collector.on('collect', async i => {
            const userId = interaction ? interaction.user.id : message.author.id;
            if (i.user.id !== userId) return i.reply({ content: "❌ Ce menu n'est pas pour toi.", ephemeral: true });

            // MENU DEROULANT
            if (i.isStringSelectMenu()) {
                const selected = i.values[0];
                const cmds = categoryCommands[selected];

                const categoryEmbed = new EmbedBuilder()
                    .setColor(client.color)
                    .setTitle(`📂 ${selected.charAt(0).toUpperCase() + selected.slice(1)} - Commandes`)
                    .setDescription(cmds.map(c => `**${prefix}${c.name}** • ${c.description}`).join('\n'))
                    .setTimestamp()
                    .setFooter({ text: `Demandé par ${interaction ? interaction.user.username : message.author.username}`, iconURL: interaction ? interaction.user.displayAvatarURL() : message.author.displayAvatarURL() });

                await i.update({ embeds: [categoryEmbed], components: [selectMenu, backButton] });
            }

            // BOUTON RETOUR
            if (i.isButton() && i.customId === 'help_back') {
                await i.update({ embeds: [mainEmbed], components: [selectMenu] });
            }
        });

        collector.on('end', () => {
            msg.edit({ components: [] }).catch(() => {});
        });
    }
};