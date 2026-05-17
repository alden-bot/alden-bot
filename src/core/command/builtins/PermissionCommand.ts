import { ThreadType, type Message } from 'zca-js';
import type { CommandContext } from '@/core/command/Command';
import { CommandBase } from '@/core/command/Command';
import { Role } from '@/core/permission/PermissionManager';
import { extractUid } from '@/utils/message';

export class PermissionCommand extends CommandBase {
	public constructor() {
		super({
			name: 'permission',
			description: 'command.permission.description',
			aliases: ['perm'],
			usage: 'command.permission.usage',
			permission: 'alden.command.permission',
		});
	}

	public async execute({ message, args, lang }: CommandContext): Promise<void> {
		if (message.type !== ThreadType.Group) {
			await this.bot.sendMessage(
				{ msg: this.t('command.permission.not_group', {}, lang) },
				message.threadId,
				message.type,
			);
			return;
		}

		if (args.length === 0) {
			await this.sendHelp(message, lang);
			return;
		}

		const action = (args[0] as string).toLowerCase();

		if (action === 'deputy') {
			await this.handleDeputy(message, args.slice(1), lang);
		} else if (action === 'list') {
			await this.handleList(message, lang);
		} else if (action === 'view') {
			await this.handleView(message, args.slice(1), lang);
		} else {
			await this.sendHelp(message, lang);
		}
	}

	private async handleDeputy(message: Message, args: string[], lang: string) {
		const sub = args[0]?.toLowerCase();
		if (sub !== 'add' && sub !== 'remove') {
			await this.bot.sendMessage(
				{ msg: this.t('command.permission.invalid_usage', {}, lang) },
				message.threadId,
				message.type,
			);
			return;
		}

		const targetUid = extractUid(message, args.slice(1));
		if (!targetUid) {
			await this.bot.sendMessage(
				{ msg: this.t('command.permission.user_not_found', {}, lang) },
				message.threadId,
				message.type,
			);
			return;
		}

		const callerRole = await this.bot.permissionManager.getRoleLevel(
			message.threadId,
			message.data.uidFrom,
			true,
		);
		if (callerRole < Role.Leader) {
			await this.bot.sendMessage(
				{
					msg: this.t('command.permission.need_leader', {}, lang),
				},
				message.threadId,
				message.type,
			);
			return;
		}

		if (sub === 'add') {
			const success = await this.bot.permissionManager.addVirtualDeputy(
				message.threadId,
				targetUid,
			);
			if (success) {
				await this.bot.sendMessage(
					{
						msg: this.t(
							'command.permission.deputy_added',
							{
								uid: targetUid,
							},
							lang,
						),
					},
					message.threadId,
					message.type,
				);
			} else {
				await this.bot.sendMessage(
					{
						msg: this.t(
							'command.permission.deputy_already',
							{
								uid: targetUid,
							},
							lang,
						),
					},
					message.threadId,
					message.type,
				);
			}
		} else {
			const success = await this.bot.permissionManager.removeVirtualDeputy(
				message.threadId,
				targetUid,
			);
			if (success) {
				await this.bot.sendMessage(
					{
						msg: this.t(
							'command.permission.deputy_removed',
							{
								uid: targetUid,
							},
							lang,
						),
					},
					message.threadId,
					message.type,
				);
			} else {
				await this.bot.sendMessage(
					{
						msg: this.t(
							'command.permission.deputy_not_found',
							{
								uid: targetUid,
							},
							lang,
						),
					},
					message.threadId,
					message.type,
				);
			}
		}
	}

	private async handleList(message: Message, lang: string) {
		const permissions = this.bot.permissionManager.getAllPermissions();
		const msg =
			this.t('command.permission.list_title', {}, lang) +
			permissions
				.map(
					(n) =>
						`- ${n} (Level: ${Role[this.bot.permissionManager.getPermissionRole(n)] ?? 'Member'})`,
				)
				.join('\n');
		await this.bot.sendMessage({ msg }, message.threadId, message.type);
	}

	private async handleView(message: Message, args: string[], lang: string) {
		const targetUid = extractUid(message, args);
		if (!targetUid) {
			await this.bot.sendMessage(
				{ msg: this.t('command.permission.user_not_found', {}, lang) },
				message.threadId,
				message.type,
			);
			return;
		}

		const role = await this.bot.permissionManager.getRoleLevel(
			message.threadId,
			targetUid,
			true,
		);
		const roleName = Role[role] ?? 'Member';

		const explicit = this.bot.permissionManager.getUserPermissions(targetUid);
		const explicitStr = explicit.length > 0 ? explicit.join(', ') : 'None';
		const msg = this.t(
			'command.permission.view_info',
			{
				uid: targetUid,
				role: roleName,
				permissions: explicitStr,
			},
			lang,
		);

		await this.bot.sendMessage({ msg }, message.threadId, message.type);
	}

	private async sendHelp(message: Message, lang: string) {
		const msg = this.t('command.permission.help_guide', {}, lang);
		await this.bot.sendMessage({ msg }, message.threadId, message.type);
	}
}
