const { Events } = require('discord.js');

module.exports = {
    name: Events.MessageCreate,
    execute: async (client, message) => {
        if(message.author.bot) return;
        
        // Social media embed fix
        const content = message.content.toLowerCase();
        const hasTwitter = /(?:https?:\/\/)?(?:www\.)?(?:twitter\.com|x\.com)\/[\w]+\/status\/\d+/.test(content);
        
        if (hasTwitter) {
            const fixedLinks = message.content
                .replace(/https?:\/\/(?:www\.)?twitter\.com\//g, 'https://fxtwitter.com/')
                .replace(/https?:\/\/(?:www\.)?x\.com\//g, 'https://fxtwitter.com/')
            
            if (fixedLinks !== message.content) {
                await message.suppressEmbeds(true).catch(() => {});
                await message.reply({ content: fixedLinks, repliedUser: false });
                return;
            }
        }
    }
}