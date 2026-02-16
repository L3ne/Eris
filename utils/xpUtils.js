const Level = require('../schemas/levelSchema');

class XPUtils {
    static calculateXPForLevel(level) {
        return 5 * Math.pow(level, 2) + 50 * level + 100;
    }

    static calculateLevel(xp) {
        let level = 1;
        while (xp >= this.calculateXPForLevel(level)) {
            xp -= this.calculateXPForLevel(level);
            level++;
        }
        return level;
    }

    static calculateTotalXPForLevel(level) {
        let totalXP = 0;
        for (let i = 1; i < level; i++) {
            totalXP += this.calculateXPForLevel(i);
        }
        return totalXP;
    }

    static calculateProgress(xp, level) {
        const currentLevelXP = this.calculateTotalXPForLevel(level);
        const nextLevelXP = this.calculateTotalXPForLevel(level + 1);
        const neededXP = nextLevelXP - currentLevelXP;
        const currentXP = xp - currentLevelXP;
        return Math.min(100, Math.max(0, (currentXP / neededXP) * 100));
    }

    static getRandomXP(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    static async addXP(guildId, userId, xpAmount) {
        const levelData = await Level.findOneAndUpdate(
            { guildId, userId },
            { 
                $inc: { xp: xpAmount },
                $set: { lastMessage: new Date() }
            },
            { upsert: true, new: true }
        );

        const oldLevel = levelData.level;
        const newLevel = this.calculateLevel(levelData.xp);
        
        console.log(`🔢 addXP: userId=${userId}, +${xpAmount}XP, totalXP=${levelData.xp}, oldLevel=${oldLevel}, newLevel=${newLevel}`);

        if (newLevel > oldLevel) {
            await Level.updateOne(
                { guildId, userId },
                { level: newLevel }
            );
            console.log(`⬆️ Level up appliqué: ${oldLevel} → ${newLevel}`);
            return { levelUp: true, newLevel, oldLevel };
        }

        return { levelUp: false, newLevel: oldLevel };
    }

    static async addVoiceXP(guildId, userId, xpAmount) {
        const levelData = await Level.findOneAndUpdate(
            { guildId, userId },
            { 
                $inc: { xp: xpAmount, voiceTime: 1 },
                $set: { lastVoiceReward: new Date() }
            },
            { upsert: true, new: true }
        );

        const oldLevel = levelData.level;
        const newLevel = this.calculateLevel(levelData.xp);

        if (newLevel > oldLevel) {
            await Level.updateOne(
                { guildId, userId },
                { level: newLevel }
            );
            return { levelUp: true, newLevel, oldLevel };
        }

        return { levelUp: false, newLevel: oldLevel };
    }

    static async resetXP(guildId, userId) {
        await Level.deleteOne({ guildId, userId });
    }

    static async getLeaderboard(guildId, limit = 10) {
        return await Level.find({ guildId })
            .sort({ xp: -1 })
            .limit(limit)
            .populate('userId', 'username discriminator avatarURL');
    }

    static formatXP(xp, level) {
        const currentLevelXP = this.calculateTotalXPForLevel(level);
        const nextLevelXP = this.calculateTotalXPForLevel(level + 1);
        const neededXP = nextLevelXP - currentLevelXP;
        const currentXP = xp - currentLevelXP;
        
        return {
            current: currentXP,
            needed: neededXP,
            total: xp,
            progress: this.calculateProgress(xp, level)
        };
    }
}

module.exports = XPUtils;
