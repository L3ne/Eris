const {
	EmbedBuilder,
	ActionRowBuilder,
	StringSelectMenuBuilder,
	StringSelectMenuOptionBuilder,
	ButtonBuilder,
    ApplicationCommandType,
    ApplicationCommandOptionType
} = require("discord.js");


module.exports = {
    name: "embed",
    description: "Create custom embeds",
    type: ApplicationCommandType.ChatInput,
    default_member_permissions: ['Administrator'],
    user_perms: ['Administrator'],
    bot_perms: ['Administrator'],
    options: [
        {
            name: "channel",
            description: "Send the embed to a different channel",
            type: ApplicationCommandOptionType.Channel,
            required: false
        },
    ],
    cooldown: 1000,
    execute: async(client, interaction) => {

		const { options, member } = interaction;
		const channel = options.getChannel("channel") || interaction.channel;

		const previewEmbed = new EmbedBuilder().setDescription(
			"Preview Embeds. Start editing to see changes~"
		);
		const setupEmbed = new EmbedBuilder()
			.setColor("#7700ff")
			.setTitle("Settings")
			.setDescription("Use Select Menu below to edit preview");

		const buttons = {
			send: createButton("@Send", "Send", "Success"),
			cancel: createButton("@Cancel", "Cancel", "Danger"),
			return: createButton("@fieldReturn", "Return", "Secondary"),
			addField: createButton("@addField", "Add", "Success"),
			removeField: createButton("@remField", "Remove", "Danger")
		};

		const menu = new StringSelectMenuBuilder()
			.setCustomId("@Menu")
			.setPlaceholder("Edit Preview")
			.setMaxValues(1)
			.setMinValues(1)
			.setOptions(getMenuOptions());

		const setupComponent = new ActionRowBuilder().addComponents(menu);
		const buttonComponent = new ActionRowBuilder().addComponents(
			buttons.cancel,
			buttons.send
		);
		const fieldSetupComponent = new ActionRowBuilder().addComponents(
			buttons.removeField,
			buttons.addField
		);
		const fieldMenuComponent = new ActionRowBuilder().addComponents(
			buttons.return
		);

		const replies = await interaction.reply({
			embeds: [previewEmbed, setupEmbed],
			components: [setupComponent, buttonComponent]
		});

		const filter = i => i.user.id === member.id;
		const collector = replies.createMessageComponentCollector({
			filter,
			idle: 1000 * 60 * 10
		});

		let forceStop = false;

		collector.on("collect", async i => {
			if (forceStop) return;

			const embeds = i.message.embeds[0];
			const setup = i.message.embeds[1];

			switch (i.customId) {
				case "@Cancel":
					forceStop = true;
					return collector.stop();
				case "@Send":
					if (
						embeds.data.description ===
						"Preview Embeds. Start editing to see changes~"
					) {
						return i.reply({
							content:
								"Cannot send empty embed or without description!",
							ephemeral: true
						});
					}
					await channel.send({ embeds: [embeds] });
					await i.reply({ content: "Embed Sent!", ephemeral: true });
					forceStop = true;
					return collector.stop();
				case "@fieldReturn":
					enableComponents(setupComponent, buttonComponent);
					await i.update({
						embeds: [embeds, setupEmbed],
						components: [setupComponent, buttonComponent]
					});
					break;
				case "@remField":
					if (
						!embeds.data.fields ||
						embeds.data.fields.length === 0
					) {
						return i.reply({
							content: "No Fields Detected",
							ephemeral: true
						});
					}
					embeds.data.fields.pop();
					await i.update({
						embeds: [embeds, setup],
						components: [fieldSetupComponent, fieldMenuComponent]
					});
					break;
				case "@addField":
					setup.data.description =
						"Input Fields.\nSend field Name > Value > Inline: true | false";
					disableComponents(fieldSetupComponent, fieldMenuComponent);
					await i.update({
						embeds: [embeds, setup],
						components: [fieldSetupComponent, fieldMenuComponent]
					});

					const msgArr = (
						await i.channel.awaitMessages({
							filter: m => m.author.id === i.user.id,
							max: 3
						})
					).first(3);
					if (msgArr.length < 3) return;

					const fields = {
						name: msgArr[0].content,
						value: msgArr[1].content,
						inline: msgArr[2].content === "true"
					};

					if (!embeds.data.fields) {
						embeds.data.fields = [fields];
					} else {
						embeds.data.fields.push(fields);
					}

					enableComponents(fieldSetupComponent, fieldMenuComponent);
					setup.data.description =
						"Use the button below to add or remove fields";
					await replies.edit({
						embeds: [embeds, setup],
						components: [fieldSetupComponent, fieldMenuComponent]
					});

					msgArr.forEach(m => m.delete());
					break;
				case "@Menu":
					setupComponent.components[0].setDisabled(true);
					buttonComponent.components[1].setDisabled(true);
					const selectedOption = i.values[0];
					if (selectedOption === "timestamp") {
						embeds.data.timestamp = embeds.data.timestamp
							? undefined
							: new Date(Date.now()).toISOString();
						i.update({
							embeds: [embeds, setupEmbed]
						});
					} else if (selectedOption === "fields") {
						setup.data.description =
							"Use the button below to add or remove fields";
						await i.update({
							embeds: [embeds, setup],
							components: [
								fieldSetupComponent,
								fieldMenuComponent
							]
						});
					} else {
						setup.data.description =
							"Modify by sending message to the channel\n-# For image you can upload image directly or use direct url";

						await i.update({
							embeds: [embeds, setup],
							components: [setupComponent, buttonComponent]
						});
						const msg = (
							await i.channel.awaitMessages({
								filter: m => m.author.id === i.user.id,
								max: 1
							})
						).first();
						if (!msg) return;

						const attachment = msg.attachments.first();
						updateEmbedField(
							embeds,
							selectedOption,
							msg.content,
							attachment
						);

						setupComponent.components[0].setDisabled(false);
						buttonComponent.components[1].setDisabled(false);
						await replies.edit({
							embeds: [embeds, setupEmbed],
							components: [setupComponent, buttonComponent]
						});
						setTimeout(() => msg.delete(), 2500);
					}
					break;
			}
		});

		collector.on("end", c => {
			if (!forceStop && replies) {
				interaction.followUp({
					content: "Embed Editor closed due to inactivity.",
					ephemeral: true
				});
			}
			replies.delete();
		});
	}
};

