const { Events } = require('discord.js');

module.exports = {
    name: Events.MessageCreate,
    execute: async (client, message) => {
        if(message.author.bot) return;
        
        // Social media embed fix
        const content = message.content.toLowerCase();
        const hasTwitter = /(?:https?:\/\/)?(?:www\.)?(?:twitter\.com|x\.com)\/[\w]+\/status\/\d+/.test(content);
        const hasTiktok = /(?:https?:\/\/)?(?:www\.)?tiktok\.com\/@[\w]+\/video\/\d+/.test(content);
        const hasInstagram = /(?:https?:\/\/)?(?:www\.)?instagram\.com\/(?:p|reel)\/[\w-]+/.test(content);
        
        if (hasTwitter || hasTiktok || hasInstagram) {
            const fixedLinks = message.content
                .replace(/https?:\/\/(?:www\.)?twitter\.com\//g, 'https://fxtwitter.com/')
                .replace(/https?:\/\/(?:www\.)?x\.com\//g, 'https://fxtwitter.com/')
                .replace(/https?:\/\/(?:www\.)?tiktok\.com\//g, 'https://vtiktok.com/')
                .replace(/https?:\/\/(?:www\.)?instagram\.com\/p\//g, 'https://ddinstagram.com/p/')
                .replace(/https?:\/\/(?:www\.)?instagram\.com\/reel\//g, 'https://ddinstagram.com/reel/');
            
            if (fixedLinks !== message.content) {
                await message.suppressEmbeds(true).catch(() => {});
                await message.reply({ content: fixedLinks, repliedUser: false });
                return;
            }
        }
    }
}