import { Client, ClientOptions, Collection, REST, Routes } from 'discord.js';
import { Client as NekosBest } from 'nekos-best.js';

import { ContextMenuCommand, SlashCommand } from '@/base';
import { CommandsHandler, EventsHandler } from '@/handlers';
import { createLogger, env } from '@/utils';

import { Database } from './services';

export class BotClient extends Client<true> {
  public readonly logger = createLogger('client');

  public readonly slashCommands = new Collection<string, SlashCommand>();
  public readonly contextMenuCommands = new Collection<
    string,
    ContextMenuCommand
  >();

  public readonly database: Database;
  public readonly nekosBest: NekosBest;

  public constructor(
    options: ClientOptions,
    database: Database,
    nekosBest: NekosBest,
  ) {
    super(options);

    this.database = database;
    this.nekosBest = nekosBest;
  }

  public async startRest(): Promise<void> {
    const rest = new REST().setToken(env.getOrThrow('DISCORD_BOT_TOKEN'));

    this.logger.info('📝 Registering commands');
    const applicationCommandsData =
      await CommandsHandler.getApplicationCommandsData();

    try {
      const data = await rest.put(
        Routes.applicationCommands(env.getOrThrow('DISCORD_APPLICATION_ID')),
        {
          body: applicationCommandsData,
        },
      );

      this.logger.info(
        `✅ Registered ${(data as Array<unknown>).length} commands`,
      );
    } catch (error) {
      this.logger.error('❌ Failed to register commands', error);
      throw error;
    }
  }

  public async startBot(): Promise<void> {
    this.logger.info('📅 Events preparing');
    await EventsHandler.prepare(this);

    this.logger.info('🔧 Commands preparing');
    await CommandsHandler.prepare(this);

    await this.login(env.getOrThrow('DISCORD_BOT_TOKEN'));
  }
}
