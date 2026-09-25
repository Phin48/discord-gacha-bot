const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const TOKEN = process.env.TOKEN;

const WIN_CHANNEL_ID = '1552198031196160010';
const LOSE_CHANNEL_ID = '1552202640438599742';

const cooldowns = new Map();

function drawGacha() {
    const rand = Math.random() * 100;
    if (rand < 1) {
        return { type: '🌈 レインボーデカペ 🌈', color: 0xFF007F, isWin: true };
    } else if (rand < 10) {
        return { type: '✨ デカペ ✨', color: 0xFFD700, isWin: true };
    } else {
        return { type: '❌ ハズレ ❌', color: 0x808080, isWin: false };
    }
}

client.once('ready', () => {
    console.log(`✅ ログイン成功: ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    if (message.content === '!gacha-panel') {
        const embed = new EmbedBuilder()
            .setTitle('🎰 デカペガチャ')
            .setDescription('下のボタンを押してガチャを回そう！ (1日1回限定)\n\n**【排出率】**\n🌈 レインボーデカペ: 1%\n✨ デカペ: 9%\n❌ ハズレ: 90%')
            .setColor(0x0099FF);

        const button = new ButtonBuilder()
            .setCustomId('gacha_button')
            .setLabel('ガチャを引く！')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🎰');

        const row = new ActionRowBuilder().addComponents(button);

        await message.channel.send({ embeds: [embed], components: [row] });
    }
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    if (interaction.customId === 'gacha_button') {
        const userId = interaction.user.id;
        const now = Date.now();
        const COOLDOWN_TIME = 24 * 60 * 60 * 1000;

        const isAdmin = interaction.memberPermissions && interaction.memberPermissions.has(PermissionFlagsBits.Administrator);

        if (!isAdmin && cooldowns.has(userId)) {
            const expirationTime = cooldowns.get(userId) + COOLDOWN_TIME;

            if (now < expirationTime) {
                const timeLeft = expirationTime - now;
                const hours = Math.floor(timeLeft / (1000 * 60 * 60));
                const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

                return interaction.reply({
                    content: '⏳ ガチャは1日に1回までです！\n次に引けるまであと ' + hours + '時間 ' + minutes + '分 です。',
                    ephemeral: true
                });
            }
        }

        const result = drawGacha();
        if (!isAdmin) {
            cooldowns.set(userId, now);
        }

        const resultEmbed = new EmbedBuilder()
            .setTitle('🎰 ガチャ結果')
            .setDescription(interaction.user.toString() + ' さんの結果は…\n\n# ' + result.type)
            .setColor(result.color)
            .setTimestamp();

        await interaction.reply({ embeds: [resultEmbed], ephemeral: true });

        try {
            if (result.isWin) {
                const winChannel = await client.channels.fetch(WIN_CHANNEL_ID);
                if (winChannel) {
                    const winEmbed = new EmbedBuilder()
                        .setTitle('🎉 🎉 🎉 大当たり発生！ 🎉 🎉 🎉')
                        .setDescription(interaction.user.toString() + ' さんが **' + result.type + '** を引き当てました！おめでとうございます！ 🎊')
                        .setColor(result.color)
                        .setTimestamp();

                    await winChannel.send({ embeds: [winEmbed] });
                }
            } else {
                const loseChannel = await client.channels.fetch(LOSE_CHANNEL_ID);
                if (loseChannel) {
                    const loseEmbed = new EmbedBuilder()
                        .setTitle('💀 ガチャ結果通知')
                        .setDescription(interaction.user.toString() + ' さんがガチャを回しましたが **' + result.type + '** でした…！')
                        .setColor(result.color)
                        .setTimestamp();

                    await loseChannel.send({ embeds: [loseEmbed] });
                }
            }
        } catch (error) {
            console.error('アナウンスの送信に失敗しました:', error);
        }
    }
});

client.login(TOKEN);
