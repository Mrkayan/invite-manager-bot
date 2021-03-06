import { User } from 'eris';

import { memberSettings, MemberSettingsKey } from '../sequelize';
import {
	fromDbValue,
	memberDefaultSettings,
	MemberSettingsObject,
	toDbValue
} from '../settings';

import { GuildCache } from './GuildCache';

export class MemberSettingsCache extends GuildCache<
	Map<string, MemberSettingsObject>
> {
	public initOne(guilId: string) {
		return new Map();
	}

	public async getAll(guildIds: string[]) {
		const sets = await memberSettings.findAll({
			where: {
				guildId: guildIds
			},
			raw: true
		});

		sets.forEach(set => {
			if (set.value === null) {
				return;
			}

			const guildSets = this.cache.get(set.guildId);
			let memberSets = guildSets.get(set.memberId);
			if (!memberSets) {
				memberSets = { ...memberDefaultSettings };
				guildSets.set(set.memberId, memberSets);
			}
			memberSets[set.key] = fromDbValue(set.key, set.value);
		});
	}

	protected async _get(
		guildId: string
	): Promise<Map<string, MemberSettingsObject>> {
		const sets = await memberSettings.findAll({
			where: {
				guildId
			},
			raw: true
		});

		const map = new Map();
		sets.forEach(set => {
			if (set.value === null) {
				return;
			}

			let memberSets = map.get(set.memberId);
			if (!memberSets) {
				memberSets = { ...memberDefaultSettings };
				map.set(set.memberId, memberSets);
			}
			memberSets[set.key] = fromDbValue(set.key, set.value);
		});

		return map;
	}

	public async getOne(guildId: string, memberId: string) {
		const guildSets = await this.get(guildId);
		const set = guildSets.get(memberId);
		return set ? set : { ...memberDefaultSettings };
	}

	public async setOne<K extends MemberSettingsKey>(
		guildId: string,
		user: User,
		key: K,
		value: MemberSettingsObject[K]
	) {
		const guildSet = await this.get(guildId);
		const dbVal = toDbValue(key, value);
		const val = fromDbValue(key, dbVal);

		let set = guildSet.get(user.id);
		if (!set) {
			set = { ...memberDefaultSettings };
		}

		// Check if the value changed
		if (set[key] !== val) {
			memberSettings.bulkCreate(
				[
					{
						id: null,
						memberId: user.id,
						guildId,
						key,
						value: dbVal
					}
				],
				{
					updateOnDuplicate: ['value', 'updatedAt']
				}
			);

			set[key] = val;
			guildSet.set(user.id, set);
		}

		return val;
	}
}
