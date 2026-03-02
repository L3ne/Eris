const WhitelistModel = require('../schemas/whitelist');

class WhitelistManager {
    constructor() {
        this.cache = new Set();
        this.loadWhitelist();
    }

    async loadWhitelist() {
        try {
            const whitelistedUsers = await WhitelistModel.find({});
            this.cache = new Set(whitelistedUsers.map(user => user.userId));
            console.log(`Loaded ${this.cache.size} users from whitelist`);
        } catch (error) {
            console.error('Error loading whitelist from MongoDB:', error);
            this.cache = new Set();
        }
    }

    async addUser(userId, username = null, addedBy = null) {
        try {
            if (this.cache.has(userId)) {
                return { success: false, message: 'User already whitelisted' };
            }

            const newWhitelistEntry = new WhitelistModel({
                userId,
                username,
                addedBy
            });

            await newWhitelistEntry.save();
            
            this.cache.add(userId);
            
            return { success: true, message: 'User added to whitelist' };
        } catch (error) {
            console.error('Error adding user to whitelist:', error);
            if (error.code === 11000) {
                return { success: false, message: 'User already whitelisted' };
            }
            return { success: false, message: 'Database error' };
        }
    }

    async removeUser(userId) {
        try {
            if (!this.cache.has(userId)) {
                return { success: false, message: 'User not whitelisted' };
            }

            const result = await WhitelistModel.deleteOne({ userId });
            
            if (result.deletedCount === 0) {
                return { success: false, message: 'User not found in database' };
            }
            
            this.cache.delete(userId);
            
            return { success: true, message: 'User removed from whitelist' };
        } catch (error) {
            console.error('Error removing user from whitelist:', error);
            return { success: false, message: 'Database error' };
        }
    }

    isWhitelisted(userId) {
        return this.cache.has(userId);
    }

    async getWhitelistedUsers() {
        try {
            const users = await WhitelistModel.find({}).sort({ addedAt: -1 });
            return users;
        } catch (error) {
            console.error('Error fetching whitelisted users:', error);
            return [];
        }
    }

    getWhitelistSize() {
        return this.cache.size;
    }

    async refreshCache() {
        await this.loadWhitelist();
    }
}

module.exports = WhitelistManager;
