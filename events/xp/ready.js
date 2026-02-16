const voiceXPEvent = require('./voiceXP');

module.exports = {
    name: 'clientReady',
    once: true,
    execute(client) {
 

        setTimeout(async () => {
            await voiceXPEvent.scanExistingVoiceUsers(client);
        }, 5000); // Wait 5 seconds for guilds to be ready
        
        setInterval(() => {
            voiceXPEvent.processVoiceXP.call({ client });
        }, 60000);
        console.log('Système d\'XP initialisé avec succès!');
    }
};