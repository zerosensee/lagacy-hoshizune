import {
  ActionRowBuilder,
  ChatInputCommandInteraction,
  ComponentType,
  EmbedBuilder,
  InteractionContextType,
  InteractionResponse,
  SelectMenuComponentOptionData,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
} from 'discord.js';

import { SlashCommand } from '@/base';
import { BotClient } from '@/bot-client';
import { COLORS, EMOJIS } from '@/shared/constants';

const MENU_CUSTOM_ID = 'image_select_menu';
const IMAGE_SIZE = 1024;

enum ImageOption {
  Profile = 'profile_avatar',
  Guild = 'guild_avatar',
  Banner = 'user_banner',
}

export default class AvatarCommand extends SlashCommand {
  constructor() {
    super(
      new SlashCommandBuilder()
        .setName('avatar')
        .setDescription('Show user avatars or banner')
        .setContexts([InteractionContextType.Guild])
        .addUserOption((opt) =>
          opt.setName('user').setDescription('Target user').setRequired(false),
        ) as SlashCommandBuilder,
    );
  }

  public async chatInput(
    _: BotClient,
    interaction: ChatInputCommandInteraction,
  ): Promise<InteractionResponse | void> {
    await interaction.deferReply();

    const rawUser = interaction.options.getUser('user') || interaction.user;
    const targetUser = await interaction.client.users.fetch(rawUser.id, {
      force: true,
    });
    const guildMember = interaction.guild?.members.fetch(targetUser.id) || null;

    const defaultUrl = targetUser.displayAvatarURL({ size: IMAGE_SIZE });
    const serverUrl = (await guildMember)?.avatarURL({ size: IMAGE_SIZE });
    const bannerUrl = targetUser.bannerURL({ size: IMAGE_SIZE });

    const selectOptions: SelectMenuComponentOptionData[] = [
      {
        label: 'Profile avatar',
        value: ImageOption.Profile,
        emoji: EMOJIS.IMAGE,
      },
    ];

    if (serverUrl) {
      selectOptions.push({
        label: 'Server avatar',
        value: ImageOption.Guild,
        emoji: EMOJIS.IMAGE,
      });
    }

    if (bannerUrl) {
      selectOptions.push({
        label: 'Banner',
        value: ImageOption.Banner,
        emoji: EMOJIS.IMAGE,
      });
    }

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(MENU_CUSTOM_ID)
      .setPlaceholder('Select image')
      .addOptions(selectOptions)
      .setMinValues(1)
      .setMaxValues(1);

    const actionRow =
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

    const getUrl = (type: ImageOption): string => {
      switch (type) {
        case ImageOption.Guild:
          return serverUrl!;
        case ImageOption.Banner:
          return bannerUrl!;
        case ImageOption.Profile:
          return defaultUrl!;
        default:
          return defaultUrl;
      }
    };

    const embed = new EmbedBuilder()
      .setColor(COLORS.PRIMARY)
      .setImage(defaultUrl);

    await interaction.editReply({ embeds: [embed], components: [actionRow] });

    const message = await interaction.fetchReply();
    const collector = message.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 60_000,
    });

    collector.on(
      'collect',
      async (selectInteraction: StringSelectMenuInteraction) => {
        if (
          selectInteraction.customId !== MENU_CUSTOM_ID ||
          selectInteraction.user.id !== interaction.user.id
        ) {
          return;
        }

        await selectInteraction.deferUpdate();

        const choice = selectInteraction.values[0] as ImageOption;
        const imageUrl = getUrl(choice);

        const embed = new EmbedBuilder()
          .setColor(COLORS.PRIMARY)
          .setImage(imageUrl);

        await interaction.editReply({
          embeds: [embed],
          components: [actionRow],
        });
      },
    );

    collector.on('end', async () => {
      const disabledMenu =
        StringSelectMenuBuilder.from(selectMenu).setDisabled(true);
      const disabledActionRow =
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
          disabledMenu,
        );

      await interaction.editReply({ components: [disabledActionRow] });
    });
  }
}
