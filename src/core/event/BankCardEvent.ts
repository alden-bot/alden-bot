import type { Message } from 'zca-js';

import type { BankCardData } from '@/parser/contentParser';

import { Event } from './Event';

export interface BankCardDetails {
	bankName: string;
	accountNumber: string;
	accountHolder: string;
	bin: string;
	bankLogoUrl: string;
}

export class BankCardEvent extends Event {
	constructor(
		public readonly message: Message,
		public readonly bankCard: BankCardData,
	) {
		super();
	}

	public async fetchDetails(): Promise<BankCardDetails> {
		const empty: BankCardDetails = {
			bankName: '',
			accountNumber: '',
			accountHolder: '',
			bin: '',
			bankLogoUrl: '',
		};

		if (!this.bankCard.dataUrl) return empty;

		try {
			const response = await fetch(this.bankCard.dataUrl);
			const buffer = await response.arrayBuffer();
			const text = new TextDecoder('utf-8', { fatal: false }).decode(buffer);

			let bin = '';
			let accountNumber = '';
			let accountHolder = '';
			let bankName = '';
			let bankLogoUrl = '';

			const qrMatch = text.match(/content=(000201[\w]+)/);
			if (qrMatch?.[1]) {
				const qrContent = qrMatch[1];
				const binRegex = /0006(\d{6,7})01/;
				const binResult = binRegex.exec(qrContent);
				if (binResult?.[1]) {
					bin = binResult[1];
					const afterTag = qrContent.slice(binResult.index + binResult[0].length);
					const accLen = Number(afterTag.slice(0, 2));
					accountNumber = afterTag.slice(2, 2 + accLen);
				}
			}

			const textParts = text.split(/\0+/).filter((s) => s.length >= 3);
			const bankNamePart = textParts.find((s) => s.includes('NgA�n hA�ng'));
			if (bankNamePart) {
				bankName = bankNamePart.trim();
			}

			if (accountNumber && bankName) {
				const accIdx = text.indexOf(accountNumber);
				const bankIdx = text.indexOf(bankName);
				if (accIdx !== -1 && bankIdx !== -1 && accIdx < bankIdx) {
					const between = text.slice(accIdx + accountNumber.length, bankIdx);
					const candidates = between
						.split(/\0+/)
						.filter((s) => /^[\p{Lu}\p{M}\s]+$/u.test(s) && s.trim().length >= 3);
					if (candidates.length > 0) {
						accountHolder = candidates
							.reduce((a, b) => (a.length > b.length ? a : b))
							.trim();
					}
				}
			}

			const logoMatch = text.match(
				/(https:\/\/res-zalo\.zadn\.vn\/upload\/media\/[\w./-]+_LOGO_[\w.-]+)/,
			);
			if (logoMatch?.[1]) {
				bankLogoUrl = logoMatch[1];
			}

			return { bankName, accountNumber, accountHolder, bin, bankLogoUrl };
		} catch {
			return empty;
		}
	}
}
