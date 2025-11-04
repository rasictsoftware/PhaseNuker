const { Client, GatewayIntentBits } = require('discord.js');
const { ChannelType } = require('discord.js');
const fs = require('fs');
const readline = require('readline');

const settingsFile = 'settings.json';

// Setup readline for user input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function askQuestion(query) {
    return new Promise(resolve => rl.question(query, answer => resolve(answer)));
}

async function getSettings() {
    if (fs.existsSync(settingsFile)) {
        const savedSettings = JSON.parse(fs.readFileSync(settingsFile, 'utf8'));
        console.log('Saved settings found:');
        console.log(savedSettings);
        const useSaved = await askQuestion('Use saved settings? (yes/no): ');
        if (useSaved.toLowerCase().startsWith('y')) {
            return savedSettings;
        }
    }

    const botToken = await askQuestion('Enter your Bot Token: ');
    const guildId = await askQuestion('Enter your Guild ID: ');

    const newSettings = { botToken, guildId };
    fs.writeFileSync(settingsFile, JSON.stringify(newSettings, null, 4));
    console.log('Settings saved!');
    return newSettings;
}

(async () => {
    const settings = await getSettings();
    rl.close();

    const client = new Client({
        intents: [GatewayIntentBits.Guilds]
    });

    let guild = null;

    async function removeChannelsByJson(guild, channelIds) {
        for (const channelId of channelIds) {
            const channel = guild.channels.cache.get(channelId);
            if (channel) {
                try {
                    await channel.delete();
                    console.log(`Channel ${channelId} was successfully deleted.`);
                } catch (error) {
                    console.error(`Failed to delete channel ${channelId}: ${error.message}`);
                }
            } else {
                console.log(`Channel ${channelId} was not found on the server.`);
            }
        }
    }

    client.once('ready', async () => {
        try {
            console.log(`Logged in as ${client.user.tag}`);
            guild = client.guilds.cache.get(settings.guildId);

            if (!guild) {
                console.log('The server with the specified ID does not exist or the bot has no access.');
                return;
            }

            const channelIds = (await guild.channels.fetch()).map(channel => channel.id);
            console.log('Found channels:', channelIds);

            await removeChannelsByJson(guild, channelIds);

            console.log('All channels deleted!');

        } catch (err) {
            console.error('An error occurred:', err);
        }
    });

    client.login(settings.botToken);
})();
