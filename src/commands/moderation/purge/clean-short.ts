import { Member, Message } from 'eris';

import { IMClient } from '../../../client';
import { EnumResolver, NumberResolver, StringResolver, UserResolver } from '../../../resolvers';
import {
	customInvites,
	CustomInvitesGeneratedReason,
	inviteCodes,
	joins,
	sequelize
} from '../../../sequelize';
import { CommandGroup, ModerationCommand } from '../../../types';
import { to } from '../../../util';
import { Command, Context } from '../../Command';

export default class extends Command {
	public constructor(client: IMClient) {
		super(client, {
			name: ModerationCommand.cleanShort,
			aliases: ['clean-short', 'clearShort', 'clear-short'],
			args: [
				{
					name: 'maxTextLength',
					resolver: NumberResolver,
					required: true
				},
				{
					name: 'numberOfMessages',
					resolver: NumberResolver,
				}
			],
			group: CommandGroup.Moderation,
			guildOnly: true
		});
	}

	public async action(
		message: Message,
		[maxTextLength, numberOfMessages]: [number, number],
		{ guild, t }: Context
	): Promise<any> {
		if (this.client.config.ownerGuildIds.indexOf(guild.id) === -1) {
			return;
		}

		const embed = this.client.createEmbed();

		if (numberOfMessages < 1) {
			return this.client.sendReply(message, t('cmd.clean.invalidQuantity'));
		}
		if (numberOfMessages === undefined) {
			numberOfMessages = 5;
		}

		let messages = await message.channel.getMessages(
			Math.min(numberOfMessages, 100),
			message.id
		);

		let messagesToBeDeleted = messages.filter(msg => {
			return msg.content.length < maxTextLength
				&& msg.attachments.length === 0
				&& msg.embeds.length === 0;
		});

		let [error, _] = await to(
			this.client.deleteMessages(message.channel.id, messagesToBeDeleted.map(m => m.id))
		);

		if (error) {
			embed.title = t('cmd.clean.error');
			embed.description = error;
		} else {
			embed.title = t('cmd.clean.title');
			embed.description = t('cmd.clean.text', {
				amount: `**${messagesToBeDeleted.length}**`
			});
		}

		let response = (await this.client.sendReply(message, embed)) as Message;
		message.delete();

		const func = () => {
			response.delete();
		};
		setTimeout(func, 5000);
	}
}