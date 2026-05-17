import type { Message } from 'zca-js';

export function hasMention(message: Message): boolean {
	return (
		'mentions' in message.data &&
		Array.isArray(message.data.mentions) &&
		message.data.mentions.length > 0
	);
}

export function extractUid(message: Message, args: string[]): string | undefined {
	if (hasMention(message)) {
		return (message.data as { mentions: Array<{ uid: string }> }).mentions[0]?.uid;
	}
	if (args.length > 0) {
		return args[0];
	}
	return undefined;
}