function createButton(customId, label, style) {
	return new ButtonBuilder()
		.setCustomId(customId)
		.setLabel(label)
		.setStyle(style);
}

function getMenuOptions() {
	return [
		createMenuOption("Author", "Author section of the embeds", "author"),
		createMenuOption(
			"Author Icon",
			"Icon of the author section of the embeds",
			"author-icon"
		),
		createMenuOption("Title", "Title of the embeds", "title"),
		createMenuOption(
			"Title Url",
			"Url of the title of the embeds",
			"title-url"
		),
		createMenuOption(
			"Description",
			"Description of the embeds",
			"description"
		),
		createMenuOption("Color", "Color of the embeds", "color"),
		createMenuOption("Attachment", "Attachment of the embeds", "image"),
		createMenuOption("Thumbnail", "Thumbnail of the embeds", "thumbnail"),
		createMenuOption("Footer", "Footer of the embeds", "footer"),
		createMenuOption(
			"Footer Icon",
			"Icon of the Footer of the embeds",
			"footer-icon"
		),
		createMenuOption(
			"Timestamp",
			"Toggle timestamp on the embeds",
			"timestamp"
		),
		createMenuOption(
			"Field Settings",
			"Add or Remove a Fields section to the embeds",
			"fields"
		)
	];
}

function createMenuOption(label, description, value) {
	return new StringSelectMenuOptionBuilder()
		.setLabel(label)
		.setDescription(description)
		.setValue(value);
}

function updateEmbedField(embeds, option, content, attachment) {
	switch (option) {
		case "author":
			embeds.data.author = { ...embeds.data.author, name: content };
			break;
		case "author-icon":
			embeds.data.author = {
				...embeds.data.author,
				icon_url: validateImage(attachment, content)
			};
			break;
		case "title":
			embeds.data.title = content;
			break;
		case "title-url":
			if (content.startsWith("https://")) embeds.data.url = content;
			else
				temporaryMessage(embeds.channel, "Please provide a valid URL!");
			break;
		case "description":
			embeds.data.description = content;
			break;
		case "color":
			if (/^#?([a-fA-F0-9]{6}|[a-fA-F0-9]{3})$/i.test(content)) {
				embeds.data.color = hexToInt(content);
			} else {
				temporaryMessage(
					embeds.channel,
					"Please provide a valid hex color code!"
				);
			}
			break;
		case "image":
			embeds.data.image = { url: validateImage(attachment, content) };
			break;
		case "thumbnail":
			embeds.data.thumbnail = { url: validateImage(attachment, content) };
			break;
		case "footer":
			embeds.data.footer = { ...embeds.data.footer, text: content };
			break;
		case "footer-icon":
			embeds.data.footer = {
				...embeds.data.footer,
				icon_url: validateImage(attachment, content)
			};
			break;
	}
}

function validateImage(attachment, content) {
	if (attachment && attachment.contentType.includes("image"))
		return attachment.url;
	if (content.startsWith("https://")) return content;
	temporaryMessage(
		embeds.channel,
		"Discord Embeds only support images/GIFs or direct URLs!"
	);
}

function disableComponents(...components) {
	components.forEach(component =>
		component.components.forEach(c => c.setDisabled(true))
	);
}

function enableComponents(...components) {
	components.forEach(component =>
		component.components.forEach(c => c.setDisabled(false))
	);
}

function hexToInt(input) {
	return parseInt(
		input
			.replace(/^#([\da-f])([\da-f])([\da-f])$/i, "#$1$1$2$2$3$3")
			.substring(1),
		16
	);
}

async function temporaryMessage(channel, message) {
	const tempMsg = await channel.send(message);
	setTimeout(() => tempMsg.delete(), 3500);
}
