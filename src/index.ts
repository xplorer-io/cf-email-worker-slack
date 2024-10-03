import * as PostalMime from 'postal-mime';

export default {
	async email(message: EmailMessage, env: Env, ctx: ExecutionContext): Promise<void> {
		await handleEmail(message, env, ctx);
	},
};

async function handleEmail(message: EmailMessage, env: Env, ctx: ExecutionContext): Promise<void> {
	const parser = new PostalMime.default();
	const slackWebhookUrl = env.SLACK_WEBHOOK_URL;

	if (!slackWebhookUrl) {
		throw new Error('SLACK_WEBHOOK_URL is missing in environment variables.');
	}

	try {
		//parse email content
		const rawEmail = new Response(message.raw);

		const email = await parser.parse(await rawEmail.arrayBuffer());

		//get attachments
		let emailAttachments = [];
		email.attachments.forEach((attachment) => {
			let decoder = new TextDecoder('utf-8');
			emailAttachments.push(decoder);
		});

		const from = message.from;
		const to = message.to;
		const subject = message.headers.get('subject') || '(no subject)';

		const slackMessage = {
			text: `📧 *New Email Received* \n\n*From:* ${from}\n*To:* ${to}\n*Subject:* ${subject}\n\n*Raw Email:*\n\`\`\`${rawEmail}\`\`\``,
		};

		//forwarding email to slack
		const response = await fetch(slackWebhookUrl, {
			method: 'POST',
			headers: { 'Content-type': 'application/json' },
			body: JSON.stringify(slackMessage),
		});

		if (!response.ok) {
			throw new Error(`Slack Webhook Error ${response.statusText}`);
		}

		console.log('Email forwarded to Slack Successfully!');
	} catch (error) {
		console.log('Error handling email: ', error);
	}
}
