
module.exports = {
    name: 'clientReady',
    once: true,
    execute(client) {
 
        const fs = require('fs');
        const path = require('path');
        
        client.avatarRotation = true;
        client.avatarIndex = 0;
        
        // Charger les avatars depuis le dossier public/avatars
        const avatarDir = path.join(__dirname, '../../public/pp');
        
        try {
            // Créer le dossier s'il n'existe pas
            if (!fs.existsSync(avatarDir)) {
                fs.mkdirSync(avatarDir, { recursive: true });
                console.log('📁 Dossier avatars créé');
            }
            
            const files = fs.readdirSync(avatarDir).filter(file => 
                file.endsWith('.jpg') || file.endsWith('.png') || file.endsWith('.gif') || file.endsWith('.webp')
            );
            
            if (files.length > 0) {
                client.avatarFiles = files;
                
                // Démarrer la rotation
                client.rotationInterval = setInterval(() => {
                    if (!client.avatarFiles || client.avatarFiles.length === 0) return;
                    
                    const avatarPath = path.join(avatarDir, client.avatarFiles[client.avatarIndex]);
                    
                    try {
                        if (fs.existsSync(avatarPath)) {
                            client.user.setAvatar(avatarPath);
                            console.log(`Avatar changé vers: ${client.avatarFiles[client.avatarIndex]}`);
                            
                            client.avatarIndex = (client.avatarIndex + 1) % client.avatarFiles.length;
                        }
                    } catch (error) {
                        console.error(`❌ Erreur lors du changement d'avatar:`, error);
                    }
                }, 45 * 60 * 1000); // 45 minutes
                
                console.log(`Rotation d'avatars activée! ${files.length} avatars trouvés. Rotation toutes les 45 minutes.`);
            } else {
                console.log('⚠️ Aucun avatar trouvé dans le dossier public/avatars');
            }
            
        } catch (error) {
            console.error('Erreur initialisation rotation avatars:', error);
        }
    }
};