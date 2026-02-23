const voiceXPEvent = require('./voiceXP');
const gradient = require('gradient-string');

module.exports = {
    name: 'clientReady',
    once: true,
    execute(client) {
 

        setTimeout(async () => {
            await voiceXPEvent.scanExistingVoiceUsers(client);
        }, 5000); // Wait 5 seconds for guilds to be ready
        
        setInterval(() => {
            voiceXPEvent.processVoiceXP(client);
        }, 60000);
        console.log(gradient('blue', 'cyan')('Système d\'XP initialisé avec succès!'));
    }
};